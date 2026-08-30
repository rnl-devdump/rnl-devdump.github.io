import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MovieApp from './movie/MovieApp.jsx'
import './movie/movie.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MovieApp />
  </StrictMode>,
)
