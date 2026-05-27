/* ============================================
   BlogVerse — Blog CRUD Module
   ============================================ */

(function () {
  'use strict';

  const API_BASE = '/api';

  /* ---------- API Calls ---------- */

  async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    // Show skeleton loading
    showSkeletonLoading(container);

    try {
      const res = await fetch(`${API_BASE}/posts`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const posts = await res.json();
      renderPosts(posts, container);
    } catch (err) {
      console.error('Error fetching posts:', err);
      container.innerHTML = '';
      showEmptyState(container, 'Something went wrong', 'Could not load posts. Please try again later.');
    }
  }

  async function createPost(title, content) {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...window.Auth.authHeaders(),
      },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create post.');
    }
    return await res.json();
  }

  async function updatePost(id, title, content) {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...window.Auth.authHeaders(),
      },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update post.');
    }
    return await res.json();
  }

  async function deletePost(id) {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'DELETE',
      headers: { ...window.Auth.authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete post.');
    }
    return true;
  }

  /* ---------- Rendering ---------- */

  function renderPosts(posts, container) {
    if (!container) container = document.getElementById('posts-container');
    if (!container) return;

    container.innerHTML = '';

    if (!posts || posts.length === 0) {
      showEmptyState(container);
      return;
    }

    const currentUser = window.Auth.getUser();
    const isAdminUser = window.Auth.isAdmin();

    posts.forEach(function (post, index) {
      const card = document.createElement('div');
      card.className = 'blog-card animate-in';
      card.style.animationDelay = `${index * 0.05}s`;

      const avatarUrl = window.Auth.getAvatarUrl(post.author_avatar) || window.Auth.defaultAvatarSvg();

      const canEdit = currentUser && (currentUser.id === post.author_id || isAdminUser);

      card.innerHTML = `
        <div class="card-header">
          <img class="author-avatar" src="${escapeAttr(avatarUrl)}" alt="${escapeAttr(post.author_nickname || 'User')}" onerror="this.src='${window.Auth.defaultAvatarSvg()}'">
          <div class="author-info">
            <div class="author-name">${escapeHtml(post.author_nickname || 'Anonymous')}</div>
            <div class="post-date">${formatDate(post.created_at)}</div>
          </div>
        </div>
        <h3 class="card-title">${escapeHtml(post.title)}</h3>
        <p class="card-content">${escapeHtml(truncateText(post.content, 150))}</p>
        <div class="card-footer">
          ${canEdit ? `
            <button class="card-action action-edit" data-id="${post.id}" data-title="${escapeAttr(post.title)}" data-content="${escapeAttr(post.content)}" title="Edit">
              ✏️ Edit
            </button>
            <button class="card-action action-delete" data-id="${post.id}" title="Delete">
              🗑️ Delete
            </button>
          ` : ''}
        </div>
      `;

      // Click on card to view full post (but not on action buttons)
      card.addEventListener('click', function (e) {
        if (e.target.closest('.card-action')) return;
        renderPostDetail(post);
      });

      container.appendChild(card);
    });
  }

  function renderPostDetail(post) {
    const modal = document.getElementById('post-detail-modal');
    if (!modal) return;

    const detailContainer = document.getElementById('post-detail-content');
    if (!detailContainer) return;

    const avatarUrl = window.Auth.getAvatarUrl(post.author_avatar) || window.Auth.defaultAvatarSvg();

    const createdTime = new Date(post.created_at).getTime();
    const updatedTime = new Date(post.updated_at).getTime();
    const isEdited = post.updated_at && Math.abs(updatedTime - createdTime) > 2000;

    detailContainer.innerHTML = `
      <div class="post-detail">
        <div class="detail-header">
          <img class="detail-avatar" src="${escapeAttr(avatarUrl)}" alt="${escapeAttr(post.author_nickname || 'User')}" onerror="this.src='${window.Auth.defaultAvatarSvg()}'">
          <div>
            <div class="detail-author-name">${escapeHtml(post.author_nickname || 'Anonymous')}</div>
            <div class="detail-date">${formatDate(post.created_at)}${isEdited ? ' (đã chỉnh sửa)' : ''}</div>
          </div>
        </div>
        <h2 class="detail-title">${escapeHtml(post.title)}</h2>
        <div class="detail-content">${escapeHtml(post.content)}</div>
      </div>
    `;

    window.openModal('post-detail-modal');
  }

  /* ---------- Empty / Loading States ---------- */

  function showEmptyState(container, title, text) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <h3 class="empty-title">${title || 'No posts yet'}</h3>
        <p class="empty-text">${text || 'Be the first to share your thoughts with the community!'}</p>
      </div>
    `;
  }

  function showSkeletonLoading(container) {
    let html = '';
    for (let i = 0; i < 6; i++) {
      html += `
        <div class="skeleton-card" style="animation-delay: ${i * 0.1}s">
          <div class="skeleton-header">
            <div class="skeleton-avatar"></div>
            <div style="flex:1">
              <div class="skeleton-line w-40 h-16"></div>
              <div class="skeleton-line w-60" style="margin-top:6px"></div>
            </div>
          </div>
          <div class="skeleton-line w-80 h-20"></div>
          <div class="skeleton-line w-100"></div>
          <div class="skeleton-line w-100"></div>
          <div class="skeleton-line w-60"></div>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  /* ---------- Utilities ---------- */

  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      let cleanDateString = dateString;
      if (dateString) {
        const parts = dateString.split('T');
        if (parts.length === 2) {
          const timePart = parts[1];
          if (!timePart.includes('Z') && !timePart.includes('+') && !timePart.includes('-')) {
            cleanDateString = dateString + 'Z';
          }
        }
      }
      const date = new Date(cleanDateString);
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'Vừa xong';
      if (diffMin < 60) return `${diffMin} phút trước`;
      if (diffHour < 24) return `${diffHour} giờ trước`;
      if (diffDay < 7) return `${diffDay} ngày trước`;

      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  function truncateText(text, maxLen) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen).trim() + '…';
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ---------- Expose ---------- */

  window.Blog = {
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    renderPosts,
    renderPostDetail,
    formatDate,
  };
})();
