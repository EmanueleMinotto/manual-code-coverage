import React, { useState } from 'react';

import { calculate, type Operation } from './utils/calculator';
import { decrement, double, increment, reset } from './utils/counter';
import { countVowels, isPalindrome, reverse, toUpperCase } from './utils/strings';

const sectionStyle: React.CSSProperties = {
  border: '1px solid #d0d0d0',
  borderRadius: 8,
  padding: '1rem 1.5rem',
  marginBottom: '1.5rem',
  background: '#fafafa',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: '#888',
  marginBottom: 8,
  display: 'block',
};

const btnStyle: React.CSSProperties = {
  marginRight: 8,
  marginTop: 8,
  padding: '6px 14px',
  borderRadius: 5,
  border: '1px solid #bbb',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};

const outputStyle: React.CSSProperties = {
  marginTop: 10,
  padding: '6px 10px',
  background: '#f0f0f0',
  borderRadius: 4,
  fontFamily: 'monospace',
  fontSize: 14,
};

export function App() {
  // Counter
  const [count, setCount] = useState(0);

  // Calculator
  const [calcA, setCalcA] = useState('6');
  const [calcB, setCalcB] = useState('3');
  const [calcResult, setCalcResult] = useState<string | null>(null);

  // Strings
  const [strInput, setStrInput] = useState('Istanbul');
  const [strResult, setStrResult] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Manual Code Coverage — Demo</h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: 14 }}>
        Ogni pulsante esercita un branch di codice diverso. Clicca alcuni (non tutti) e poi
        genera il report per vedere la coverage parziale vs completa.
      </p>

      {/* ── Counter ── */}
      <section style={sectionStyle}>
        <span style={labelStyle}>counter.ts</span>
        <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{count}</div>
        <button style={btnStyle} onClick={() => setCount(increment(count))}>+1 increment</button>
        <button style={btnStyle} onClick={() => setCount(decrement(count))}>-1 decrement</button>
        <button style={btnStyle} onClick={() => setCount(double(count))}>×2 double</button>
        <button style={btnStyle} onClick={() => setCount(reset())}>reset</button>
        <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
          decrement clamps a 0 — branch non raggiunto finché count {'>'} 0
        </div>
      </section>

      {/* ── Calculator ── */}
      <section style={sectionStyle}>
        <span style={labelStyle}>calculator.ts</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{ width: 60, padding: '4px 6px', borderRadius: 4, border: '1px solid #bbb' }}
            value={calcA}
            onChange={(e) => setCalcA(e.target.value)}
          />
          <span style={{ color: '#888' }}>op</span>
          <input
            style={{ width: 60, padding: '4px 6px', borderRadius: 4, border: '1px solid #bbb' }}
            value={calcB}
            onChange={(e) => setCalcB(e.target.value)}
          />
        </div>
        {(['add', 'subtract', 'multiply', 'divide'] as Operation[]).map((op) => (
          <button
            key={op}
            style={btnStyle}
            onClick={() => setCalcResult(String(calculate(Number(calcA), Number(calcB), op)))}
          >
            {op}
          </button>
        ))}
        <button
          style={{ ...btnStyle, color: '#c00' }}
          onClick={() => setCalcResult(String(calculate(Number(calcA), 0, 'divide')))}
        >
          divide by 0
        </button>
        {calcResult !== null && <div style={outputStyle}>= {calcResult}</div>}
      </section>

      {/* ── Strings ── */}
      <section style={sectionStyle}>
        <span style={labelStyle}>strings.ts</span>
        <input
          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #bbb', width: '100%', boxSizing: 'border-box' }}
          value={strInput}
          onChange={(e) => setStrInput(e.target.value)}
        />
        <button style={btnStyle} onClick={() => setStrResult(toUpperCase(strInput))}>toUpperCase</button>
        <button style={btnStyle} onClick={() => setStrResult(reverse(strInput))}>reverse</button>
        <button style={btnStyle} onClick={() => setStrResult(String(countVowels(strInput)) + ' vocali')}>countVowels</button>
        <button style={btnStyle} onClick={() => setStrResult(isPalindrome(strInput) ? '✓ palindromo' : '✗ non palindromo')}>isPalindrome</button>
        {strResult !== null && <div style={outputStyle}>{strResult}</div>}
      </section>

      <p style={{ fontSize: 12, color: '#aaa' }}>
        Genera il report con:{' '}
        <code>pnpm --filter @manual-code-coverage/cli run start -- report &lt;commit-sha&gt; --output coverage/</code>
      </p>
    </div>
  );
}
