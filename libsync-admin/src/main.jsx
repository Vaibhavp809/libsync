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

/* ---- AUTO-INJECTED: SPA route watcher to toggle html.post-login ---- */
(function () {
  try {
    function applyPostLoginClass() {
      try {
        // treat any non-login path as "post-login". Adjust path check if your login route differs.
        var isLogin = window.location.pathname === "/login" || window.location.pathname === "/auth/login" || window.location.pathname === "/";
        if (!isLogin) {
          document.documentElement.classList.add("post-login");
        } else {
          document.documentElement.classList.remove("post-login");
        }
      } catch (e) {
        console.warn("post-login class toggler error", e);
      }
    }

    // monkey-patch history methods to dispatch 'locationchange' for SPA navigation
    (function(history) {
      var push = history.pushState;
      var replace = history.replaceState;
      history.pushState = function() {
        var ret = push.apply(history, arguments);
        window.dispatchEvent(new Event("locationchange"));
        return ret;
      };
      history.replaceState = function() {
        var ret = replace.apply(history, arguments);
        window.dispatchEvent(new Event("locationchange"));
        return ret;
      };
    })(window.history);

    // listen for popstate and custom locationchange
    window.addEventListener("popstate", applyPostLoginClass);
    window.addEventListener("locationchange", applyPostLoginClass);
    // initial run
    document.addEventListener("DOMContentLoaded", applyPostLoginClass);
    // also run right away
    applyPostLoginClass();

    // optional: watch localStorage token changes (if your app sets 'token' or 'auth' on login)
    window.addEventListener("storage", function (e) {
      if (e.key && (e.key.toLowerCase().indexOf("token") !== -1 || e.key.toLowerCase().indexOf("auth") !== -1)) {
        applyPostLoginClass();
      }
    });
  } catch (err) {
    console.warn("post-login toggler injection failed", err);
  }
})();
/* ---- end auto-inject ---- */

/* CURSOR: force layout recalculation on SPA route changes to avoid persistent white gaps */
(function() {
  function forceReflow() {
    try {
      // trigger reflow and dispatch resize so CSS that depends on viewport recalculates
      document.body.style.display = "block";
      // small timeout to allow DOM settle
      window.requestAnimationFrame(function() {
        window.dispatchEvent(new Event("resize"));
        // remove any accidental inline height pixels left by scripts: clear body inline heights if present
        if (document.body.style.height && document.body.style.height.indexOf("px") > -1) {
          document.body.style.height = "";
        }
      });
    } catch(e) { 
      console.warn("forceReflow error", e); 
    }
  }

  // patch history to detect SPA navigation (if not already patched)
  if (!window.history._cursorPatched) {
    (function(history) {
      var push = history.pushState;
      var replace = history.replaceState;
      history.pushState = function() {
        var ret = push.apply(history, arguments);
        window.dispatchEvent(new Event("locationchange"));
        return ret;
      };
      history.replaceState = function() {
        var ret = replace.apply(history, arguments);
        window.dispatchEvent(new Event("locationchange"));
        return ret;
      };
      window.history._cursorPatched = true;
    })(window.history);
  }

  window.addEventListener("locationchange", function(){ setTimeout(forceReflow, 60); });
  window.addEventListener("popstate", function(){ setTimeout(forceReflow, 60); });
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(forceReflow, 100); });
  // also run right away
  setTimeout(forceReflow, 200);
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
