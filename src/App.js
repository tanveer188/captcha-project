import React, { useState } from 'react';
import SymbolTracer from './components/SymbolTracer';
import './App.css';

function App() {
  const [symbol, setSymbol] = useState('');
  const [error, setError] = useState('');

  const validSymbols = [
    // Basic shapes
    'O', 'E', 'S', 'R', 'D', 'T', 'H',
    // Special shapes
    'V', 'A', 'U',
    // Numbers
    '0', '1', '2', '3', '4', '5', '6', '7', '9'
  ];

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value.length > 1) {
      setError('Please enter only one character');
      return;
    }
    
    if (value && !validSymbols.includes(value.toUpperCase())) {
      setError(`Invalid symbol. Please use: ${validSymbols.join(', ')}`);
      return;
    }

    setError('');
    setSymbol(value.toUpperCase());
  };

  return (
    <div className="App">
      <h1>Symbol Tracer</h1>
      <div className="input-container" style={{ marginBottom: '20px' }}>
        <label>
          Enter Symbol:
          <input
            type="text"
            value={symbol}
            onChange={handleInputChange}
            maxLength={1}
            style={{
              marginLeft: '10px',
              padding: '8px',
              fontSize: '16px',
              width: '40px',
              textAlign: 'center'
            }}
            placeholder="?"
          />
        </label>
        {error && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            {error}
          </div>
        )}
        <div style={{ marginTop: '10px', color: '#666' }}>
          <div>Valid shapes: O (circle), E (ellipse), R (rectangle), D (diamond), T (triangle), H (hexagon)</div>
          <div>Special shapes: V (heart), A (right arrow), U (up arrow)</div>
          <div>Valid numbers: 0-7, 9</div>
        </div>
      </div>
      <SymbolTracer symbol={symbol} />
    </div>
  );
}

export default App; 