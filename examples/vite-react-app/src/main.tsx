import React from 'react';
import ReactDOM from 'react-dom/client';

import { MccClient } from '@manual-code-coverage/browser';

import { App } from './App.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (window.__mcc_config__) {
  const client = new MccClient();
  void client.init();
}
