import React from 'react';
import { Link } from 'react-router-dom';
import { apps } from '../data/apps.js';

const tags = false;

export const LandingPage = () => {
  return (
    <div className="container">
      <header className="header">
        <h1 className="gradient-text-forward">Ofer Guez's Apps</h1>
        <p className="gradient-text-backward">Primary school learning games for kids</p>
        <p className="gradient-text-forward">And various web apps</p>
      </header>

      <div className="apps-grid">
        {apps.map((app, idx) => (
          <Link
            key={app.id}
            to={app.path}
            className={
              `app-card ` + 
              ` ${app.endOfLine ? 'end-of-line' : ''} ` +
              ` ${(idx === 0 || apps[idx-1].endOfLine) ? 'start-of-line' : ''}`
            }
          >
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