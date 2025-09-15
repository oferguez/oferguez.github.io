import React from 'react';
import { Link } from 'react-router-dom';

const tags = false;

const apps = [
  {
    id: 'hebrew-matcher',
    title: 'Hebrew Pattern Matcher',
    description: 'Search for Hebrew words using patterns with wildcards. Supports regex-like syntax for finding words that match specific letter patterns.',
    tags: ['Hebrew', 'Pattern Matching', 'Text Processing'],
    path: '/hebrew-matcher'
  },
  {
    id: 'rate-calculator',
    title: 'Win Rate Calculator',
    description: 'Calculate win rates and determine how many wins or losses are needed to change your percentage. Enter any 2 values to auto-calculate the third.',
    tags: ['Statistics', 'Gaming', 'Calculator'],
    path: '/rate-calculator'
  },
  {
    id: 'even-path-finder',
    title: 'Even Path Finder',
    description: 'Find the path through a grid with even/odd/triple weights.',
    tags: [],
    path: 'https://oferguez.github.io/EvenPathFinder/'
  },
  {
    id: 'arithmetic-game',
    title: 'Arithmetic game',
    description: 'Addition & substraction game for kids.',
    tags: [],
    path: 'https://oferguez.github.io/Arithmetic-/'
  },
  {
    id: 'language-game',
    title: 'Language learning game',
    description: 'Flashcard style language learning game.',
    tags: [],
    path: 'https://oferguez.github.io/LanguageLearning/'
  }
];

export const LandingPage = () => {
  return (
    <div className="container">
      <header className="header">
        <h1>Ofer Guez's Apps</h1>
        <p>Primary school learning games for kids</p>
        <p>Web Apps for Daddy</p>   
      </header>

      <div className="apps-grid">
        {apps.map((app) => (
          <Link key={app.id} to={app.path} className="app-card">
            <h2>{app.title}</h2>
            <p>{app.description}</p>
            {tags && <div className="tags">
              {app.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>}
          </Link>
        ))}
      </div>
    </div>
  );
};