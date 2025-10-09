const DEFAULT_BATCH_SIZE = 10000;

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const buildTemplateRegex = ({
  wildcardChar = '?',
  wildcardClass,
  normalizeTemplate = (template) => template,
  flags = () => 'u',
} = {}) => {
  return (template, { wholeWord = true, ...flagOptions } = {}) => {
    const normalized = normalizeTemplate(template, flagOptions);
    let out = '';
    let inClass = false;
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      if (ch === '[' && !inClass) { inClass = true; out += ch; continue; }
      if (ch === ']' && inClass) { inClass = false; out += ch; continue; }
      if (inClass) { out += ch; continue; }
      if (ch === wildcardChar) { out += wildcardClass; continue; }
      out += escapeRegex(ch);
    }
    const regexFlags = flags(flagOptions);
    const prefix = wholeWord ? '^' : '';
    const suffix = wholeWord ? '$' : '';
    return new RegExp(prefix + out + suffix, regexFlags);
  };
};

export const loadWordlist = async ({
  sourceKey,
  getSource,
  customUrl,
  pasted,
  fetchImpl = fetch,
  splitPattern = /\r?\n/,
  preprocess = (line) => line.trim(),
  filter = (word) => word.length > 0,
  postprocess,
  messages = {
    customSourceRequired: 'Select source: URL or manual paste',
    customLoadFailed: 'Failed to load URL: ',
    defaultLoadFailed: 'Failed to load default source: ',
    unknownSource: 'Unknown source: ',
  },
}) => {
  let text = '';
  if (sourceKey === 'custom') {
    if (pasted && pasted.trim().length) {
      text = pasted;
    } else if (customUrl && customUrl.trim().length) {
      const res = await fetchImpl(customUrl.trim(), { cache: 'no-store' });
      if (!res.ok) throw new Error(messages.customLoadFailed + res.status);
      text = await res.text();
    } else {
      throw new Error(messages.customSourceRequired);
    }
  } else {
    const source = getSource(sourceKey);
    if (!source) throw new Error(messages.unknownSource + sourceKey);
    const res = await fetchImpl(source.url, { cache: 'no-store' });
    if (!res.ok) throw new Error(messages.defaultLoadFailed + res.status);
    text = await res.text();
  }

  let words = text
    .split(splitPattern)
    .map((line) => preprocess(line))
    .filter(Boolean);

  if (filter) {
    words = words.filter((word) => filter(word));
  }

  if (postprocess) {
    words = await postprocess(words);
  }

  return words;
};

export const buildPatternLetterRequirementCalculator = ({
  normalizeTemplate = (template = '') => template,
  normalizeLetter = (letter) => letter,
  isLetter = (ch) => ch >= 'a' && ch <= 'z',
  wildcardChar = '?',
} = {}) => {
  return (pattern) => {
    const counts = {};
    const slots = [];

    if (!pattern) {
      return { counts, slots };
    }

    const normalized = normalizeTemplate(pattern);
    let inClass = false;
    let currentSlot = [];

    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];

      if (!inClass && ch === '[') {
        inClass = true;
        currentSlot = [];
        continue;
      }

      if (inClass) {
        if (ch === ']') {
          inClass = false;
          if (currentSlot.length > 0) {
            slots.push(currentSlot);
          }
          currentSlot = [];
          continue;
        }

        if (isLetter(ch)) {
          const normalizedLetter = normalizeLetter(ch);
          if (typeof normalizedLetter === 'string' && normalizedLetter.length > 0) {
            currentSlot.push(normalizedLetter);
          }
        }

        continue;
      }

      if (ch === wildcardChar) {
        counts[wildcardChar] = (counts[wildcardChar] || 0) + 1;
        continue;
      }

      if (isLetter(ch)) {
        const normalizedLetter = normalizeLetter(ch);
        if (typeof normalizedLetter === 'string' && normalizedLetter.length > 0) {
          counts[normalizedLetter] = (counts[normalizedLetter] || 0) + 1;
        }
      }
    }

    if (inClass && currentSlot.length > 0) {
      slots.push(currentSlot);
    }

    return { counts, slots };
  };
};

const defaultPatternLetterRequirements = buildPatternLetterRequirementCalculator({
  normalizeTemplate: (pattern = '') => pattern.toLowerCase(),
  normalizeLetter: (letter) => letter.toLowerCase(),
});

const computePatternLetterRequirements = (pattern) =>
  defaultPatternLetterRequirements(pattern);


