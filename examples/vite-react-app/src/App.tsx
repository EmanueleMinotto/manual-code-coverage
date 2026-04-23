import React, { useState } from 'react';

import { calculate, type Operation } from './utils/calculator';
import { decrement, double, increment, reset } from './utils/counter';
import { countVowels, isPalindrome, reverse, toUpperCase } from './utils/strings';
import {
  getPasswordStrength,
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateRegistrationForm,
  validateUsername,
  type RegistrationData,
  type RegistrationErrors,
} from './utils/validator';

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

  // Registration form
  const [regData, setRegData] = useState<RegistrationData>({
    email: '', username: '', password: '', confirmPassword: '',
  });
  const [touched, setTouched] = useState<Partial<Record<keyof RegistrationData, boolean>>>({});
  const [regErrors, setRegErrors] = useState<RegistrationErrors>({});
  const [regSubmitted, setRegSubmitted] = useState(false);

  const fieldValidators: Record<keyof RegistrationData, (d: RegistrationData) => string | null> = {
    email: (d) => validateEmail(d.email),
    username: (d) => validateUsername(d.username),
    password: (d) => validatePassword(d.password),
    confirmPassword: (d) => validatePasswordConfirm(d.password, d.confirmPassword),
  };

  const handleRegChange = (field: keyof RegistrationData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newData = { ...regData, [field]: e.target.value };
    setRegData(newData);
    setTouched((t) => ({ ...t, [field]: true }));
    const err = fieldValidators[field]!(newData);
    setRegErrors((prev: RegistrationErrors) => {
      const next = { ...prev };
      if (err !== null) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleRegSubmit = () => {
    const errors = validateRegistrationForm(regData);
    setRegErrors(errors);
    setTouched({ email: true, username: true, password: true, confirmPassword: true });
    setRegSubmitted(Object.keys(errors).length === 0);
  };

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

      {/* ── Registration Form (validator.ts) ── */}
      <section style={sectionStyle}>
        <span style={labelStyle}>validator.ts — Registration Form (non-happy path)</span>
        <p style={{ fontSize: 12, color: '#666', marginTop: 0, marginBottom: 12 }}>
          Questo form ha ~42 branch. Per coprirli tutti devi deliberatamente inserire input sbagliati:
          email senza @, password troppo corta, username con caratteri speciali, ecc.
        </p>

        {regData.password && (() => {
          const strength: 'weak' | 'fair' | 'strong' = getPasswordStrength(regData.password);
          const strengthColor = { weak: '#c00', fair: '#b60', strong: '#060' } as const;
          return (
            <div style={{ marginBottom: 8, fontSize: 12, color: strengthColor[strength] }}>
              Password strength: <strong>{strength}</strong>
            </div>
          );
        })()}

        {([
          { key: 'email' as const, label: 'Email', type: 'text', placeholder: 'user@example.com' },
          { key: 'username' as const, label: 'Username', type: 'text', placeholder: 'min 3, max 20, solo a-z0-9_' },
          { key: 'password' as const, label: 'Password', type: 'password', placeholder: 'min 8, 1 uppercase, 1 numero' },
          { key: 'confirmPassword' as const, label: 'Confirm password', type: 'password', placeholder: 'ripeti la password' },
        ]).map(({ key, label, type, placeholder }) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ ...labelStyle, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>{label}</label>
            <input
              type={type}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '5px 8px', borderRadius: 4,
                border: `1px solid ${touched[key] && regErrors[key] ? '#c00' : '#bbb'}`,
              }}
              value={regData[key]}
              onChange={handleRegChange(key)}
              placeholder={placeholder}
            />
            {touched[key] && regErrors[key] && (
              <div style={{ fontSize: 12, color: '#c00', marginTop: 3 }}>{regErrors[key]}</div>
            )}
          </div>
        ))}

        <button
          style={{ ...btnStyle, background: '#222', color: '#fff', marginTop: 4 }}
          onClick={handleRegSubmit}
        >
          Submit (usa validateRegistrationForm)
        </button>

        {regSubmitted && (
          <div style={{ ...outputStyle, borderLeft: '3px solid #080', color: '#060', marginTop: 8 }}>
            Registrazione completata — tutti i branch validi coperti
          </div>
        )}
      </section>

      <p style={{ fontSize: 12, color: '#aaa' }}>
        Genera il report con:{' '}
        <code>pnpm --filter @manual-code-coverage/cli run start -- report &lt;commit-sha&gt; --output coverage/</code>
      </p>
    </div>
  );
}
