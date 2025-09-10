import React, { useState } from 'react';

const sources = {
  adjectives: "adjectives.txt",
  nouns: "nouns.txt",
  verbs: "verbs_no_fatverb.txt",
  he_IL: "he_IL.dic"
};

const BATCH_SIZE = 10000; // Process wordlists in batches to avoid stack overflow

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
    const url = sources[sourceKey];
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

async function searchInWordlist(words, pattern, wholeWord, onProgress, letterConstraints = null) {
  const rx = templateToRegex(pattern, wholeWord);
  const matches = [];
  
  
  // Helper function to check letter constraints
  const passesLetterConstraints = (word) => {
    if (!letterConstraints) return true;
    
    const { selected, deselected } = letterConstraints;
    const normalizedWord = normalizeFinalLetters(word);
    const normalizedSelected = selected.map(normalizeFinalLetters);
    const normalizedDeselected = deselected.map(normalizeFinalLetters);
    
    // Check that all selected letters appear in the word
    for (const letter of normalizedSelected) {
      if (!normalizedWord.includes(letter)) {
        return false;
      }
    }
    
    // Check that none of the deselected letters appear in the word
    for (const letter of normalizedDeselected) {
      if (normalizedWord.includes(letter)) {
        return false;
      }
    }
    
    return true;
  };
  
  if (words.length <= BATCH_SIZE) {
    // Small wordlist - process all at once
    return words.filter(w => rx.test(normalizeFinalLetters(w)) && passesLetterConstraints(w));
  }
  
  // Large wordlist - process in batches
  const totalBatches = Math.ceil(words.length / BATCH_SIZE);
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const batchMatches = batch.filter(w => rx.test(normalizeFinalLetters(w)) && passesLetterConstraints(w));
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
      if (onProgress) onProgress(`טוען ${sourceKey}...`);
      
      const words = await loadWordlist(sourceKey, null, null, opts);
      allWordCounts.total += words.length;
      
      if (onProgress) onProgress(`מחפש ב-${sourceKey}...`);
      
      const matches = await searchInWordlist(words, pattern, opts.wholeWord, 
        (currentBatch, totalBatches) => {
          if (onProgress) onProgress(`מחפש ב-${sourceKey} (חלק ${currentBatch}/${totalBatches})...`);
        },
        letterConstraints
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
    
    const matches = await searchInWordlist(customList.words, pattern, opts.wholeWord, null, letterConstraints);
    allMatches.push(...matches);
    allWordCounts.total += customList.words.length;
    allWordCounts.matched += matches.length;
  }
  
  // Remove duplicates if requested
  let finalMatches = allMatches;
  if (opts.unique) {
    if (onProgress) onProgress("מסיר כפילויות...");
    const seen = new Set();
    finalMatches = [];
    for (const word of allMatches) {
      if (!seen.has(word)) {
        seen.add(word);
        finalMatches.push(word);
      }
    }
    allWordCounts.matched = finalMatches.length;
  }
  
  return { matches: finalMatches, stats: allWordCounts };
}

function downloadTxt(lines, filename = "matches.txt") {
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
  { row: 0, keys: ["'", "1-!", "2-@", "3-#", "4-$", "5-%", "6-^", "7-&", "8-*", "9-(", "0-)", "-", "="] },
  { row: 1, keys: ["ק", "ר", "א", "ט", "ו", "ן", "ם", "פ", "]", "[", "\\"] },
  { row: 2, keys: ["ש", "ד", "ג", "כ", "ע", "י", "ח", "ל", "ך", "ף", ",", "."] },
  { row: 3, keys: ["ז", "ס", "ב", "ה", "נ", "מ", "צ", "ת", "ץ"] }
];


