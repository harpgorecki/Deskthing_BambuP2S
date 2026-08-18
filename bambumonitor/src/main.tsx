// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// FIX: Removed broken DeskThing.init() call causing the crash
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
