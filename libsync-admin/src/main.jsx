import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import App from './App.jsx'

// Set body class and force CSS application immediately - runs before React
// This ensures 80% zoom is applied immediately on page load
(function setBodyClassAndApplyZoom() {
  const path = window.location.pathname;
  const body = document.body;
  const html = document.documentElement;
  
  if (!body) {
    setTimeout(setBodyClassAndApplyZoom, 0);
    return;
  }
  
  // Remove all route classes
  body.classList.remove('home-page', 'login-page');
  html.classList.remove('home-page', 'login-page');
  
  // Add appropriate class based on route
  if (path === '/') {
    body.classList.add('home-page');
    html.classList.add('home-page');
  } else {
    // For all other routes (dashboard, login, etc.), apply 80% zoom immediately
    // Force zoom application via inline style to ensure it applies immediately
    html.style.zoom = '0.8';
    body.style.height = 'auto';
    body.style.minHeight = '100%';
  }
  
  // Force reflow to ensure zoom is applied
  body.offsetHeight;
  html.offsetHeight;
  
  // Also apply after a delay to ensure it sticks
  setTimeout(() => {
    if (body && html && path !== '/') {
      html.style.zoom = '0.8';
      body.style.height = 'auto';
      body.style.minHeight = '100%';
      body.offsetHeight;
      html.offsetHeight;
    }
  }, 0);
  
  setTimeout(() => {
    if (body && html && path !== '/') {
      html.style.zoom = '0.8';
      body.style.height = 'auto';
      body.style.minHeight = '100%';
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
