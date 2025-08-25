import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { AppProvider } from './app/AppContext';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout, Home, Settings } from './app/App';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'settings', element: <Settings /> },
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
