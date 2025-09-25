import React, { useState } from 'react';

const sources = [
  { id: "he_IL", url: "he_IL.dic", name: "מילון מערכת" },
  { id: "names", url: "names.csv", name: "שמות" },
  { id: "settlements", url: "settlements.txt", name: "יישובים" },
  { id: "biblical", url: "bible.txt", name: "תנ\"ך" },
  { id: "adjectives", url: "adjectives.txt", name: "תארים" },
  { id: "nouns", url: "nouns.txt", name: "שמות עצם" },
  { id: "verbs", url: "verbs_no_fatverb.txt", name: "פעלים" },
];

const BATCH_SIZE = 10000; // Process wordlists in batches to avoid stack overflow

// Helper function to find source by ID
const getSource = (sourceId) => sources.find(s => s.id === sourceId);

const HEBREW_BLOCK = /[\u0590-\u05FF]/;
const HEBREW_LETTERS_CLASS = "[\\u0590-\\u05FF]";

function stripNiqqud(s) {
  return Array.from(s.normalize("NFKD")).filter(ch => !/\p{M}/u.test(ch)).join("");
}

function normalizeFinalLetters(s) {
  return s
    .replace(/ך/g, 'כ')
    .replace(/ן/g, 'נ')
    .replace(/ם/g, 'מ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');
}

function templateToRegex(template, wholeWord = true) {
  const normalizedTemplate = normalizeFinalLetters(template);
  let out = "";
  let inClass = false;
  for (let i = 0; i < normalizedTemplate.length; i++) {
    const ch = normalizedTemplate[i];
    if (ch === "[" && !inClass) { inClass = true; out += ch; continue; }
    if (ch === "]" && inClass) { inClass = false; out += ch; continue; }
    if (inClass) { out += ch; continue; }
    if (ch === "?") { out += HEBREW_LETTERS_CLASS; continue; }
    out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp((wholeWord ? "^" : "") + out + (wholeWord ? "$" : ""), "u");
}

async function loadWordlist(sourceKey, customUrl, pasted, opts) {
  let text = "";
  if (sourceKey === "custom") {
    if (pasted && pasted.trim().length) {
      text = pasted;
    } else if (customUrl && customUrl.trim().length) {
      const res = await fetch(customUrl.trim(), { cache: "no-store" });
      if (!res.ok) throw new Error("טעינת URL נכשלה: " + res.status);
      text = await res.text();
    } else {
      throw new Error("בחר/י מקור: URL או הדבקה ידנית");
    }
  } else {
    const url = getSource(sourceKey).url;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("טעינת מקור ברירת מחדל נכשלה: " + res.status);
    text = await res.text();
  }

  let words = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  words = words.filter(w => !/\s/.test(w) && HEBREW_BLOCK.test(w));

  if (opts.stripNiqqud) {
    // Process niqqud removal in batches to avoid stack overflow
    const processedWords = [];
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE);
      processedWords.push(...batch.map(stripNiqqud));
    }
    words = processedWords;
  }
  return words;
}

