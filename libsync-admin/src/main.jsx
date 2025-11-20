import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import App from './App.jsx'

// Set body class immediately based on current path
const currentPath = window.location.pathname;
if (currentPath !== '/') {
  document.body.classList.remove('home-page');
  document.documentElement.classList.remove('home-page');
} else {
  document.body.classList.add('home-page');
  document.documentElement.classList.add('home-page');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
