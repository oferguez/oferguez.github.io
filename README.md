# Web Apps Landing Page

React + Vite powered landing page that collects several personal tools, experiments, and kid-friendly learning games into one deployable site. Each app lives under its own route, while experiments hosted elsewhere are linked directly from the landing grid.

## Apps at a Glance

| App | Route / Destination | Highlights |
| --- | --- | --- |
| Dashboard | `/dashboard` | Personal portal with frequently used productivity links driven by `portalLinks.js`. |
| Hebrew Pattern Matcher | `/hebrew-matcher` | Advanced Hebrew word search with multiple datasets, custom lists, keyboard, and letter constraints. |
| English Pattern Matcher | `/english-matcher` | 12dicts-based English matcher with regex-like templates, case handling, and source-aware results. |
| Win Rate Calculator | `/rate-calculator` | Gaming win-rate helper with auto-computed totals and a configurable matrix visualizer. |
| Recipe Collection | `/Recipes` | Curated Guardian/Ori Shavit recipes sourced from `recipeLinks.js`. |
| External games & tools | e.g. Even Path Finder, Arithmetic Game, Language Game, Art Gallery | Linked directly via `src/data/apps.js`, opening in a new tab. |

## Feature Highlights

### English Pattern Matcher
- Shares the batch search utilities but swaps in English-specific regex rules, case normalization, and the QWERTY keyboard.
- Ships with several 12dicts sources (British, American, core, neologisms) stored in `public/English/...`.
- Custom lists (URL or paste) are merged with selectable default wordlists, with optional deduping and source labels in the results.
- Pattern analyzer keeps letter requirements and manual constraints in sync, warning when mismatched.

### Hebrew Pattern Matcher
- Pattern templates use `?` slots and `[קשת]` character classes, normalizing final letters for accurate matching.
- Toggle whole-word search, strip niqqud while searching, and mix built-in datasets (`he_IL.dic`, nouns, verbs, names, settlements, bible, etc.).
- Letter selector auto-aligns constraints with the current pattern; conflicts are detected via `letterSpecificationAlignment`.
- Supports ad-hoc sources via pasted wordlists or remote URLs with batching, deduplication, and per-source status updates.
- Mobile-friendly Hebrew keyboard and match export (`matches.txt`) keep the UI usable on phones.

### Win Rate Calculator
- Enter any two of wins/losses/total to auto-derive the third and compute the rounded win percentage.
- Displays “wins needed to round up” and “losses needed to round down” to hit the next threshold.
- Matrix view renders a W/L grid with selectable size, three visualization modes (numbers, colors, both), and click-to-calc shortcuts.
- All inputs, matrix settings, and visualization preferences persist to `localStorage`.

### Dashboard & Recipes
- `Dashboard.jsx` and `RecipeCollection.jsx` are simple data-driven portals—updating the arrays in `src/data/portalLinks.js` or `src/data/recipeLinks.js` instantly refreshes the cards.
- Both pages include navigation back to `/`, responsive card grids, and open external resources in new tabs.

## Getting Started

```bash
# Install dependencies (Node 18+ recommended for Vite)
npm install

# Start the development server
npm run dev

# Build the production bundle
npm run build
```

Open `http://localhost:5173` (or the Vite-reported port) to preview changes.

## npm Scripts

- `npm run dev` – Vite development server with React Fast Refresh.
- `npm run build` – Production build to `dist/`.
- `npm run preview` – Serves the built assets locally for smoke testing.
- `npm run lint` – ESLint across `.js/.jsx` files.
- `npm run deploy` – Builds and publishes `dist/` to GitHub Pages via `gh-pages` (runs `build` automatically through `predeploy`).

## Deployment

1. `npm run deploy` builds the site and pushes the contents of `dist/` to the `gh-pages` branch.
2. Ensure the repository is configured on GitHub to serve Pages from that branch.
3. Static assets (wordlists, backgrounds, etc.) live in `public/` and are copied as-is during the build, so keep large dictionaries there.

