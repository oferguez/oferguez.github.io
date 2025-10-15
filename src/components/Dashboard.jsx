import React from 'react';
import { portalLinks } from '../data/portalLinks';

const Dashboard = () => {
  return (
    <div className="container dashboard-container">
      <header className="header">
        <h1 className="gradient-text-forward">Dashboard</h1>
        <p className="gradient-text-backward">Quick useful links</p>
      </header>


      <section className="portal">
        <div className="portal-grid">
          {portalLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="portal-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="portal-card__title">{link.title}</span>
              {link.description && (
                <span className="portal-card__description">{link.description}</span>
              )}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
