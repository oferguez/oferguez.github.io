import React from 'react';
import { Link } from 'react-router-dom'; 
import { portalLinks } from '../data/portalLinks';
import { recipeLinks } from '../data/recipeLinks';
 
const RecipeCollection = () => {
  return (
    <div className="recipes-page">
      <div className="container recipes-container">
        <div className="header-nav">
          <Link to="/" className="home-link">← Back to Landing Page</Link>
        </div>
        <header className="header">
          <h1 className="gradient-text-forward">Recipes</h1>
          <p className="gradient-text-backward">Some Published Recipes, in The Guardian (English) and in Ori Shavit's site (Hebrew)</p>
        </header>


        <section className="portal">
          <div className="portal-grid">
            {recipeLinks.map((link) => (
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
    </div>
  );
};

export default RecipeCollection;
