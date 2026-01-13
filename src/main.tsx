import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/toby.css';
import { AppProvider } from './app/AppContext';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout, Home } from './app/App';
import { Settings } from './app/SettingsPage';

const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </React.StrictMode>
);
