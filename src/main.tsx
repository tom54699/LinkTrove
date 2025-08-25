import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div style={{ color: '#e2e8f0', background: '#0f172a', minHeight: '100vh', padding: 24 }}>
      <h1 style={{ margin: 0 }}>LinkTrove</h1>
      <p>New Tab app shell. Start implementing tasks 3.x next.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