async function searchInWordlist(words, pattern, wholeWord, onProgress, letterConstraints = null, sourceName = null) {
  const rx = templateToRegex(pattern, wholeWord);
  const matches = [];
  
  
  // Helper function to check letter constraints
  const passesLetterConstraints = (word) => {
    if (!letterConstraints) return true;
    
    const { selected, deselected } = letterConstraints;
    const normalizedWord = normalizeFinalLetters(word);
    
    // Check that all selected letters appear with the required count
    for (const letterInfo of selected) {
      const letter = typeof letterInfo === 'string' ? letterInfo : letterInfo.letter;
      const requiredCount = typeof letterInfo === 'string' ? 1 : letterInfo.count;
      const normalizedLetter = normalizeFinalLetters(letter);
      
      // Count occurrences of the letter in the word
      const letterCount = (normalizedWord.match(new RegExp(normalizedLetter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g')) || []).length;
      
      if (letterCount < requiredCount) {
        return false;
      }
    }
    
    // Check that none of the deselected letters appear in the word
    const normalizedDeselected = deselected.map(normalizeFinalLetters);
    for (const letter of normalizedDeselected) {
      if (normalizedWord.includes(letter)) {
        return false;
      }
    }
    
    return true;
  };
  
  if (words.length <= BATCH_SIZE) {
    // Small wordlist - process all at once
    return words
      .filter(w => rx.test(normalizeFinalLetters(w)) && passesLetterConstraints(w))
      .map(w => ({ word: w, sources: sourceName ? [sourceName] : [] }));
  }
  
  // Large wordlist - process in batches
  const totalBatches = Math.ceil(words.length / BATCH_SIZE);
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const batchMatches = batch
      .filter(w => rx.test(normalizeFinalLetters(w)) && passesLetterConstraints(w))
      .map(w => ({ word: w, sources: sourceName ? [sourceName] : [] }));
    matches.push(...batchMatches);
    
    if (onProgress) {
      const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
      onProgress(currentBatch, totalBatches);
    }
    
    // Allow UI to update between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return matches;
}

async function loadAndSearchWordlists(sourceKeys, customWordlists, pattern, opts, onSourceStatus, onProgress, letterConstraints = null) {
  const allMatches = [];
  const allWordCounts = { total: 0, matched: 0 };
  
  // Process each source individually
  for (const sourceKey of sourceKeys) {
    try {
      if (onProgress) onProgress(`טוען ${getSource(sourceKey).name}...`);
      
      const words = await loadWordlist(sourceKey, null, null, opts);
      allWordCounts.total += words.length;
      
      if (onProgress) onProgress(`מחפש ב-${getSource(sourceKey).name}...`);
      
      const matches = await searchInWordlist(words, pattern, opts.wholeWord, 
        (currentBatch, totalBatches) => {
          if (onProgress) onProgress(`מחפש ב-${getSource(sourceKey).name} (חלק ${currentBatch}/${totalBatches})...`);
        },
        letterConstraints,
        getSource(sourceKey).name
      );
      
      allMatches.push(...matches);
      allWordCounts.matched += matches.length;
      
      if (onSourceStatus) onSourceStatus(sourceKey, 'success', words.length);
    } catch (e) {
      console.warn(`Failed to load ${sourceKey}:`, e);
      if (onSourceStatus) onSourceStatus(sourceKey, 'error', 0, e.message);
    }
  }
  
  // Process custom wordlists
  for (const customList of customWordlists) {
    if (onProgress) onProgress(`מחפש ב-${customList.name}...`);
    
    const matches = await searchInWordlist(customList.words, pattern, opts.wholeWord, null, letterConstraints, customList.name);
    allMatches.push(...matches);
    allWordCounts.total += customList.words.length;
    allWordCounts.matched += matches.length;
  }
  
  // Remove duplicates if requested and merge sources
  let finalMatches = allMatches;
  if (opts.unique) {
    if (onProgress) onProgress("מסיר כפילויות...");
    const wordMap = new Map();
    for (const match of allMatches) {
      const word = match.word;
      if (wordMap.has(word)) {
        // Merge sources for duplicate words
        wordMap.get(word).sources.push(...match.sources);
      } else {
        wordMap.set(word, { word, sources: [...match.sources] });
      }
    }
    finalMatches = Array.from(wordMap.values());
    allWordCounts.matched = finalMatches.length;
  }
  
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

// Hebrew QWERTY keyboard layout
const HEBREW_KEYBOARD = [
  { row: 0, keys: ["ק", "ר", "א", "ט", "ו", "ן", "ם", "פ"] },
  { row: 1, keys: ["ש", "ד", "ג", "כ", "ע", "י", "ח", "ל", "ך", "ף"] },
  { row: 2, keys: ["ז", "ס", "ב", "ה", "נ", "מ", "צ", "ת", "ץ"] }
];

export const HebrewMatcher = ({ className }) => {
  const [pattern, setPattern] = useState("אהב?");
  const [selectedSources, setSelectedSources] = useState(["adjectives", "nouns", "verbs", "he_IL", "names", "settlements", "biblical"]);
  const [customUrl, setCustomUrl] = useState("");
  const [paste, setPaste] = useState("");
  const [customWordlists, setCustomWordlists] = useState([]);
  const [sourceStatus, setSourceStatus] = useState({});
  const [stripNiqqudFlag, setStripNiqqudFlag] = useState(true);
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
      alert("נא להזין תבנית");
      return;
    }

    if (selectedSources.length === 0 && customWordlists.length === 0 && !paste.trim()) {
      alert("נא לבחור לפחות מקור אחד");
      return;
    }

    setStatus("מתחיל חיפוש...");
    
    // Clear previous results and reset state
    setMatches([]);
    setStats({ total: 0, matched: 0, time: 0 });
    setSourceStatus({});
    
    try {
      const t0 = performance.now();
      
      // Create a custom wordlist from pasted text if provided
      const customFromPaste = paste.trim() ? [{ name: 'pasted', words: paste.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean).filter(w => !/\s/.test(w) && HEBREW_BLOCK.test(w)) }] : [];
      
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
        stripNiqqud: stripNiqqudFlag,
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
        setStatus("מיין תוצאות...");
        finalResults.sort((a, b) => (a.word || a).localeCompare(b.word || b));
      }
      
      const t1 = performance.now();

      setMatches(finalResults);
      setStats({ total: searchStats.total, matched: searchStats.matched, time: t1 - t0 });
      setStatus("בוצע.");
    } catch (e) {
      console.error(e);
      setStatus("שגיאה: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleDownload = () => {
    if (!matches.length) {
      alert("אין תוצאות להורדה");
      return;
    }
    downloadTxt(matches, "matches.txt");
  };

  const handleLetterClick = (letter, isRightClick) => {
    setLetterStates(prev => {
      const current = prev[letter];
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
      if (newState === undefined) {
        delete newStates[letter];
      } else {
        newStates[letter] = newState;
      }
      
      // Initialize count to 1 when letter becomes selected
      if (newState === 'selected' && !letterCounts[letter]) {
        setLetterCounts(prevCounts => ({ ...prevCounts, [letter]: 1 }));
      }
      // Remove count when letter is no longer selected
      if (newState !== 'selected' && letterCounts[letter]) {
        setLetterCounts(prevCounts => {
          const newCounts = { ...prevCounts };
          delete newCounts[letter];
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
      [letter]: numCount
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
      alert("נא להזין כתובת URL");
      return;
    }

    setStatus("מוריד רשימת מילים מ-URL...");
    try {
      const res = await fetch(customUrl.trim(), { cache: "no-store" });
      if (!res.ok) throw new Error("טעינת URL נכשלה: " + res.status);
      const text = await res.text();
      
      let words = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      words = words.filter(w => !/\s/.test(w) && HEBREW_BLOCK.test(w));
      
      if (words.length === 0) {
        alert("לא נמצאו מילים עבריות תקינות ב-URL");
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
      setStatus(`הורד בהצלחה: ${words.length} מילים מ-${urlName}`);
    } catch (e) {
      console.error(e);
      setStatus("שגיאה בהורדה: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className={className} dir="rtl" lang="he">
      <div className="wrap">
        <div className="card">
          <div className="header-nav">
            <a href="/" className="home-link">← חזרה לעמוד הראשי</a>
          </div>
          <h1>חיפוש מילים לפי תבנית</h1>
          <p className="muted compact">
            השתמש/י ב-<span className="kbd">?</span> לאות כלשהי. דוגמה: <span className="kbd">ר?וא?</span>
            <br />
            <span> מספר האותיות יהיה כמספר הסימנים כאשר בוחרים באופציה "מילה שלמה"</span>
          </p>

          <div>
            <label htmlFor="pattern">תבנית לחיפוש</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                id="pattern" 
                placeholder="לדוגמה: ר?וא?" 
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                style={{ width: '8ch', minWidth: '12ch' }}
              />
              <button onClick={handleSearch} className="btn primary search-btn-dominant">
                🔍 חיפוש
              </button>
            </div>
          </div>

          <details className="custom-sources">
            <summary>בחירת מילונים</summary>
            <div className="sources-grid">
              <div className="default-sources">
                <div className="source-header">
                  <label>מקורות ברירת מחדל</label>
                  <div className="source-actions">
                    <button 
                      type="button"
                      className="btn-small"
                      onClick={() => setSelectedSources(sources.map(s => s.id))}
                    >
                      בחר/י הכל
                    </button>
                    <button 
                      type="button"
                      className="btn-small"
                      onClick={() => setSelectedSources([])}
                    >
                      בטל/י הכל
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
                      <span>מורד: {customList.name}</span>
                      <button 
                        type="button" 
                        onClick={() => setCustomWordlists(customWordlists.filter((_, i) => i !== index))}
                        className="btn-remove"
                      >
                        הסר
                      </button>
                    </label>
                  ))}
                </div>
              </div>
              <div className="custom-sources-inputs">
                <div>
                  <label htmlFor="customUrl">הורדה מ-URL</label>
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
                    הורד
                  </button>
                </div>
                <div>
                  <label htmlFor="paste">הדבקה ידנית</label>
                  <textarea 
                    id="paste" 
                    rows={3} 
                    placeholder="מילה אחת בכל שורה"
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </details>

          <div className="chips-compact">
            {/* strip nikud and strip dups can be safely assumed to be always on.*/}
            {/* <label className="chip-small">
              <input type="checkbox" checked={stripNiqqudFlag} onChange={(e) => setStripNiqqudFlag(e.target.checked)} /> ללא ניקוד
            </label> */}
            {/* <label className="chip-small">
              <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> ללא כפילויות
            </label> */}
            <label className="chip-small">
              <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} /> מיון
            </label>
            <label className="chip-small">
              <input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} /> מילה שלמה
            </label>
            {status && status !== "בוצע." && (
              <label className="chip-small chip-small-fit">
                {status}
              </label>
            )}
          </div>

          <div className="secondary-actions">
            <button onClick={() => setShowLetterSelector(true)} className="btn-secondary">בחירת אותיות</button>
            <button onClick={handleDownload} className="btn-secondary">הורד תוצאות</button>
          </div>
          
          {/* Letter Constraints Display */}
          {(() => {
            const { selected, deselected } = getSelectedDeselectedSummary();
            if (selected.length > 0 || deselected.length > 0) {
              return (
                <div className="letter-constraints-display">
                  {selected.length > 0 && (
                    <>
                      <span className="constraint-label">חייבות להופיע:</span> 
                      <span className="selected-letters-display">
                        {selected.map(item => `${item.letter}${item.count > 1 ? ` (×${item.count})` : ''}`).join(', ')}
                      </span>
                      <span>     |     </span>
                    </>
                  )}
                  {deselected.length > 0 && (
                    <>
                      <span className="constraint-label">לא יופיעו:</span> 
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
                  <h3>בחירת אותיות</h3>
                  <button 
                    className="letter-dialog-close" 
                    onClick={() => setShowLetterSelector(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="letter-instructions">
                  <p><strong>לחיצה:</strong> מעבר בין מצבים - אפור ← ירוק ← אדום ← אפור</p>
                  <p><strong>ירוק:</strong> אות חייבת להופיע | <strong>אדום:</strong> אות לא מופיעה | <strong>אפור:</strong> אין הגבלה</p>
                  <p><strong>לחיצה ימנית:</strong> ישירות למצב אדום (במחשב)</p>
                  <p><strong>מספר פעמים:</strong> עבור אותיות ירוקות - קבע כמה פעמים האות חייבת להופיע</p>
                </div>
                
                <div className="hebrew-keyboard">
                  {HEBREW_KEYBOARD.map((row, rowIndex) => (
                    <div key={rowIndex} className="keyboard-row">
                      {row.keys.toReversed().map((key, keyIndex) => {
                        const isHebrewLetter = /^[\u05d0-\u05ea]$/.test(key);
                        if (!isHebrewLetter) {
                          return (
                            <div key={keyIndex} className="keyboard-key disabled">
                              {key}
                            </div>
                          );
                        }
                        
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
                            {key}
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
                        <h4>מספר פעמים לכל אות:</h4>
                        <div className="count-inputs">
                          {selected.map(item => (
                            <div key={item.letter} className="count-input-group">
                              <span className="letter-display">{item.letter}</span>
                              <input 
                                type="number" 
                                min="1" 
                                max="10"
                                value={item.count}
                                onChange={(e) => handleLetterCountChange(item.letter, e.target.value)}
                                className="count-input"
                              />
                              <span className="count-label">פעמים</span>
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
                        <div>אותיות שחייבות להופיע: <span className="selected-letters">
                          {selected.map(item => `${item.letter}${item.count > 1 ? ` (×${item.count})` : ''}`).join(', ')}
                        </span></div>
                      )}
                      {deselected.length > 0 && (
                        <div>אותיות שלא יופיעו: <span className="deselected-letters">{deselected.join(', ')}</span></div>
                      )}
                      {selected.length === 0 && deselected.length === 0 && (
                        <div className="muted">לא נבחרו הגבלות אותיות</div>
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
                    נקה הכל
                  </button>
                  <button 
                    onClick={() => setShowLetterSelector(false)}
                    className="btn primary"
                  >
                    סגור
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: '16px' }}>
          <div className="stats">
            <div>מילים נטענו: <strong>{stats.total.toLocaleString()}</strong></div>
            <div>התאמות: <strong>{stats.matched.toLocaleString()}</strong></div>
            <div>זמן חיפוש: <strong>{stats.time.toFixed(1)}ms</strong></div>
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