export const letterSpecificationAlignment = (
  pattern,
  letterStates,
  {
    computePatternLetterRequirements: computeRequirements = computePatternLetterRequirements,
    normalizeLetter = (letter) => letter,
    formatForbiddenMessage = ({ letter }) =>
      `Letter "${letter}" is required by the pattern, so can not be deselected`,
    formatGeneralConflictMessage = () =>
      'Letter selection requirements conflict with the pattern.',
    wildcardChar = '?',
  } = {}
) => {
  if (!pattern) return '';

  const requirements = computeRequirements(pattern) || {};
  const rawCounts = requirements.counts || requirements || {};
  let wildcardCount = rawCounts[wildcardChar] || 0;
  const literalAvailability = { ...rawCounts };
  if (wildcardChar in literalAvailability) {
    delete literalAvailability[wildcardChar];
  }
  const rawSlots = Array.isArray(requirements.slots) ? requirements.slots : [];

  const normalizedLetterStates = new Map();
  for (const [rawLetter, selection] of Object.entries(letterStates || {})) {
    const normalizedLetter = normalizeLetter(rawLetter);
    const selectionCount = Number(selection);

    if (!Number.isFinite(selectionCount)) {
      continue;
    }

    if (!normalizedLetter) {
      continue;
    }

    if (!normalizedLetterStates.has(normalizedLetter)) {
      normalizedLetterStates.set(normalizedLetter, {
        raw: rawLetter,
        count: selectionCount,
      });
    } else {
      // If multiple entries normalize to the same letter, keep the max requirement
      const existing = normalizedLetterStates.get(normalizedLetter);
      existing.count = Math.max(existing.count, selectionCount);
    }
  }

  const forbiddenLetters = new Set();
  const requiredLetters = new Map();

  for (const [letter, { count }] of normalizedLetterStates.entries()) {
    if (count <= 0) {
      forbiddenLetters.add(letter);
    } else {
      requiredLetters.set(letter, count);
    }
  }

  // Step 0: ensure forbidden letters are not required by literal counts
  for (const letter of forbiddenLetters) {
    const requiredByPattern = literalAvailability[letter] || 0;
    if (requiredByPattern > 0) {
      const { raw } = normalizedLetterStates.get(letter);
      return formatForbiddenMessage({
        letter: raw,
        normalizedLetter: letter,
        required: requiredByPattern,
      });
    }
  }

  // Step 0b: filter slots and ensure there is at least one allowed option
  const slots = rawSlots.map((slot) =>
    slot
      .filter((entry) => typeof entry === 'string' && entry.length > 0)
      .map((entry) => normalizeLetter(entry))
      .filter((normalized) => normalized && !forbiddenLetters.has(normalized))
  );

  for (let i = 0; i < slots.length; i++) {
    if (slots[i].length === 0) {
      return formatGeneralConflictMessage({
        patternRequirements: rawCounts,
        letterStates,
      });
    }
  }

  // Step 1: satisfy requirements using literal counts first
  const unmetNeeds = new Map();
  for (const [letter, requiredCount] of requiredLetters.entries()) {
    const available = literalAvailability[letter] || 0;
    const satisfied = Math.min(available, requiredCount);
    literalAvailability[letter] = available - satisfied;
    const remaining = requiredCount - satisfied;
    if (remaining > 0) {
      unmetNeeds.set(letter, remaining);
    }
  }

  // Step 2: use slots to cover remaining requirements (maximum bipartite matching)
  if (unmetNeeds.size > 0 && slots.length > 0) {
    const slotIndicesByLetter = new Map();
    for (let i = 0; i < slots.length; i++) {
      const seen = new Set();
      for (const letter of slots[i]) {
        if (seen.has(letter)) continue;
        seen.add(letter);
        if (!slotIndicesByLetter.has(letter)) {
          slotIndicesByLetter.set(letter, []);
        }
        slotIndicesByLetter.get(letter).push(i);
      }
    }

    const letterNodeLetters = [];
    unmetNeeds.forEach((count, letter) => {
      for (let i = 0; i < count; i++) {
        letterNodeLetters.push(letter);
      }
    });

    const slotAssignments = new Array(slots.length).fill(-1);

    const tryMatch = (nodeIndex, visitedSlots) => {
      const letter = letterNodeLetters[nodeIndex];
      const candidateSlots = slotIndicesByLetter.get(letter) || [];

      for (const slotIndex of candidateSlots) {
        if (visitedSlots.has(slotIndex)) continue;
        visitedSlots.add(slotIndex);

        if (
          slotAssignments[slotIndex] === -1 ||
          tryMatch(slotAssignments[slotIndex], visitedSlots)
        ) {
          slotAssignments[slotIndex] = nodeIndex;
          return true;
        }
      }
      return false;
    };

    let matched = 0;
    for (let nodeIndex = 0; nodeIndex < letterNodeLetters.length; nodeIndex++) {
      if (tryMatch(nodeIndex, new Set())) {
        matched += 1;
      }
    }

    if (matched > 0) {
      const matchedNodes = new Set(slotAssignments.filter((nodeIndex) => nodeIndex !== -1));
      for (const nodeIndex of matchedNodes) {
        const letter = letterNodeLetters[nodeIndex];
        const current = unmetNeeds.get(letter);
        if (current !== undefined) {
          const next = current - 1;
          if (next <= 0) {
            unmetNeeds.delete(letter);
          } else {
            unmetNeeds.set(letter, next);
          }
        }
      }
    }
  }

  // Step 3: use wildcards for whatever remains
  let remainingDemand = 0;
  unmetNeeds.forEach((count) => {
    remainingDemand += count;
  });

  if (remainingDemand <= wildcardCount) {
    return '';
  }

  return formatGeneralConflictMessage({
    patternRequirements: rawCounts,
    letterStates,
  });
};

