/* ============================================
   BlogVerse — Authentication Module
   ============================================ */

(function () {
  'use strict';

  const TOKEN_KEY = 'blogverse-token';
  const USER_KEY = 'blogverse-user';
  const API_BASE = '/api';

  /* ---------- Helpers ---------- */

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function isAdmin() {
    const user = getUser();
    return user && user.is_admin;
  }

  function saveAuth(data) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function getAvatarUrl(avatarPath) {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) return avatarPath;
    // Remove leading slash if present to avoid double slashes
    const cleanPath = avatarPath.replace(/^\/+/, '');
    return `/uploads/${cleanPath.replace(/^uploads\//, '')}`;
  }

  function defaultAvatarSvg() {
    return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%236c5ce7"/><text x="50" y="55" font-size="40" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Inter,sans-serif">👤</text></svg>')}`;
  }

  /* ---------- API Calls ---------- */

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed. Please check your credentials.');
    }
    const data = await res.json();
    saveAuth(data);
    updateAuthUI();
    return data;
  }

  async function register(formData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: formData, // multipart
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed. Please try again.');
    }
    const data = await res.json();
    saveAuth(data);
    updateAuthUI();
    return data;
  }

  async function resetPassword(email, newPassword) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, new_password: newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Password reset failed.');
    }
    return await res.json();
  }

  async function updateProfile(formData) {
    const res = await fetch(`${API_BASE}/users/me`, {
      method: 'PUT',
      headers: { ...authHeaders() },
      body: formData, // multipart
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Profile update failed.');
    }
    const updatedUser = await res.json();
    // Update stored user
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    updateAuthUI();
    return updatedUser;
  }

  async function fetchCurrentUser() {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch user');
    }
    const user = await res.json();
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }

  function logout() {
    clearAuth();
    updateAuthUI();
    // Refresh posts to hide edit/delete buttons
    if (window.Blog && window.Blog.fetchPosts) {
      window.Blog.fetchPosts();
    }
  }

  /* ---------- UI Updates ---------- */

  function updateAuthUI() {
    const loginBtn = document.getElementById('btn-login');
    const userProfile = document.getElementById('user-profile');
    const fabAddPost = document.getElementById('fab-add-post');
    const heroCta = document.getElementById('hero-cta');
    const heroCtaText = document.getElementById('hero-cta-text');
    const heroSection = document.querySelector('.hero');

    if (isLoggedIn()) {
      const user = getUser();

      // Hide hero section when logged in
      if (heroSection) heroSection.classList.add('hidden');

      // Hide login button, show user profile
      if (loginBtn) loginBtn.classList.add('hidden');
      if (userProfile) {
        userProfile.classList.remove('hidden');
        const nameEl = userProfile.querySelector('.user-name');
        const avatarEl = userProfile.querySelector('.user-avatar');
        if (nameEl) {
          nameEl.textContent = user.nickname || user.email;
          // Add admin badge if admin
          if (user.is_admin) {
            if (!nameEl.querySelector('.admin-badge')) {
              const badge = document.createElement('span');
              badge.className = 'admin-badge';
              badge.textContent = 'Admin';
              nameEl.appendChild(badge);
            }
          }
        }
        if (avatarEl) {
          avatarEl.src = getAvatarUrl(user.avatar_path) || defaultAvatarSvg();
          avatarEl.onerror = function () { this.src = defaultAvatarSvg(); };
        }
      }

      // Show FAB
      if (fabAddPost) fabAddPost.classList.remove('hidden');

      // Update hero CTA
      if (heroCta) heroCta.onclick = function () { window.openModal && window.openModal('add-post-modal'); };
      if (heroCtaText) heroCtaText.textContent = 'Start Writing';
    } else {
      // Show hero section when logged out
      if (heroSection) heroSection.classList.remove('hidden');

      // Show login button, hide user profile
      if (loginBtn) loginBtn.classList.remove('hidden');
      if (userProfile) userProfile.classList.add('hidden');

      // Hide FAB
      if (fabAddPost) fabAddPost.classList.add('hidden');

      // Update hero CTA
      if (heroCta) heroCta.onclick = function () { window.openModal && window.openModal('login-modal'); };
      if (heroCtaText) heroCtaText.textContent = 'Join Us';
    }
  }

  /* ---------- Avatar Preview ---------- */

  function setupAvatarPreview(inputId, previewContainerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(previewContainerId);
    if (!input || !container) return;

    input.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        // Check if preview image already exists
        let img = container.querySelector('.avatar-preview-img');
        if (!img) {
          img = document.createElement('img');
          img.className = 'avatar-preview-img';
          container.appendChild(img);
        }
        img.src = e.target.result;
        // Hide the upload icon
        const icon = container.querySelector('.upload-icon');
        if (icon) icon.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    // Click on the area to trigger file input
    container.addEventListener('click', function () {
      input.click();
    });
  }

  /* ---------- Expose ---------- */

  window.Auth = {
    getToken,
    getUser,
    isLoggedIn,
    isAdmin,
    login,
    register,
    resetPassword,
    updateProfile,
    fetchCurrentUser,
    logout,
    updateAuthUI,
    setupAvatarPreview,
    getAvatarUrl,
    defaultAvatarSvg,
    authHeaders,
  };
})();
