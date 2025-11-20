import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import App from './App.jsx'

// Set body class immediately based on current path (before React loads)
const currentPath = window.location.pathname;
document.body.classList.remove('home-page', 'login-page');
document.documentElement.classList.remove('home-page', 'login-page');

if (currentPath === '/') {
  document.body.classList.add('home-page');
  document.documentElement.classList.add('home-page');
} else if (currentPath === '/login') {
  document.body.classList.add('login-page');
  document.documentElement.classList.add('login-page');
}
// For all other routes, no class = 80% scale will apply

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
