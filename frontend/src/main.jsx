// ============================================================
//  main.jsx — Vite Entry Point
//  StockSense Pro
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Global styles — order matters
import './styles/theme.css';    // 1. CSS variables / design tokens
import './styles/global.css';  // 2. Reset + base styles

import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);