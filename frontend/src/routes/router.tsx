/**
 * VEL Finance — Router Instance
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the browser router from the route configuration.
 * Separated from routes/index.tsx to allow testing route configs independently.
 */
import { createBrowserRouter } from 'react-router-dom';
import { routes } from './index';

export const router = createBrowserRouter(routes, {
  // Future flags — opt into upcoming React Router v7 behaviors now
  future: {
    v7_relativeSplatPath: true,
  },
});