export const HebrewMatcher = ({ className }) => {
  const [pattern, setPattern] = useState("אהב?");
  const [selectedSources, setSelectedSources] = useState(["adjectives", "nouns", "verbs", "he_IL"]);
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
        finalResults.sort((a, b) => a.localeCompare(b));
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
        // Left click: grey -> green -> grey  
        newState = current === 'selected' ? undefined : 'selected';
      }
      
      const newStates = { ...prev };
      if (newState === undefined) {
        delete newStates[letter];
      } else {
        newStates[letter] = newState;
      }
      return newStates;
    });
  };

  const getSelectedDeselectedSummary = () => {
    const selected = Object.entries(letterStates)
      .filter(([, state]) => state === 'selected')
      .map(([letter]) => letter);
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
          <h1>חיפוש מילים לפי תבנית</h1>
          <p className="muted compact">
            השתמש/י ב-<span className="kbd">?</span> לאות כלשהי. דוגמה: <span className="kbd">ר?וא?</span>
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
                <label>מקורות ברירת מחדל</label>
                <div className="source-checkboxes">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={selectedSources.includes('adjectives')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSources([...selectedSources, 'adjectives']);
                        } else {
                          setSelectedSources(selectedSources.filter(s => s !== 'adjectives'));
                        }
                      }}
                    />
                    <span className="source-dic-name">תארים</span>
                    {sourceStatus.adjectives?.status === 'error' && (
                      <span className="source-status error">⚠️</span>
                    )}
                    {sourceStatus.adjectives?.status === 'success' && (
                      <span className="source-status success">✓ {sourceStatus.adjectives.count.toLocaleString()}</span>
                    )}
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={selectedSources.includes('nouns')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSources([...selectedSources, 'nouns']);
                        } else {
                          setSelectedSources(selectedSources.filter(s => s !== 'nouns'));
                        }
                      }}
                    />
                    <span className="source-dic-name">שמות עצם</span>
                    {sourceStatus.nouns?.status === 'error' && (
                      <span className="source-status error">⚠️</span>
                    )}
                    {sourceStatus.nouns?.status === 'success' && (
                      <span className="source-status success">✓ {sourceStatus.nouns.count.toLocaleString()}</span>
                    )}
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={selectedSources.includes('verbs')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSources([...selectedSources, 'verbs']);
                        } else {
                          setSelectedSources(selectedSources.filter(s => s !== 'verbs'));
                        }
                      }}
                    />
                    <span className="source-dic-name">פעלים</span>
                    {sourceStatus.verbs?.status === 'error' && (
                      <span className="source-status error">⚠️</span>
                    )}
                    {sourceStatus.verbs?.status === 'success' && (
                      <span className="source-status success">✓ {sourceStatus.verbs.count.toLocaleString()}</span>
                    )}
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={selectedSources.includes('he_IL')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSources([...selectedSources, 'he_IL']);
                        } else {
                          setSelectedSources(selectedSources.filter(s => s !== 'he_IL'));
                        }
                      }}
                    />
                    <span className="source-dic-name">מילון מערכת</span>
                    {sourceStatus.he_IL?.status === 'error' && (
                      <span className="source-status error">⚠️</span>
                    )}
                    {sourceStatus.he_IL?.status === 'success' && (
                      <span className="source-status success">✓ {sourceStatus.he_IL.count.toLocaleString()}</span>
                    )}
                  </label>
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
                      <span className="selected-letters-display">{selected.join(', ')}</span>
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
                  <p><strong>לחיצה שמאלית:</strong> אות חייבת להופיע (ירוק)</p>
                  <p><strong>לחיצה ימנית:</strong> אות לא מופיעה (אדום)</p>
                  <p><strong>אפור:</strong> אין הגבלה על האות</p>
                </div>
                
                <div className="hebrew-keyboard">
                  {HEBREW_KEYBOARD.map((row, rowIndex) => (
                    <div key={rowIndex} className="keyboard-row">
                      {row.keys.map((key, keyIndex) => {
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
                
                {(() => {
                  const { selected, deselected } = getSelectedDeselectedSummary();
                  return (
                    <div className="letter-summary">
                      {selected.length > 0 && (
                        <div>אותיות שחייבות להופיע: <span className="selected-letters">{selected.join(', ')}</span></div>
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
                    onClick={() => setLetterStates({})}
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
              <div key={index} className="result">{match}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};