## Data Sources and Assets

### English word lists (from [12dicts](http://wordlist.aspell.net/12dicts/))
- `public/English/American/2of12.txt`
- `public/English/American/2of12inf.txt`
- `public/English/International/2of4brif.txt`
- `public/English/International/3of6all.txt`
- `public/English/International/3of6game.txt`
- `public/English/Special/2of5core.txt`
- `public/English/Special/neol2016_cleaned.txt`

### Hebrew word lists
- `public/he_IL.dic` – https://spellcheck-dictionaries.github.io/he_IL/he_IL.dic
- `public/names.csv` – https://data.gov.il/dataset/firs-name
- `public/settlements.txt` – https://data.gov.il/dataset/citiesandsettelments
- `public/bible.txt` – https://github.com/eyaler/hebrew_wordlists/blob/main/bible.txt
- `public/adjectives.txt`, `public/nouns.txt`, `public/verbs_no_fatverb.txt` – https://github.com/eyaler/hebrew_wordlists

Backgrounds such as `c1_fruit-horizon-ocean-pineapple.jpg` are stored alongside the dictionaries for quick swaps.

## Project Structure

```
src/
├── components/
│   ├── LandingPage.jsx
│   ├── Dashboard.jsx
│   ├── RecipeCollection.jsx
│   ├── HebrewMatcher.jsx
│   ├── EnglishMatcher.jsx
│   └── RateCalculator.jsx
├── data/
│   ├── apps.js          # Landing grid entries (internal routes + external links)
│   ├── portalLinks.js   # Dashboard cards
│   └── recipeLinks.js   # Recipe cards
├── styles/
│   ├── App.css
│   ├── HebrewMatcher.css
│   ├── EnglishMatcher.css
│   └── RateCalculator.css
├── utils/
│   └── wordMatcher.js   # Shared batching/regex/letter requirement helpers
├── App.jsx              # Router configuration
└── main.jsx             # React entry point
public/
├── English/...          # 12dicts sources
├── *.txt / *.csv        # Hebrew datasets
└── images               # Background art
```

## Customization Tips

- **Add or reorder apps**: Edit `src/data/apps.js`. Internal routes use `path: '/your-route'`; external URLs open in a new tab.
- **Update portal/recipe links**: Modify `src/data/portalLinks.js` or `src/data/recipeLinks.js`.
- **Adjust word-match behavior**: `src/utils/wordMatcher.js` centralizes regex building, batching, and letter-alignment logic shared by both matchers.
- **Add new datasets**: Drop files into `public/` (or nested folders) and reference them from the matcher `sources` arrays.
- **Styling**: Global theme lives in `src/styles/App.css`; per-app overrides in their respective CSS files.

## Roadmap

- [X] Landing page polish: horizon-like background + updated gradients.
- [ ] Persist matcher UI selections beyond current defaults (sources, toggles, keyboard visibility).
- [ ] About dialog with build info and dataset versions.
- [X] Letter selector validation to prevent impossible combinations (e.g., more mandatory letters than pattern length).
- [X] Extract additional shared logic from matchers to reduce duplication and improve testability.
- [ ] Implement automated tests + CI (word-matcher utilities, calculator math, routing smoke tests).
- [ ] Optimize large dictionary loading (caching strategy or chunked server-side endpoint).
- [ ] Investigate merge strategy that keeps certain files (README, datasets) aligned with `main` during PR publishes.
- [X] Add recursive “available sublinks” explorer for any URL (a lightweight crawler).
- [ ] SEO
- [X] visitor analytics to better understand site usage.

## Fixups

- [ ] Squirrel pic size fixed on mobile
- [X] Dark thick maze walls
- [X] Proper mix of operations
- [X] Add mult
- [ ] Title on mobile
- [X] Small reward in question dialog