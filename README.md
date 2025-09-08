# Web Apps Landing Page

A React-based landing page that serves as a centralized hub for various web applications and tools.

## Features

- **Landing Page**: Clean, responsive design showcasing available web apps
- **Hebrew Pattern Matcher**: Search Hebrew words using pattern matching with wildcards
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
A tool for searching Hebrew words using patterns with wildcards. Features include:
- Pattern-based search using `?` for any Hebrew letter
- Support for character classes like `[אי]`
- Multiple Hebrew wordlist sources
- Custom wordlist support via URL or manual input
- Text processing options (niqqud removal, deduplication, sorting)
- Export functionality for search results

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
├── components/          # React components
│   ├── LandingPage.jsx # Main landing page
│   └── HebrewMatcher.jsx # Hebrew pattern matcher
├── styles/             # CSS files
├── App.jsx            # Main app with routing
└── main.jsx          # App entry point
```

## License

This project is private and intended for personal use.

## Words List downloaded from:
### adjectives: https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/adjectives.txt
### nouns: https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/nouns.txt
### verbs: https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/verbs_no_fatverb.txt
### he_IL: https://spellcheck-dictionaries.github.io/he_IL/he_IL.dic
