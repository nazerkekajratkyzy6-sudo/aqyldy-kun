import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/onest';
import '@fontsource-variable/geologica';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
