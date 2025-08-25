import React from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  return (
    <div style={{ padding: 12 }}>
      <strong>LinkTrove</strong>
      <div>Popup ready.</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);

