import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import App from './App.jsx'

// Set body class for CSS-based scaling (no transform, just font-size)
(function setBodyClass() {
  const path = window.location.pathname;
  const body = document.body;
  const html = document.documentElement;
  
  if (!body) {
    setTimeout(setBodyClass, 0);
    return;
  }
  
  // Remove all route classes
  body.classList.remove('home-page', 'login-page');
  html.classList.remove('home-page', 'login-page');
  
  // Add appropriate class based on route
  if (path === '/') {
    body.classList.add('home-page');
    html.classList.add('home-page');
  } else if (path === '/login') {
    body.classList.add('login-page');
    html.classList.add('login-page');
  }
  // For all other routes, no class = 80% font-size will apply via CSS
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
