import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/RateCalculator.css';

function RateCalculator() {
  const [wins, setWins] = useState('');
  const [losses, setLosses] = useState('');
  const [total, setTotal] = useState('');
  const [result, setResult] = useState(null);

  const winsNeededToRoundUp = (w, l) => {
    const r = Math.round(100 * w / (w + l));
    const numerator = (r + 0.5) * (w + l) - 100 * w;
    const denominator = 100 - (r + 0.5);
    return Math.ceil(numerator / denominator);
  };

  const lossesNeededToRoundDown = (w, l) => {
    const r = Math.round(100 * w / (w + l));
    const numerator = 100 * w - (r - 0.5) * (w + l);
    const denominator = r - 0.5;
    return Math.ceil(numerator / denominator);
  };

  const calculate = (w, l) => {
    try {
      const r = Math.round(100 * w / (w + l));
      const up = winsNeededToRoundUp(w, l);
      const down = lossesNeededToRoundDown(w, l);
      
      return {
        currentRate: r,
        winsNeeded: up,
        lossesNeeded: down
      };
    } catch (error) {
      return null;
    }
  };

  const isValidNumber = (value) => {
    return value !== '' && !isNaN(value) && Number(value) >= 0;
  };

  const handleInputChange = (field, value) => {
    // Get current values with the new value
    const currentWins = field === 'wins' ? value : wins;
    const currentLosses = field === 'losses' ? value : losses;
    const currentTotal = field === 'total' ? value : total;

    // Update the field being edited first
    if (field === 'wins') {
      setWins(value);
    } else if (field === 'losses') {
      setLosses(value);
    } else if (field === 'total') {
      setTotal(value);
    }

    // Count how many valid values we have
    const validValues = [];
    if (isValidNumber(currentWins)) validValues.push('wins');
    if (isValidNumber(currentLosses)) validValues.push('losses');
    if (isValidNumber(currentTotal)) validValues.push('total');
    
    // If we have at least 2 valid values, calculate the third
    if (validValues.length >= 2) {
      const winsVal = Number(currentWins);
      const lossesVal = Number(currentLosses);
      const totalVal = Number(currentTotal);

      if (field === 'wins' && validValues.includes('losses')) {
        // Calculate total from wins + losses
        const newTotal = winsVal + lossesVal;
        setTotal(newTotal.toString());
        setResult(calculate(winsVal, lossesVal));
      } else if (field === 'wins' && validValues.includes('total')) {
        // Calculate losses from total - wins
        const newLosses = totalVal - winsVal;
        if (newLosses >= 0) {
          setLosses(newLosses.toString());
          setResult(calculate(winsVal, newLosses));
        } else {
          setResult(null);
        }
      } else if (field === 'losses' && validValues.includes('wins')) {
        // Calculate total from wins + losses
        const newTotal = winsVal + lossesVal;
        setTotal(newTotal.toString());
        setResult(calculate(winsVal, lossesVal));
      } else if (field === 'losses' && validValues.includes('total')) {
        // Calculate wins from total - losses
        const newWins = totalVal - lossesVal;
        if (newWins >= 0) {
          setWins(newWins.toString());
          setResult(calculate(newWins, lossesVal));
        } else {
          setResult(null);
        }
      } else if (field === 'total' && validValues.includes('wins')) {
        // Calculate losses from total - wins
        const newLosses = totalVal - winsVal;
        if (newLosses >= 0) {
          setLosses(newLosses.toString());
          setResult(calculate(winsVal, newLosses));
        } else {
          setResult(null);
        }
      } else if (field === 'total' && validValues.includes('losses')) {
        // Calculate wins from total - losses
        const newWins = totalVal - lossesVal;
        if (newWins >= 0) {
          setWins(newWins.toString());
          setResult(calculate(newWins, lossesVal));
        } else {
          setResult(null);
        }
      }
    } else {
      // Not exactly 2 valid values, clear result
      setResult(null);
    }
  };


  return (
    <div className="rate-calculator">
      <div className="rate-calculator-header">
        <Link to="/" className="back-button">← Back to Home</Link>
        <h1>Win Rate Calculator</h1>
        <p>Enter any 2 values to calculate win rate and required games</p>
      </div>
      
      <div className="rate-calculator-form">
        <div className="input-group">
          <label htmlFor="wins">Wins</label>
          <input
            type="number"
            id="wins"
            min="0"
            value={wins}
            onChange={(e) => handleInputChange('wins', e.target.value)}
            placeholder="Enter wins"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="losses">Losses</label>
          <input
            type="number"
            id="losses"
            min="0"
            value={losses}
            onChange={(e) => handleInputChange('losses', e.target.value)}
            placeholder="Enter losses"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="total">Total Games</label>
          <input
            type="number"
            id="total"
            min="0"
            value={total}
            onChange={(e) => handleInputChange('total', e.target.value)}
            placeholder="Enter total"
          />
        </div>
        
      </div>
      
      {result && (
        <div className="rate-calculator-results">
          <div className="result-card current-rate">
            <div className="result-icon">🎯</div>
            <div className="result-content">
              <div className="result-value">{result.currentRate}%</div>
              <div className="result-label">Current Win Rate</div>
            </div>
          </div>
          
          <div className="result-card wins-needed">
            <div className="result-icon">📈</div>
            <div className="result-content">
              <div className="result-value">+{result.winsNeeded}</div>
              <div className="result-label">Wins to reach {result.currentRate + 1}%</div>
            </div>
          </div>
          
          <div className="result-card losses-needed">
            <div className="result-icon">📉</div>
            <div className="result-content">
              <div className="result-value">+{result.lossesNeeded}</div>
              <div className="result-label">Losses to drop to {result.currentRate - 1}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RateCalculator;