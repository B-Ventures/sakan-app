import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';

// Conditionally register service worker based on domain type to prevent stale dev caching
const isDevDomain = 
  typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname.endsWith('.run.app') || 
    window.location.hostname.includes('aistudio')
  );

if (isDevDomain) {
  // Proactively unregister any service workers on development domains to prevent white screen caching
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('Stale dev ServiceWorker unregistered:', registration.scope);
      }
    }).catch(err => console.error('Error unregistering sw:', err));
  }
  // Clear caches to bypass any asset caching mismatches
  if ('caches' in window) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key);
        console.log('Stale dev Cache deleted:', key);
      }
    }).catch(err => console.error('Error clearing caches:', err));
  }
} else {
  // Register Service Worker for installable PWA support in production
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('PWA ServiceWorker registered successfully: ', registration.scope);
        })
        .catch((error) => {
          console.error('PWA ServiceWorker registration failed: ', error);
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);
