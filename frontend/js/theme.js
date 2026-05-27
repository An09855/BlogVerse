/* ============================================
   BlogVerse — Theme Toggle System
   ============================================ */

(function () {
  'use strict';

  const THEME_KEY = 'blogverse-theme';

  /**
   * Get saved theme or default to 'light'
   */
  function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  }

  /**
   * Apply theme to the document
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateToggleIcon(theme);
  }

  /**
   * Update the toggle button icon
   */
  function updateToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const iconEl = btn.querySelector('.icon');
    if (iconEl) {
      iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  /**
   * Initialize theme on page load
   */
  function initTheme() {
    const theme = getSavedTheme();
    applyTheme(theme);
  }

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  // Expose to global scope
  window.initTheme = initTheme;
  window.toggleTheme = toggleTheme;
})();
