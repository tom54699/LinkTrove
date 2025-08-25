import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { AppProvider } from './app/AppContext';

function Popup() {
  return (
    <div className="p-3 min-w-80">
      <strong>LinkTrove</strong>
      <div className="opacity-80">Popup ready.</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <Popup />
    </AppProvider>
  </React.StrictMode>
);
