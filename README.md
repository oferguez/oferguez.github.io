# Web Apps Landing Page

A React-based landing page that serves as a centralized hub for various web applications and tools.

## Todo

- [x] iphone display (keyboard dlg)
- [x] are the word lists being hashed locally after first load? and for how long? lifespan
- [x] find what are the /a/b/c etc suffixes in he_IL
- [x] Colour Scheme: https://colorhunt.co/palette/727d73aab99ad0ddd0f0f0d7
- [ ] available sublinks
- [x] back to main screen link
- [x] refactor sources selection, so it will generate the check box list of sources automatically
- [x] in the result also specify from what sources were the words found in 
- [ ] about dialog w build info etc
- [x] rate calc & matrix with color modes and cell selection
- [x] rate calc localStorage persistence
- [x] letter selector count (specify how many times a letter must appear)
- [ ] letter selector validation
- [ ] unit tests & CI
- [ ] refactor monolithic HebrewMatcher

## Features

- **Landing Page**: Clean, responsive design showcasing available web apps
- **Hebrew Pattern Matcher**: Advanced Hebrew word search with pattern matching, letter constraints, and frequency requirements
- **Win Rate Calculator**: Gaming statistics calculator with interactive matrix visualization
- **Modular Architecture**: Easy to add new web apps to the collection

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Available Apps

### Hebrew Pattern Matcher
A powerful tool for searching Hebrew words using advanced pattern matching. Features include:
- **Pattern-based search** using `?` for any Hebrew letter
- **Character classes** support like `[אי]`
- **Letter constraints** - specify which letters must/must not appear
- **Letter frequency** - require letters to appear a specific number of times
- **Multiple Hebrew wordlist sources** from various datasets
- **Custom wordlist support** via URL or manual input
- **Text processing options** (niqqud removal, deduplication, sorting)
- **Export functionality** for search results
- **Responsive design** with mobile-optimized Hebrew keyboard

### Win Rate Calculator
A comprehensive gaming statistics calculator with advanced visualization. Features include:
- **Win/Loss/Total calculation** - enter any 2 values, auto-calculates the third
- **Rate analysis** - current win percentage with wins needed to improve/losses to drop
- **Interactive matrix visualization** with multiple display modes:
  - Number mode: Shows percentages as text
  - Color mode: Pastel green gradient based on win rates
  - Both mode: Numbers with color backgrounds
- **Dynamic color scaling** - colors adjust to current data range for maximum contrast
- **Single-click cell selection** - click any cell to recalculate from that W/L ratio
- **Persistent settings** - localStorage saves all inputs and matrix preferences
- **Mobile responsive** - works perfectly on iPhone and all screen sizes

## Tech Stack

- **React**: Frontend framework
- **Vite**: Build tool and development server
- **React Router**: Client-side routing
- **CSS**: Styling with custom properties for theming

## Development

The project is structured for easy extensibility:

1. **Add New Apps**: Create components in `src/components/`
2. **Update Routing**: Add routes in `src/App.jsx`
3. **Update Landing Page**: Add app entries to `src/components/LandingPage.jsx`

## Project Structure

```
src/
├── components/              # React components
│   ├── LandingPage.jsx     # Main landing page with app grid
│   ├── HebrewMatcher.jsx   # Hebrew word pattern matching tool
│   └── RateCalculator.jsx  # Win rate calculator with matrix visualization
├── styles/                 # CSS files
│   ├── App.css            # Main app styles and landing page
│   ├── HebrewMatcher.css  # Hebrew matcher component styles
│   └── RateCalculator.css # Rate calculator component styles
├── App.jsx                # Main app with routing
└── main.jsx              # React app entry point
```

## License

## Words List downloaded from:
### adjectives: https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/adjectives.txt
### nouns: https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/nouns.txt
### verbs: https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/verbs_no_fatverb.txt
### he_IL: https://spellcheck-dictionaries.github.io/he_IL/he_IL.dic
### wordlists: https://github.com/eyaler/hebrew_wordlists
### bible: https://github.com/eyaler/hebrew_wordlists/blob/main/bible.txt
### names: https://data.gov.il/dataset/firs-name
### settlements: https://data.gov.il/dataset/citiesandsettelments