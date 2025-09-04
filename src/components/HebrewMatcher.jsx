import React, { useState } from 'react';

const sources = {
  adjectives: "https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/adjectives.txt",
  nouns: "https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/nouns.txt",
  verbs: "https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/verbs_no_fatverb.txt"
};

const HEBREW_BLOCK = /[\u0590-\u05FF]/;
const HEBREW_LETTERS_CLASS = "[\\u0590-\\u05FF]";

function stripNiqqud(s) {
  return Array.from(s.normalize("NFKD")).filter(ch => !/\p{M}/u.test(ch)).join("");
}

function templateToRegex(template, wholeWord = true) {
  let out = "";
  let inClass = false;
  for (let i = 0; i < template.length; i++) {
    const ch = template[i];
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

  if (opts.stripNiqqud) words = words.map(stripNiqqud);
  if (opts.unique) {
    const seen = new Set();
    words = words.filter(w => (seen.has(w) ? false : (seen.add(w), true)));
  }
  return words;
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

export const HebrewMatcher = ({ className }) => {
  const [pattern, setPattern] = useState("ר?וא?");
  const [source, setSource] = useState("adjectives");
  const [customUrl, setCustomUrl] = useState("");
  const [paste, setPaste] = useState("");
  const [stripNiqqudFlag, setStripNiqqudFlag] = useState(true);
  const [unique, setUnique] = useState(true);
  const [sort, setSort] = useState(true);
  const [wholeWord, setWholeWord] = useState(true);
  const [status, setStatus] = useState("");
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({ total: 0, matched: 0, time: 0 });

  const handleSearch = async () => {
    if (!pattern) {
      alert("נא להזין תבנית");
      return;
    }

    setStatus("טוען/ת ומחפש/ת...");
    try {
      const t0 = performance.now();
      const words = await loadWordlist(source, customUrl, paste, { stripNiqqud: stripNiqqudFlag, unique });
      const rx = templateToRegex(pattern, wholeWord);
      let results = words.filter(w => rx.test(w));
      if (sort) results.sort((a, b) => a.localeCompare(b));
      const t1 = performance.now();

      setMatches(results);
      setStats({ total: words.length, matched: results.length, time: t1 - t0 });
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

  return (
    <div className={className} dir="rtl" lang="he">
      <div className="wrap">
        <div className="card">
          <h1>חיפוש מילים לפי תבנית (עברית)</h1>
          <p className="muted">
            השתמש/י ב-<span className="kbd">?</span> לאות עברית אחת. כל שאר התווים נלקחים ככתיבתם.
            לדוגמה: <span className="kbd">ר?וא?</span> → <span className="hint">ר</span> + אות כלשהי + <span className="hint">ו</span> + <span className="hint">א</span> + אות כלשהי.
            אפשר גם מחלקת תווים: <span className="kbd">[אי]</span>. עוגנים <span className="kbd">^</span> ו-<span className="kbd">$</span> ניתנים אוטומטית.
          </p>

          <div className="row row-3">
            <div>
              <label htmlFor="pattern">תבנית לחיפוש</label>
              <input 
                id="pattern" 
                placeholder="לדוגמה: ר?וא?" 
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="source">מקור מילים</label>
              <select id="source" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="adjectives">eyaler: adjectives.txt</option>
                <option value="nouns">eyaler: nouns.txt</option>
                <option value="verbs">eyaler: verbs_no_fatverb.txt</option>
                <option value="custom">מותאם אישית (URL או הדבקה ידנית)</option>
              </select>
            </div>
            <div style={{ alignSelf: 'end' }}>
              <button onClick={handleSearch} className="btn primary">חיפוש</button>
            </div>
          </div>

          <div className="row row-2" style={{ marginTop: '12px' }}>
            <div>
              <label htmlFor="customUrl">כתובת URL לקובץ מילים (אופציונלי)</label>
              <input 
                id="customUrl" 
                placeholder="https://raw.githubusercontent.com/.../words.txt"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <div className="small">הקובץ צריך להיות TXT, מילה אחת בכל שורה. שים/י לב ל-CORS.</div>
            </div>
            <div>
              <label htmlFor="paste">או הדבקה ידנית של רשימת מילים</label>
              <textarea 
                id="paste" 
                rows={4} 
                placeholder="מילה אחת בכל שורה"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
              />
            </div>
          </div>

          <div className="chips">
            דגלים:
            <label className="chip">
              <input type="checkbox" checked={stripNiqqudFlag} onChange={(e) => setStripNiqqudFlag(e.target.checked)} /> הסר ניקוד
            </label>
            <label className="chip">
              <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> הסר כפילויות
            </label>
            <label className="chip">
              <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} /> מיין תוצאות
            </label>
            <label className="chip">
              <input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} /> התאמה למילה שלמה
            </label>
          </div>

          <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleDownload} className="btn">הורד תוצאות (TXT)</button>
            <span className="small">{status}</span>
          </div>
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

        <p className="small" style={{ marginTop: '12px' }}>
          ברירות מחדל נטענות מ-<a href="https://github.com/eyaler/hebrew_wordlists" target="_blank" rel="noopener">eyaler/hebrew_wordlists</a>.
        </p>
      </div>
    </div>
  );
};