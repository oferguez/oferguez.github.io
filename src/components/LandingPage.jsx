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
  }
];

export const LandingPage = () => {
  return (
    <div className="container">
      <header className="header">
        <h1>Web Apps</h1>
        <p>A collection of useful web applications and tools</p>
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