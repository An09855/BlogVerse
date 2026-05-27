/* ============================================
   BlogVerse — Application Orchestrator
   ============================================ */

(function () {
  'use strict';

  /* ========================================
     Initialization
     ======================================== */

  document.addEventListener('DOMContentLoaded', function () {
    // 1. Initialize theme
    window.initTheme();

    // 2. Setup avatar previews
    window.Auth.setupAvatarPreview('register-avatar-input', 'register-avatar-area');
    window.Auth.setupAvatarPreview('profile-avatar-input', 'profile-avatar-area');

    // 3. Update auth UI
    window.Auth.updateAuthUI();

    // 4. Fetch and render posts
    window.Blog.fetchPosts();

    // 5. Bind all event listeners
    bindEvents();
  });

  /* ========================================
     Event Bindings
     ======================================== */

  function bindEvents() {
    /* --- Theme Toggle --- */
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', window.toggleTheme);
    }

    /* --- Login Button --- */
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
      btnLogin.addEventListener('click', function () {
        openModal('login-modal');
      });
    }

    /* --- User Profile Dropdown --- */
    const userProfile = document.getElementById('user-profile');
    if (userProfile) {
      userProfile.addEventListener('click', function (e) {
        e.stopPropagation();
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
          dropdown.classList.toggle('show');
          userProfile.classList.toggle('active');
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function () {
      const dropdown = document.getElementById('user-dropdown');
      const userProfile = document.getElementById('user-profile');
      if (dropdown) dropdown.classList.remove('show');
      if (userProfile) userProfile.classList.remove('active');
    });

    /* --- Dropdown Items --- */
    const editProfileBtn = document.getElementById('dropdown-edit-profile');
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', function () {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) dropdown.classList.remove('show');
        openEditProfileModal();
      });
    }

    const logoutBtn = document.getElementById('dropdown-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) dropdown.classList.remove('show');
        window.Auth.logout();
        showToast('Logged out successfully', 'success');
      });
    }

    /* --- FAB Add Post --- */
    const fabAddPost = document.getElementById('fab-add-post');
    if (fabAddPost) {
      fabAddPost.addEventListener('click', function () {
        openModal('add-post-modal');
      });
    }

    /* --- Modal Close Buttons --- */
    document.querySelectorAll('.modal-close').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const modal = this.closest('.modal-overlay');
        if (modal) closeModal(modal.id);
      });
    });

    /* --- Click outside modal to close --- */
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === this) closeModal(this.id);
      });
    });

    /* --- ESC key to close modals --- */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        // Close topmost open modal
        const openModals = document.querySelectorAll('.modal-overlay.show');
        if (openModals.length > 0) {
          closeModal(openModals[openModals.length - 1].id);
        }
        // Also close success popup and confirm dialog
        const successPopup = document.getElementById('success-popup');
        if (successPopup && successPopup.classList.contains('show')) {
          successPopup.classList.remove('show');
        }
        const confirmDialog = document.getElementById('confirm-dialog');
        if (confirmDialog && confirmDialog.classList.contains('show')) {
          confirmDialog.classList.remove('show');
        }
      }
    });

    /* --- Modal navigation links --- */
    const switchToRegister = document.getElementById('switch-to-register');
    if (switchToRegister) {
      switchToRegister.addEventListener('click', function (e) {
        e.preventDefault();
        closeModal('login-modal');
        setTimeout(function () { openModal('register-modal'); }, 200);
      });
    }

    const switchToLogin = document.getElementById('switch-to-login');
    if (switchToLogin) {
      switchToLogin.addEventListener('click', function (e) {
        e.preventDefault();
        closeModal('register-modal');
        setTimeout(function () { openModal('login-modal'); }, 200);
      });
    }

    const switchToReset = document.getElementById('switch-to-reset');
    if (switchToReset) {
      switchToReset.addEventListener('click', function (e) {
        e.preventDefault();
        closeModal('login-modal');
        setTimeout(function () { openModal('reset-modal'); }, 200);
      });
    }

    const switchResetToLogin = document.getElementById('switch-reset-to-login');
    if (switchResetToLogin) {
      switchResetToLogin.addEventListener('click', function (e) {
        e.preventDefault();
        closeModal('reset-modal');
        setTimeout(function () { openModal('login-modal'); }, 200);
      });
    }

    /* --- Form Submissions --- */
    bindFormSubmit('login-form', handleLoginSubmit);
    bindFormSubmit('register-form', handleRegisterSubmit);
    bindFormSubmit('reset-form', handleResetSubmit);
    bindFormSubmit('add-post-form', handleAddPostSubmit);
    bindFormSubmit('edit-post-form', handleEditPostSubmit);
    bindFormSubmit('edit-profile-form', handleEditProfileSubmit);

    /* --- Event Delegation for Blog Card Actions --- */
    const postsContainer = document.getElementById('posts-container');
    if (postsContainer) {
      postsContainer.addEventListener('click', function (e) {
        const editBtn = e.target.closest('.action-edit');
        const deleteBtn = e.target.closest('.action-delete');

        if (editBtn) {
          e.stopPropagation();
          const id = editBtn.dataset.id;
          const title = editBtn.dataset.title;
          const content = editBtn.dataset.content;
          openEditPostModal(id, title, content);
        }

        if (deleteBtn) {
          e.stopPropagation();
          const id = deleteBtn.dataset.id;
          showConfirmDialog('Are you sure you want to delete this post? This action cannot be undone.', async function () {
            try {
              await window.Blog.deletePost(id);
              showToast('Post deleted successfully', 'success');
              window.Blog.fetchPosts();
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        }
      });
    }

    /* --- Logo click scrolls to top --- */
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  /* ========================================
     Form Handlers
     ======================================== */

  function bindFormSubmit(formId, handler) {
    const form = document.getElementById(formId);
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        handler(this);
      });
    }
  }

  async function handleLoginSubmit(form) {
    const email = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!email || !password) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    setButtonLoading(submitBtn, true);

    try {
      await window.Auth.login(email, password);
      closeModal('login-modal');
      form.reset();
      showSuccessPopup('Welcome back! 🎉', function () {
        window.Blog.fetchPosts();
      });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  async function handleRegisterSubmit(form) {
    const nickname = form.querySelector('[name="nickname"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const confirmPassword = form.querySelector('[name="confirm_password"]').value;
    const avatarInput = form.querySelector('[name="avatar"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!nickname || !email || !password) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData();
      formData.append('nickname', nickname);
      formData.append('email', email);
      formData.append('password', password);
      if (avatarInput && avatarInput.files[0]) {
        formData.append('avatar', avatarInput.files[0]);
      }

      await window.Auth.register(formData);
      closeModal('register-modal');
      form.reset();
      // Reset avatar preview
      const previewImg = document.querySelector('#register-avatar-area .avatar-preview-img');
      if (previewImg) previewImg.remove();
      const uploadIcon = document.querySelector('#register-avatar-area .upload-icon');
      if (uploadIcon) uploadIcon.style.display = '';

      showSuccessPopup('Account created successfully! 🎉', function () {
        window.Blog.fetchPosts();
      });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  async function handleResetSubmit(form) {
    const email = form.querySelector('[name="email"]').value.trim();
    const newPassword = form.querySelector('[name="new_password"]').value;
    const confirmPassword = form.querySelector('[name="confirm_password"]').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!email || !newPassword) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    setButtonLoading(submitBtn, true);

    try {
      await window.Auth.resetPassword(email, newPassword);
      closeModal('reset-modal');
      form.reset();
      showSuccessPopup('Password reset successfully!', function () {
        openModal('login-modal');
      });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  async function handleAddPostSubmit(form) {
    const title = form.querySelector('[name="title"]').value.trim();
    const content = form.querySelector('[name="content"]').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!title || !content) {
      showToast('Please fill in both title and content', 'warning');
      return;
    }

    setButtonLoading(submitBtn, true);

    try {
      await window.Blog.createPost(title, content);
      closeModal('add-post-modal');
      form.reset();
      showToast('Post published successfully! 🎉', 'success');
      window.Blog.fetchPosts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  async function handleEditPostSubmit(form) {
    const id = form.dataset.postId;
    const title = form.querySelector('[name="title"]').value.trim();
    const content = form.querySelector('[name="content"]').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!title || !content) {
      showToast('Please fill in both title and content', 'warning');
      return;
    }

    setButtonLoading(submitBtn, true);

    try {
      await window.Blog.updatePost(id, title, content);
      closeModal('edit-post-modal');
      form.reset();
      showToast('Post updated successfully!', 'success');
      window.Blog.fetchPosts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  async function handleEditProfileSubmit(form) {
    const nickname = form.querySelector('[name="nickname"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const confirmPassword = form.querySelector('[name="confirm_password"]').value;
    const avatarInput = form.querySelector('[name="avatar"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!nickname) {
      showToast('Nickname is required', 'warning');
      return;
    }

    if (password && password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password && password.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData();
      formData.append('nickname', nickname);
      if (password) formData.append('password', password);
      if (avatarInput && avatarInput.files[0]) {
        formData.append('avatar', avatarInput.files[0]);
      }

      await window.Auth.updateProfile(formData);
      closeModal('edit-profile-modal');
      showToast('Profile updated successfully!', 'success');
      window.Blog.fetchPosts(); // Refresh to show updated author info
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  /* ========================================
     Modal Management
     ======================================== */

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('show');
    // Restore body scroll if no other modals are open
    const openModals = document.querySelectorAll('.modal-overlay.show');
    if (openModals.length === 0) {
      document.body.style.overflow = '';
    }
  }

  function openEditPostModal(id, title, content) {
    const form = document.getElementById('edit-post-form');
    if (!form) return;
    form.dataset.postId = id;
    form.querySelector('[name="title"]').value = title;
    form.querySelector('[name="content"]').value = content;
    openModal('edit-post-modal');
  }

  function openEditProfileModal() {
    const user = window.Auth.getUser();
    if (!user) return;

    const form = document.getElementById('edit-profile-form');
    if (!form) return;

    form.querySelector('[name="nickname"]').value = user.nickname || '';
    form.querySelector('[name="password"]').value = '';
    form.querySelector('[name="confirm_password"]').value = '';

    // Set current avatar preview
    const previewArea = document.getElementById('profile-avatar-area');
    if (previewArea) {
      let img = previewArea.querySelector('.avatar-preview-img');
      const avatarUrl = window.Auth.getAvatarUrl(user.avatar_path) || window.Auth.defaultAvatarSvg();
      if (!img) {
        img = document.createElement('img');
        img.className = 'avatar-preview-img';
        previewArea.appendChild(img);
      }
      img.src = avatarUrl;
      img.onerror = function () { this.src = window.Auth.defaultAvatarSvg(); };

      const uploadIcon = previewArea.querySelector('.upload-icon');
      if (uploadIcon) uploadIcon.style.display = 'none';
    }

    openModal('edit-profile-modal');
  }

  /* ========================================
     Toast Notifications
     ======================================== */

  function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-text">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Auto dismiss after 4 seconds
    setTimeout(function () {
      toast.classList.add('toast-out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4000);
  }

  /* ========================================
     Success Popup
     ======================================== */

  function showSuccessPopup(message, callback) {
    const overlay = document.getElementById('success-popup');
    const msgEl = document.getElementById('success-popup-message');
    const okBtn = document.getElementById('success-popup-ok');

    if (!overlay || !msgEl) return;

    msgEl.textContent = message;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Clean up old listener
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    newOkBtn.id = 'success-popup-ok';

    newOkBtn.addEventListener('click', function () {
      overlay.classList.remove('show');
      document.body.style.overflow = '';
      if (callback) callback();
    });
  }

  /* ========================================
     Confirm Dialog
     ======================================== */

  function showConfirmDialog(message, onConfirm) {
    const overlay = document.getElementById('confirm-dialog');
    const msgEl = document.getElementById('confirm-dialog-message');
    const confirmBtn = document.getElementById('confirm-dialog-yes');
    const cancelBtn = document.getElementById('confirm-dialog-cancel');

    if (!overlay || !msgEl) return;

    msgEl.textContent = message;
    overlay.classList.add('show');

    // Clean up old listeners by cloning
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    newConfirm.id = 'confirm-dialog-yes';

    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    newCancel.id = 'confirm-dialog-cancel';

    function close() {
      overlay.classList.remove('show');
    }

    newConfirm.addEventListener('click', function () {
      close();
      if (onConfirm) onConfirm();
    });

    newCancel.addEventListener('click', close);
  }

  /* ========================================
     Utility Functions
     ======================================== */

  function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText || 'Submit';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ========================================
     Expose to Global Scope
     ======================================== */

  window.openModal = openModal;
  window.closeModal = closeModal;
  window.showToast = showToast;
  window.showSuccessPopup = showSuccessPopup;
  window.showConfirmDialog = showConfirmDialog;
})();
