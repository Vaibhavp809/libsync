import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import App from './App.jsx'

// Apply scaling immediately - this runs after index.html script but before React
(function applyScalingNow() {
  const path = window.location.pathname;
  const body = document.body;
  const html = document.documentElement;
  
  if (!body) {
    setTimeout(applyScalingNow, 0);
    return;
  }
  
  // Remove all route classes
  body.classList.remove('home-page', 'login-page');
  html.classList.remove('home-page', 'login-page');
  
  // Apply scaling DIRECTLY via inline styles
  if (path === '/') {
    body.classList.add('home-page');
    html.classList.add('home-page');
    body.style.transform = '';
    body.style.width = '';
    body.style.height = '';
  } else if (path === '/login') {
    body.classList.add('login-page');
    html.classList.add('login-page');
    body.style.transform = '';
    body.style.width = '';
    body.style.height = '';
  } else {
    // Apply 80% scale directly
    body.style.transform = 'scale(0.8)';
    body.style.transformOrigin = 'top left';
    body.style.width = '125%';
    body.style.height = '125%';
    body.style.position = 'relative';
    html.style.overflowX = 'hidden';
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
