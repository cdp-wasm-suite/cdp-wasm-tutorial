import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@olilarkin/react-waveform/style.css';
import './styles/app.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
