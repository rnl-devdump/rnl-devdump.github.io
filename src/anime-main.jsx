import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './anime/anime.css';
import App from './anime/AnimeApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
