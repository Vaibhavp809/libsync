import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import App from './App.jsx'

// Set body class and force height recalculation immediately - runs before React
(function setBodyClassAndHeight() {
  const path = window.location.pathname;
  const body = document.body;
  const html = document.documentElement;
  
  if (!body) {
    setTimeout(setBodyClassAndHeight, 0);
    return;
  }
  
  // Remove all route classes
  body.classList.remove('home-page', 'login-page');
  html.classList.remove('home-page', 'login-page');
  
  // Add appropriate class based on route
  if (path === '/') {
    body.classList.add('home-page');
    html.classList.add('home-page');
  }
  // For login and all other routes, no class = 80% zoom will apply via CSS
  
  // Force height recalculation immediately - make heights flexible
  body.style.height = 'auto';
  body.style.minHeight = '100%';
  html.style.height = 'auto';
  html.style.minHeight = '100%';
  
  // Force reflow to recalculate
  body.offsetHeight;
  html.offsetHeight;
  
  // Also force recalculation after a delay to ensure it sticks
  setTimeout(() => {
    if (body && html) {
      body.style.height = 'auto';
      html.style.height = 'auto';
      body.offsetHeight;
      html.offsetHeight;
    }
  }, 0);
  
  setTimeout(() => {
    if (body && html) {
      body.style.height = 'auto';
      html.style.height = 'auto';
      body.offsetHeight;
      html.offsetHeight;
    }
  }, 50);
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
