import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress non-fatal DOM reconciliation errors from third-party SDKs (Matterport)
// These errors appear in the dev overlay but don't break functionality
const originalError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (error?.name === 'NotFoundError' || (typeof message === 'string' && message.includes('insertBefore'))) {
    console.warn('Suppressed DOM error:', message);
    return true; // Prevents the error from showing in the overlay
  }
  if (originalError) return originalError(message, source, lineno, colno, error);
  return false;
};

// Also handle unhandled promise rejections for the same error
window.addEventListener('unhandledrejection', function(event) {
  if (event.reason?.name === 'NotFoundError' || event.reason?.message?.includes('insertBefore')) {
    console.warn('Suppressed DOM promise error:', event.reason.message);
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <App />
);
