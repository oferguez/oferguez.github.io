import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { HebrewMatcher } from './components/HebrewMatcher';
import { EnglishMatcher } from './components/EnglishMatcher';
import RateCalculator from './components/RateCalculator';
import Dashboard from './components/Dashboard';
import RecipeCollection from './components/RecipeCollection';
import Analytics from './components/Analytics';
import './styles/App.css';
import './styles/HebrewMatcher.css';
import './styles/EnglishMatcher.css';

function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/hebrew-matcher" element={<HebrewMatcher />} />
        <Route path="/english-matcher" element={<EnglishMatcher />} />
        <Route path="/rate-calculator" element={<RateCalculator />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/Recipes" element={<RecipeCollection />} />
        <Route path="/dev" element={<Analytics />} />
      </Routes>
    </Router>
  );
}

export default App;
