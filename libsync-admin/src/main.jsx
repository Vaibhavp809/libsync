import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import App from './App.jsx'

// Set body class for home page (login is handled by Login.jsx)
(function setBodyClass() {
  const path = window.location.pathname;
  const body = document.body;
  const html = document.documentElement;
  
  if (!body) {
    setTimeout(setBodyClass, 0);
    return;
  }
  
  // Add home-page class only for home route
  if (path === '/') {
    body.classList.add('home-page');
    html.classList.add('home-page');
  }
})();


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
