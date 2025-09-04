# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based landing page for web applications and tools. It serves as a centralized hub linking to various web apps, starting with a Hebrew pattern matcher tool.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   ├── LandingPage.jsx     # Main landing page with app grid
│   └── HebrewMatcher.jsx   # Hebrew word pattern matching tool
├── styles/
│   ├── App.css            # Main app styles and landing page
│   └── HebrewMatcher.css  # Styles for Hebrew matcher component
├── App.jsx                # Main app with routing
└── main.jsx              # React app entry point
```

## Architecture

- **Frontend**: React with Vite build system
- **Routing**: React Router for client-side navigation
- **Styling**: CSS with CSS custom properties for theming
- **No Backend**: Static site with client-side functionality

## Adding New Apps

To add a new web app to the landing page:

1. Create the app component in `src/components/`
2. Add the route in `src/App.jsx`
3. Add the app entry to the `apps` array in `src/components/LandingPage.jsx`
4. Include any necessary CSS in `src/styles/`

## Hebrew Matcher Component

The Hebrew Matcher is a conversion of the original `hmathcer.html` standalone file. It features:
- Pattern-based Hebrew word search using `?` wildcards
- Multiple Hebrew wordlist sources from eyaler/hebrew_wordlists
- Custom word list support via URL or manual input
- Text processing options (niqqud removal, deduplication, sorting)
- Results export functionality

## Styling

The project uses a dark theme with CSS custom properties:
- `--bg`: Background color (#0f172a)
- `--fg`: Foreground/text color (#e5e7eb) 
- `--muted`: Muted text color (#94a3b8)
- `--card`: Card background (#111827)
- `--accent`: Accent color (#22d3ee)

## Development Notes

- Uses JSX (not TSX) for React components
- No TypeScript configuration - pure JavaScript React project
- Responsive design with CSS Grid for app cards
- RTL support for Hebrew content in Hebrew Matcher