const createLetterConstraintChecker = (letterConstraints, normalizeWord, normalizeLetter) => {
  if (!letterConstraints) return () => true;

  const normalizedSelected = letterConstraints.selected.map((entry) => {
    if (typeof entry === 'string') {
      return { letter: normalizeLetter(entry), count: 1 };
    }
    return { letter: normalizeLetter(entry.letter), count: entry.count };
  });

  const normalizedDeselected = letterConstraints.deselected.map((letter) => normalizeLetter(letter));

  return (word) => {
    const normalizedWord = normalizeWord(word);

    for (const { letter, count } of normalizedSelected) {
      const matches = normalizedWord.match(new RegExp(escapeRegex(letter), 'g')) || [];
      if (matches.length < count) {
        console.warn(`Letter constraint not satisfied for ${letter}: expected ${count}, found ${matches.length}`);
        return false;
      }
    }

    for (const letter of normalizedDeselected) {
      if (normalizedWord.includes(letter)) {
        return false;
      }
    }

    return true;
  };
};

const createMatchRecord = (word, sourceName) => ({
  word,
  sources: sourceName ? [sourceName] : [],
});

export const searchWordlistBatched = async ({
  words,
  pattern,
  buildRegex,
  regexOptions = {},
  batchSize = DEFAULT_BATCH_SIZE,
  onBatchProgress,
  letterConstraints = null,
  normalizeForRegex = (word) => word,
  normalizeForConstraints = normalizeForRegex,
  normalizeLetter = normalizeForConstraints,
  sourceName = null,
}) => {
  const rx = buildRegex(pattern, regexOptions);
  const matches = [];
  const passesLetterConstraints = createLetterConstraintChecker(
    letterConstraints,
    normalizeForConstraints,
    normalizeLetter
  );

  const evaluateWord = (word) =>
    rx.test(normalizeForRegex(word)) && passesLetterConstraints(word);

  if (words.length <= batchSize) {
    return words
      .filter((word) => evaluateWord(word))
      .map((word) => createMatchRecord(word, sourceName));
  }

  const totalBatches = Math.ceil(words.length / batchSize);
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const batchMatches = batch
      .filter((word) => evaluateWord(word))
      .map((word) => createMatchRecord(word, sourceName));
    matches.push(...batchMatches);

    if (onBatchProgress) {
      const currentBatch = Math.floor(i / batchSize) + 1;
      onBatchProgress(currentBatch, totalBatches);
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return matches;
};

export const aggregateWordlists = (matches, {
  unique = false,
  normalizeKey = (word) => word,
} = {}) => {
  if (!unique) {
    return { matches, matchedCount: matches.length };
  }

  const wordMap = new Map();
  for (const match of matches) {
    const key = normalizeKey(match.word ?? match);
    if (wordMap.has(key)) {
      const existing = wordMap.get(key);
      if (match.sources && match.sources.length) {
        existing.sources.push(...match.sources);
      }
    } else {
      wordMap.set(key, {
        word: match.word ?? match,
        sources: match.sources ? [...match.sources] : [],
      });
    }
  }

  const aggregated = Array.from(wordMap.values()).map((entry) => ({
    ...entry,
    sources: entry.sources.length ? Array.from(new Set(entry.sources)) : [],
  }));

  return { matches: aggregated, matchedCount: aggregated.length };
};

export { DEFAULT_BATCH_SIZE };
