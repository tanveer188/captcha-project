import React, { useState } from 'react';
import SymbolTracer from './components/SymbolTracer';
import './App.css';

function App() {
  const [symbol, setSymbol] = useState('0');

  const validSymbols = ['0', '1', '2', '3', 'C', 'L', 'U', 'S'];

  return (
    <div className="App">
      <h1>Symbol Tracer</h1>
      <div style={{ marginBottom: '20px' }}>
        <label>
          Select Symbol:
          <select 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{ marginLeft: '10px' }}
          >
            {validSymbols.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <SymbolTracer symbol={symbol} />
      <p>Click on the canvas to see the animation!</p>
    </div>
  );
}

export default App; 