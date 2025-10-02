import React, { useState } from 'react';
import {
  buildTemplateRegex,
  loadWordlist as loadWordlistHelper,
  searchWordlistBatched,
  aggregateWordlists,
} from '../utils/wordMatcher';

const sources = [
  { id: "BrEnglish-Legacy", url: "English/International/2of4brif.txt", name: "en-GB legacy" },
  { id: "BrEnglish-Broader", url: "English/International/3of6all.txt", name: "en-GB broader" },
  { id: "BrEnglish-Modern", url: "English/International/3of6game.txt", name: "en-GB for games" },
  { id: "AmEnglish-Base", url: "English/American/2of12.txt", name: "en-US base" },
  { id: "AmEnglish-Inflected", url: "English/American/2of12inf.txt", name: "en-US word forms" },
  { id: "Core", url: "English/Special/2of5core.txt", name: "small" },
  { id: "Neologism", url: "English/Special/neol2016_cleaned.txt", name: "Neologism" },
];

// Helper function to find source by ID
const getSource = (sourceId) => sources.find(s => s.id === sourceId);

const ENGLISH_LETTERS = /[a-zA-Z]/;
const ENGLISH_LETTERS_CLASS = "[a-zA-Z]";

const buildEnglishRegex = buildTemplateRegex({
  wildcardClass: ENGLISH_LETTERS_CLASS,
  flags: ({ ignoreCase = true }) => (ignoreCase ? 'ui' : 'u'),
});

const normalizeCase = (value, ignoreCase = true) => (ignoreCase ? value.toLowerCase() : value);

const filterEnglishWord = (word) => !/\s/.test(word) && ENGLISH_LETTERS.test(word);

const loadEnglishWordlist = (sourceKey, options = {}) => loadWordlistHelper({
  sourceKey,
  getSource,
  customUrl: options.customUrl,
  pasted: options.pasted,
  filter: filterEnglishWord,
});

const searchEnglishWordlist = (words, pattern, opts, onBatchProgress, letterConstraints, sourceName) => searchWordlistBatched({
  words,
  pattern,
  buildRegex: buildEnglishRegex,
  regexOptions: { wholeWord: opts.wholeWord, ignoreCase: opts.ignoreCase },
  onBatchProgress,
  letterConstraints,
  normalizeForRegex: (word) => word,
  normalizeForConstraints: (word) => normalizeCase(word, opts.ignoreCase),
  normalizeLetter: (letter) => normalizeCase(letter, opts.ignoreCase),
  sourceName,
});

const aggregateMatches = (matches, { unique, ignoreCase }) => aggregateWordlists(matches, {
  unique,
  normalizeKey: (word) => (ignoreCase ? word.toLowerCase() : word),
});

async function loadAndSearchWordlists(sourceKeys, customWordlists, pattern, opts, onSourceStatus, onProgress, letterConstraints = null) {
  const allMatches = [];
  const allWordCounts = { total: 0, matched: 0 };

  for (const sourceKey of sourceKeys) {
    const source = getSource(sourceKey);
    try {
      if (onProgress && source) onProgress(`Loading ${source.name}...`);

      const words = await loadEnglishWordlist(sourceKey);
      allWordCounts.total += words.length;

      if (onProgress && source) onProgress(`Searching in ${source.name}...`);

      const matches = await searchEnglishWordlist(
        words,
        pattern,
        opts,
        (currentBatch, totalBatches) => {
          if (onProgress && source) {
            onProgress(`Searching in ${source.name} (batch ${currentBatch}/${totalBatches})...`);
          }
        },
        letterConstraints,
        source?.name ?? null
      );

      allMatches.push(...matches);
      allWordCounts.matched += matches.length;

      if (onSourceStatus) onSourceStatus(sourceKey, 'success', words.length);
    } catch (e) {
      console.warn(`Failed to load ${sourceKey}:`, e);
      if (onSourceStatus) onSourceStatus(sourceKey, 'error', 0, e.message);
    }
  }

  for (const customList of customWordlists) {
    if (onProgress) onProgress(`Searching in ${customList.name}...`);

    const matches = await searchEnglishWordlist(
      customList.words,
      pattern,
      opts,
      null,
      letterConstraints,
      customList.name
    );
    allMatches.push(...matches);
    allWordCounts.total += customList.words.length;
    allWordCounts.matched += matches.length;
  }

  if (opts.unique && onProgress) {
    onProgress("Removing duplicates...");
  }

  const { matches: finalMatches, matchedCount } = aggregateMatches(allMatches, {
    unique: opts.unique,
    ignoreCase: opts.ignoreCase,
  });
  allWordCounts.matched = matchedCount;

  return { matches: finalMatches, stats: allWordCounts };
}


