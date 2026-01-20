import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './pages/Accounts/styles/accounts.css';
import { registerSW } from './pwa';

registerSW();

// This script will run as soon as the HTML is parsed.
const blockingThemeScript = `
  (function() {
    try {
      const theme = localStorage.getItem('theme');
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    } catch (e) {}
  })();
`;

// Render the blocking script before the app
const head = document.head;
const script = document.createElement('script');
script.innerHTML = blockingThemeScript;
head.insertBefore(script, head.firstChild);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
