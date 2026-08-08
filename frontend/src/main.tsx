/**
 * VEL Finance — Application Entry Point
 * ─────────────────────────────────────────────────────────────────────────────
 * Mounts the React application.
 *
 * Import order:
 * 1. Inter font (self-hosted via @fontsource/inter)
 * 2. Global styles (Tailwind v4 + design tokens + resets)
 * 3. Application
 */

// ── Fonts — Self-hosted Inter via @fontsource (per user requirement) ─────────
import '@fontsource/inter/300.css'; // Light
import '@fontsource/inter/400.css'; // Regular
import '@fontsource/inter/500.css'; // Medium
import '@fontsource/inter/600.css'; // SemiBold
import '@fontsource/inter/700.css'; // Bold

// ── Global Styles ─────────────────────────────────────────────────────────────
import './styles/globals.css';

// ── Application ───────────────────────────────────────────────────────────────
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    '[VEL Finance] Root element #root not found in index.html. ' +
    'Ensure the HTML template has <div id="root"></div>.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