function downloadTxt(matches, filename = "matches.txt") {
  const lines = matches.map(match => {
    const sources = match.sources && match.sources.length > 0 ? ` (${match.sources.join(', ')})` : '';
    return `${match.word || match}${sources}`;
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// QWERTY keyboard layout
const QWERTY_KEYBOARD = [
  { row: 0, keys: ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"] },
  { row: 1, keys: ["a", "s", "d", "f", "g", "h", "j", "k", "l"] },
  { row: 2, keys: ["z", "x", "c", "v", "b", "n", "m"] }
];

export const EnglishMatcher = ({ className }) => {
  const [pattern, setPattern] = useState("l?v?");
  const [selectedSources, setSelectedSources] = useState(["BrEnglish-Modern"]);
  const [customUrl, setCustomUrl] = useState("");
  const [paste, setPaste] = useState("");
  const [customWordlists, setCustomWordlists] = useState([]);
  const [sourceStatus, setSourceStatus] = useState({});
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [unique, setUnique] = useState(true);
  const [sort, setSort] = useState(true);
  const [wholeWord, setWholeWord] = useState(true);
  const [status, setStatus] = useState("");
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({ total: 0, matched: 0, time: 0 });
  const [showLetterSelector, setShowLetterSelector] = useState(false);
  const [letterStates, setLetterStates] = useState({}); // 'selected', 'deselected', or undefined (grey)
  const [letterCounts, setLetterCounts] = useState({}); // count for selected letters

  const handleSearch = async () => {
    if (!pattern) {
      alert("Please enter a pattern");
      return;
    }

    if (selectedSources.length === 0 && customWordlists.length === 0 && !paste.trim()) {
      alert("Please select at least one source");
      return;
    }

    setStatus("Starting search...");

    // Clear previous results and reset state
    setMatches([]);
    setStats({ total: 0, matched: 0, time: 0 });
    setSourceStatus({});

    try {
      const t0 = performance.now();

      // Create a custom wordlist from pasted text if provided
      const customFromPaste = paste.trim() ? [{ name: 'pasted', words: paste.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean).filter(w => !/\s/.test(w) && ENGLISH_LETTERS.test(w)) }] : [];

      const handleSourceStatus = (sourceKey, status, count, error) => {
        setSourceStatus(prev => ({
          ...prev,
          [sourceKey]: { status, count, error }
        }));
      };

      const handleProgress = (message) => {
        setStatus(message);
      };

      const searchOpts = {
        ignoreCase: ignoreCase,
        unique: unique,
        wholeWord: wholeWord
      };

      // Prepare letter constraints
      const { selected, deselected } = getSelectedDeselectedSummary();
      const letterConstraints = (selected.length > 0 || deselected.length > 0) ? { selected, deselected } : null;

      const { matches: results, stats: searchStats } = await loadAndSearchWordlists(
        selectedSources,
        [...customWordlists, ...customFromPaste],
        pattern,
        searchOpts,
        handleSourceStatus,
        handleProgress,
        letterConstraints
      );

      let finalResults = results;
      if (sort) {
        setStatus("Sorting results...");
        finalResults.sort((a, b) => (a.word || a).localeCompare(b.word || b));
      }

      const t1 = performance.now();

      setMatches(finalResults);
      setStats({ total: searchStats.total, matched: searchStats.matched, time: t1 - t0 });
      setStatus("Done.");
    } catch (e) {
      console.error(e);
      setStatus("Error: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleDownload = () => {
    if (!matches.length) {
      alert("No results to download");
      return;
    }
    downloadTxt(matches, "matches.txt");
  };

  const handleLetterClick = (letter, isRightClick) => {
    setLetterStates(prev => {
      const current = prev[letter.toLowerCase()];
      let newState;

      if (isRightClick) {
        // Right click: grey -> red -> grey
        newState = current === 'deselected' ? undefined : 'deselected';
      } else {
        // Left click cycles: grey -> green -> red -> grey (mobile-friendly)
        if (current === undefined) {
          newState = 'selected';
        } else if (current === 'selected') {
          newState = 'deselected';
        } else {
          newState = undefined;
        }
      }

      const newStates = { ...prev };
      const lowerLetter = letter.toLowerCase();
      if (newState === undefined) {
        delete newStates[lowerLetter];
      } else {
        newStates[lowerLetter] = newState;
      }

      // Initialize count to 1 when letter becomes selected
      if (newState === 'selected' && !letterCounts[lowerLetter]) {
        setLetterCounts(prevCounts => ({ ...prevCounts, [lowerLetter]: 1 }));
      }
      // Remove count when letter is no longer selected
      if (newState !== 'selected' && letterCounts[lowerLetter]) {
        setLetterCounts(prevCounts => {
          const newCounts = { ...prevCounts };
          delete newCounts[lowerLetter];
          return newCounts;
        });
      }

      return newStates;
    });
  };

  const handleLetterCountChange = (letter, count) => {
    const numCount = Math.max(1, parseInt(count) || 1);
    setLetterCounts(prev => ({
      ...prev,
      [letter.toLowerCase()]: numCount
    }));
  };

  const getSelectedDeselectedSummary = () => {
    const selected = Object.entries(letterStates)
      .filter(([, state]) => state === 'selected')
      .map(([letter]) => ({ letter, count: letterCounts[letter] || 1 }));
    const deselected = Object.entries(letterStates)
      .filter(([, state]) => state === 'deselected')
      .map(([letter]) => letter);

    return { selected, deselected };
  };

  const handleDownloadFromUrl = async () => {
    if (!customUrl.trim()) {
      alert("Please enter a URL");
      return;
    }

    setStatus("Downloading wordlist from URL...");
    try {
      const res = await fetch(customUrl.trim(), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load URL: " + res.status);
      const text = await res.text();

      let words = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      words = words.filter(w => !/\s/.test(w) && ENGLISH_LETTERS.test(w));

      if (words.length === 0) {
        alert("No valid English words found in URL");
        setStatus("");
        return;
      }

      // Create a name for the wordlist based on URL
      const urlName = customUrl.split('/').pop() || 'custom_wordlist';
      const newWordlist = {
        name: urlName,
        words: words,
        url: customUrl
      };

      setCustomWordlists([...customWordlists, newWordlist]);
      setCustomUrl(""); // Clear the input
      setStatus(`Downloaded successfully: ${words.length} words from ${urlName}`);
    } catch (e) {
      console.error(e);
      setStatus("Download error: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className={className}>
      <div className="wrap">
        <div className="card">
          <div className="header-nav">
            <a href="/" className="home-link">← Back to home</a>
          </div>
          <h1>English Word Pattern Search</h1>
          <p className="muted compact">
            Use <span className="kbd">?</span> for any letter. Example: <span className="kbd">l?v?</span>
            <br />
            <span>Number of letters will match pattern when "whole word" is selected</span>
          </p>

          <div>
            <label htmlFor="pattern">Search Pattern</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                id="pattern"
                placeholder="e.g.: l?v?"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                style={{ width: '8ch', minWidth: '12ch', borderColor: 'var(--accent)', borderWidth: '4px', borderStyle: 'solid', borderRadius: '8px' }}
              />
              <button onClick={handleSearch} className="btn primary search-btn-dominant">
                🔍 Search
              </button>
            </div>
          </div>

          <details className="custom-sources">
            <summary>Select Dictionaries</summary>
            <div className="sources-grid">
              <div className="default-sources">
                <div className="source-header">
                  <div className="source-actions">
                    <button
                      type="button"
                      className="btn-small"
                      onClick={() => setSelectedSources(sources.map(s => s.id))}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn-small"
                      onClick={() => setSelectedSources([])}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="source-checkboxes">
                  {sources.map((source) => (
                    <label key={source.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedSources.includes(source.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSources([...selectedSources, source.id]);
                          } else {
                            setSelectedSources(selectedSources.filter(s => s !== source.id));
                          }
                        }}
                      />
                      <span className="source-dic-name">{source.name}</span>
                      {sourceStatus[source.id]?.status === 'error' && (
                        <span className="source-status error">⚠️</span>
                      )}
                      {sourceStatus[source.id]?.status === 'success' && (
                        <span className="source-status success">✓ {sourceStatus[source.id].count.toLocaleString()}</span>
                      )}
                    </label>
                  ))}

                  {customWordlists.map((customList, index) => (
                    <label key={index} className="checkbox-label">
                      <input type="checkbox" checked={true} readOnly />
                      <span>Downloaded: {customList.name}</span>
                      <button
                        type="button"
                        onClick={() => setCustomWordlists(customWordlists.filter((_, i) => i !== index))}
                        className="btn-remove"
                      >
                        Remove
                      </button>
                    </label>
                  ))}
                </div>
              </div>
              <div className="custom-sources-inputs">
                <div>
                  <label htmlFor="customUrl">Download from URL</label>
                  <input
                    id="customUrl"
                    placeholder="https://example.com/words.txt"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleDownloadFromUrl}
                    disabled={!customUrl.trim()}
                    className="btn-small"
                  >
                    Download
                  </button>
                </div>
                <div>
                  <label htmlFor="paste">Manual Paste</label>
                  <textarea
                    id="paste"
                    rows={3}
                    placeholder="One word per line"
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </details>

          <div className="chips-compact">
            <label className="chip-small">
              <input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} /> Ignore Case
            </label>
            <label className="chip-small">
              <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} /> Sort
            </label>
            <label className="chip-small">
              <input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} /> Whole Word
            </label>
            {status && status !== "Done." && (
              <label className="chip-small chip-small-fit">
                {status}
              </label>
            )}
          </div>

          <div className="secondary-actions">
            <button onClick={() => setShowLetterSelector(true)} className="btn-secondary">Letter Selection</button>
            <button onClick={handleDownload} className="btn-secondary">Download Results</button>
          </div>

          {/* Letter Constraints Display */}
          {(() => {
            const { selected, deselected } = getSelectedDeselectedSummary();
            if (selected.length > 0 || deselected.length > 0) {
              return (
                <div className="letter-constraints-display">
                  {selected.length > 0 && (
                    <>
                      <span className="constraint-label">Must contain:</span>
                      <span className="selected-letters-display">
                        {selected.map(item => `${item.letter}${item.count > 1 ? ` (×${item.count})` : ''}`).join(', ')}
                      </span>
                      <span>     |     </span>
                    </>
                  )}
                  {deselected.length > 0 && (
                    <>
                      <span className="constraint-label">Must not contain:</span>
                      <span className="deselected-letters-display">{deselected.join(', ')}</span>
                    </>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {/* Letter Selector Dialog */}
          {showLetterSelector && (
            <div className="letter-dialog-overlay" onClick={() => setShowLetterSelector(false)}>
              <div className="letter-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="letter-dialog-header">
                  <h3>Letter Selection</h3>
                  <button
                    className="letter-dialog-close"
                    onClick={() => setShowLetterSelector(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="letter-instructions">
                  <p><strong>Click:</strong> Cycle through states - Grey ← Green ← Red ← Grey</p>
                  <p><strong>Green:</strong> Letter must appear | <strong>Red:</strong> Letter must not appear | <strong>Grey:</strong> No constraint</p>
                  <p><strong>Right click:</strong> Jump directly to red state (desktop)</p>
                  <p><strong>Count:</strong> For green letters - specify how many times the letter must appear</p>
                </div>

                <div className="english-keyboard">
                  {QWERTY_KEYBOARD.map((row, rowIndex) => (
                    <div key={rowIndex} className="keyboard-row">
                      {row.keys.map((key, keyIndex) => {
                        const state = letterStates[key];
                        const className = `keyboard-key ${
                          state === 'selected' ? 'selected' :
                          state === 'deselected' ? 'deselected' :
                          'neutral'
                        }`;

                        return (
                          <div
                            key={keyIndex}
                            className={className}
                            onClick={(e) => {
                              e.preventDefault();
                              handleLetterClick(key, false);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleLetterClick(key, true);
                            }}
                          >
                            {key.toUpperCase()}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Count Controls for Selected Letters */}
                {(() => {
                  const { selected } = getSelectedDeselectedSummary();
                  if (selected.length > 0) {
                    return (
                      <div className="letter-count-controls">
                        <h4>Count for each letter:</h4>
                        <div className="count-inputs">
                          {selected.map(item => (
                            <div key={item.letter} className="count-input-group">
                              <span className="letter-display">{item.letter.toUpperCase()}</span>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={item.count}
                                onChange={(e) => handleLetterCountChange(item.letter, e.target.value)}
                                className="count-input"
                              />
                              <span className="count-label">times</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {(() => {
                  const { selected, deselected } = getSelectedDeselectedSummary();
                  return (
                    <div className="letter-instructions">
                      {selected.length > 0 && (
                        <div>Letters that must appear: <span className="selected-letters">
                          {selected.map(item => `${item.letter.toUpperCase()}${item.count > 1 ? ` (×${item.count})` : ''}`).join(', ')}
                        </span></div>
                      )}
                      {deselected.length > 0 && (
                        <div>Letters that must not appear: <span className="deselected-letters">{deselected.map(l => l.toUpperCase()).join(', ')}</span></div>
                      )}
                      {selected.length === 0 && deselected.length === 0 && (
                        <div className="muted">No letter constraints selected</div>
                      )}
                    </div>
                  );
                })()}

                <div className="letter-dialog-actions">
                  <button
                    onClick={() => {
                      setLetterStates({});
                      setLetterCounts({});
                    }}
                    className="btn"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowLetterSelector(false)}
                    className="btn primary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: '16px' }}>
          <div className="stats">
            <div>Words loaded: <strong>{stats.total.toLocaleString()}</strong></div>
            <div>Matches: <strong>{stats.matched.toLocaleString()}</strong></div>
            <div>Search time: <strong>{stats.time.toFixed(1)}ms</strong></div>
          </div>
          <div className="grid" style={{ marginTop: '12px' }}>
            {matches.map((match, index) => (
              <div key={index} className="result">
                <div className="match-word">{match.word}</div>
                <div className="match-sources">({match.sources.join(', ')})</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};