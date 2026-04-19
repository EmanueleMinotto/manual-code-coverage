import React from 'react';
import ReactDOM from 'react-dom/client';

import { MccClient } from '@manual-code-coverage/browser';

function App() {
  return <h1>MCC Example App</h1>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (window.__mcc_config__) {
  const client = new MccClient();
  void client.init();
}
