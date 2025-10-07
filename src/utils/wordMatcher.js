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

export const letterSpecificationAlignment = (
  pattern,
  letterStates = {},
  letterCounts = {}
) => {
  if (!pattern) return true;

  const normalize = (value) => (typeof value === 'string' ? value.toLowerCase() : value);

  const selectedRequirements = new Map();
  const deselectedLetters = new Set();

  for (const [letter, state] of Object.entries(letterStates || {})) {
    if (!state) continue;
    const normalizedLetter = normalize(letter);
    if (!normalizedLetter) continue;

    if (state === 'selected') {
      const rawCount = letterCounts?.[letter];
      const parsedCount = Number(rawCount);
      const count = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1;
      const current = selectedRequirements.get(normalizedLetter) || 0;
      selectedRequirements.set(normalizedLetter, current + count);
    } else if (state === 'deselected') {
      deselectedLetters.add(normalizedLetter);
    }
  }

  let wildcardSlots = 0;
  const literalCounts = new Map();

  for (const ch of pattern) {
    if (ch === '?') {
      wildcardSlots += 1;
      continue;
    }

    const normalizedChar = normalize(ch);

    if (deselectedLetters.has(normalizedChar)) {
      return false;
    }

    const current = literalCounts.get(normalizedChar) || 0;
    literalCounts.set(normalizedChar, current + 1);
  }

  let requiredWildcards = 0;

  for (const [letter, requiredCount] of selectedRequirements.entries()) {
    const literalCount = literalCounts.get(letter) || 0;
    if (requiredCount < literalCount) {
      return false;
    }

    requiredWildcards += requiredCount - literalCount;
    if (requiredWildcards > wildcardSlots) {
      return false;
    }
  }

  return requiredWildcards <= wildcardSlots;
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
      if (matches.length !== count) {
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
