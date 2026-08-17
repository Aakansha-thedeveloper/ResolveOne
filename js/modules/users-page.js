(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';
  var users = [];
  var editingUserId = null;
  var deleteUserId = null;
  var detailUserId = null;
  var searchTimer = null;

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  function init() {
    loadUsers();
    bindUI();
  }

  function bindUI() {
    // Refresh
    qs('[data-um-refresh-btn]').addEventListener('click', function () {
      loadUsers();
      toast('Users refreshed', 'success');
    });

    // Add user
    qs('[data-um-add-btn]').addEventListener('click', function () { openAddModal(); });
    qs('[data-um-modal-close]').addEventListener('click', closeAddModal);
    qs('[data-um-modal-cancel]').addEventListener('click', closeAddModal);
    qs('[data-um-modal-save]').addEventListener('click', saveUser);

    // Delete
    qs('[data-um-delete-cancel]').addEventListener('click', closeDeleteModal);
    qs('[data-um-delete-confirm]').addEventListener('click', confirmDelete);

    // Detail
    qs('[data-um-detail-close]').addEventListener('click', closeDetailModal);
    qs('[data-um-detail-close-btn]').addEventListener('click', closeDetailModal);
    qs('[data-um-detail-edit-btn]').addEventListener('click', function () {
      if (detailUserId) { closeDetailModal(); openEditModal(detailUserId); }
    });

    // Search with debounce
    qs('[data-um-search]').addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadUsers, 250);
    });

    // Filter selects
    qsa('.um-filter-select').forEach(function (sel) {
      sel.addEventListener('change', loadUsers);
    });
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem('resolveone_session') || '{}'); } catch (e) { return {}; }
  }

  function getParams() {
    var search = qs('[data-um-search]').value.trim();
    var role = qs('[data-um-filter-role]').value;
    var status = qs('[data-um-filter-status]').value;
    var dept = qs('[data-um-filter-dept]').value;
    var params = new URLSearchParams();
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    if (dept) params.set('department', dept);
    return params.toString();
  }

  function loadUsers() {
    var session = getSession();
    showLoading();
    fetch(API_BASE + '/api/users?' + getParams(), {
      headers: { 'X-User-Role': session.role || 'user' }
    })
      .then(function (r) {
        if (r.status === 403) { window.location.href = 'index.html'; return null; }
        return r.json();
      })
      .then(function (data) {
        if (data) { users = data || []; render(); updateStats(); }
      })
      .catch(function () {
        qs('[data-um-body]').innerHTML =
          '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--color-text);font-size:0.8125rem;">Failed to load users. Check your connection.</td></tr>';
      });
  }

  function showLoading() {
    var html = '';
    for (var i = 0; i < 5; i++) {
      html += '<tr class="um-loading"><td><div class="um-shimmer"></div></td><td><div class="um-shimmer um-shimmer--sm"></div></td><td><div class="um-shimmer um-shimmer--sm"></div></td><td><div class="um-shimmer um-shimmer--sm"></div></td><td><div class="um-shimmer um-shimmer--sm"></div></td><td><div class="um-shimmer um-shimmer--sm" style="margin-left:auto;"></div></td></tr>';
    }
    qs('[data-um-body]').innerHTML = html;
    qs('[data-um-empty]').style.display = 'none';
  }

  function render() {
    var tbody = qs('[data-um-body]');
    var empty = qs('[data-um-empty]');

    if (users.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';

    var html = '';
    users.forEach(function (u) {
      var initials = u.avatar_initials || '';
      if (!initials && u.name) {
        var parts = u.name.trim().split(/\s+/);
        initials = (parts[0][0] || '') + (parts.length > 1 ? parts[1][0] : '').toUpperCase();
      }
      initials = initials.toUpperCase() || '?';

      var avatarClass = u.role === 'admin' ? 'um-avatar--admin' : u.role === 'agent' ? 'um-avatar--agent' : 'um-avatar--user';
      var badgeClass = 'um-badge--' + u.role;
      var statusDot = 'um-status-dot--' + (u.status || 'active');
      var statusBadge = 'um-badge--' + (u.status || 'active');

      var statusLabel = (u.status || 'active');
      statusLabel = statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1);

      var createdStr = '';
      if (u.created_at) {
        try { createdStr = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { createdStr = u.created_at; }
      }

      html += '<tr>' +
        '<td><div class="um-user-cell"><div class="um-avatar ' + avatarClass + '">' + initials + '</div><div><span class="um-user-name">' + esc(u.name) + '</span><span class="um-user-email">' + esc(u.email) + '</span></div></div></td>' +
        '<td>' + esc(u.department || '-') + '</td>' +
        '<td><span class="um-badge ' + badgeClass + '">' + esc(u.role.charAt(0).toUpperCase() + u.role.slice(1)) + '</span></td>' +
        '<td><span class="um-badge ' + statusBadge + '"><span class="um-status-dot ' + statusDot + '"></span> ' + statusLabel + '</span></td>' +
        '<td class="um-no-wrap" style="font-size:0.75rem;color:var(--color-text);opacity:.7;">' + createdStr + '</td>' +
        '<td style="text-align:right;white-space:nowrap;">' +
          '<button class="um-action-btn um-action-btn--view" data-um-view="' + u.id + '" title="View details"><i data-lucide="eye" size="15"></i></button>' +
          '<button class="um-action-btn um-action-btn--edit" data-um-edit="' + u.id + '" title="Edit user"><i data-lucide="pencil" size="15"></i></button>' +
          '<button class="um-action-btn um-action-btn--delete" data-um-delete="' + u.id + '" title="Delete user"><i data-lucide="trash-2" size="15"></i></button>' +
        '</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;

    // Recreate lucide icons for action buttons
    if (window.lucide) lucide.createIcons();

    // Bind row actions
    tbody.querySelectorAll('[data-um-view]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDetailModal(parseInt(btn.getAttribute('data-um-view'), 10)); });
    });
    tbody.querySelectorAll('[data-um-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openEditModal(parseInt(btn.getAttribute('data-um-edit'), 10)); });
    });
    tbody.querySelectorAll('[data-um-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDeleteModal(parseInt(btn.getAttribute('data-um-delete'), 10)); });
    });
  }

  function updateStats() {
    var total = users.length;
    var active = 0, inactive = 0, admins = 0;
    users.forEach(function (u) {
      if (u.status === 'active') active++;
      else if (u.status === 'inactive' || u.status === 'locked') inactive++;
      if (u.role === 'admin') admins++;
    });
    qs('[data-um-stat-total]').textContent = total;
    qs('[data-um-stat-active]').textContent = active;
    qs('[data-um-stat-inactive]').textContent = inactive;
    qs('[data-um-stat-admin]').textContent = admins;
  }

  // ─── Add / Edit Modal ───

  function openAddModal() {
    editingUserId = null;
    qs('[data-um-modal-title]').textContent = 'Add User';
    qs('[data-um-field-name]').value = '';
    qs('[data-um-field-email]').value = '';
    qs('[data-um-field-phone]').value = '';
    qs('[data-um-field-dept]').value = '';
    qs('[data-um-field-role]').value = 'user';
    qs('[data-um-field-status]').value = 'active';
    qs('[data-um-field-password]').value = '';
    qs('[data-um-modal-overlay]').style.display = '';
    qs('[data-um-field-name]').focus();
  }

  function openEditModal(id) {
    var u = getUserById(id);
    if (!u) return;
    editingUserId = id;
    qs('[data-um-modal-title]').textContent = 'Edit User';
    qs('[data-um-field-name]').value = u.name || '';
    qs('[data-um-field-email]').value = u.email || '';
    qs('[data-um-field-phone]').value = u.phone || '';
    qs('[data-um-field-dept]').value = u.department || '';
    qs('[data-um-field-role]').value = u.role || 'user';
    qs('[data-um-field-status]').value = u.status || 'active';
    qs('[data-um-field-password]').value = '';
    qs('[data-um-modal-overlay]').style.display = '';
    qs('[data-um-field-name]').focus();
  }

  function closeAddModal() {
    qs('[data-um-modal-overlay]').style.display = 'none';
  }

  // ─── Detail Modal ───

  function openDetailModal(id) {
    var u = getUserById(id);
    if (!u) { toast('User not found', 'error'); return; }
    detailUserId = id;

    var initials = u.avatar_initials || '';
    if (!initials && u.name) {
      var parts = u.name.trim().split(/\s+/);
      initials = (parts[0][0] || '') + (parts.length > 1 ? parts[1][0] : '').toUpperCase();
    }
    initials = initials.toUpperCase() || '?';
    var avatarBg = u.role === 'admin' ? 'linear-gradient(135deg,#022B3A,#1F7A8C)' : u.role === 'agent' ? 'linear-gradient(135deg,#059669,#34d399)' : 'linear-gradient(135deg,#6366f1,#818cf8)';

    qs('[data-um-detail-avatar]').textContent = initials;
    qs('[data-um-detail-avatar]').style.background = avatarBg;
    qs('[data-um-detail-name]').textContent = u.name;
    qs('[data-um-detail-email]').textContent = u.email;
    qs('[data-um-detail-phone]').textContent = u.phone || '-';
    qs('[data-um-detail-dept]').textContent = u.department || '-';
    qs('[data-um-detail-role]').textContent = u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : '-';
    var statusStr = u.status || 'active';
    qs('[data-um-detail-status]').innerHTML = '<span class="um-badge um-badge--' + statusStr + '"><span class="um-status-dot um-status-dot--' + statusStr + '"></span> ' + statusStr.charAt(0).toUpperCase() + statusStr.slice(1) + '</span>';

    if (u.last_login) {
      try { qs('[data-um-detail-login]').textContent = new Date(u.last_login).toLocaleString(); } catch (e) { qs('[data-um-detail-login]').textContent = u.last_login; }
    } else {
      qs('[data-um-detail-login]').textContent = 'Never';
    }

    if (u.created_at) {
      try { qs('[data-um-detail-created]').textContent = new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch (e) { qs('[data-um-detail-created]').textContent = u.created_at; }
    } else {
      qs('[data-um-detail-created]').textContent = '-';
    }

    // Ticket counts
    var tc = u.ticket_counts || {};
    qs('[data-um-detail-tickets-total]').textContent = tc.total || 0;
    qs('[data-um-detail-tickets-open]').textContent = tc.open || 0;
    qs('[data-um-detail-tickets-resolved]').textContent = tc.resolved || 0;

    // Load activity
    loadUserActivity(id);

    qs('[data-um-detail-overlay]').style.display = '';
  }

  function closeDetailModal() {
    qs('[data-um-detail-overlay]').style.display = 'none';
    detailUserId = null;
  }

  function loadUserActivity(id) {
    var list = qs('[data-um-activity-list]');
    list.innerHTML = '<div class="um-activity-empty"><i data-lucide="loader" size="16" style="display:inline-block;animation:spin .8s linear infinite;margin-right:6px;"></i> Loading activity...</div>';
    if (window.lucide) lucide.createIcons();

    var session = getSession();
    fetch(API_BASE + '/api/users/' + id + '/activity', {
      headers: { 'X-User-Role': session.role || 'user' }
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then(function (activities) {
        if (!activities || activities.length === 0) {
          list.innerHTML = '<div class="um-activity-empty">No recent activity found.</div>';
          return;
        }
        var html = '';
        activities.forEach(function (a) {
          var timeStr = '';
          if (a.timestamp) {
            try { timeStr = new Date(a.timestamp).toLocaleString(); } catch (e) { timeStr = a.timestamp; }
          }
          html +=
            '<div class="um-activity-item">' +
              '<div class="um-activity-dot"></div>' +
              '<div class="um-activity-content">' +
                '<span class="um-activity-action">' + esc(a.action) + '</span>' +
                (a.detail ? '<span class="um-activity-detail">' + esc(a.detail) + '</span>' : '') +
                (timeStr ? '<span class="um-activity-time">' + timeStr + '</span>' : '') +
              '</div>' +
            '</div>';
        });
        list.innerHTML = html;
      })
      .catch(function () {
        list.innerHTML = '<div class="um-activity-empty">Failed to load activity.</div>';
      });
  }

  // ─── Delete Modal ───

  function openDeleteModal(id) {
    var u = getUserById(id);
    if (!u) return;
    deleteUserId = id;
    qs('[data-um-delete-name]').textContent = u.name;
    qs('[data-um-delete-overlay]').style.display = '';
  }

  function closeDeleteModal() {
    qs('[data-um-delete-overlay]').style.display = 'none';
    deleteUserId = null;
  }

  function confirmDelete() {
    if (!deleteUserId) return;
    var session = getSession();
    var id = deleteUserId;
    closeDeleteModal();

    fetch(API_BASE + '/api/users/' + id, {
      method: 'DELETE',
      headers: { 'X-User-Role': session.role || 'user' },
    })
      .then(function (r) {
        if (!r.ok) { return r.text().then(function (body) { throw new Error('Delete failed (' + r.status + ')'); }); }
        toast('User deleted successfully', 'success');
        loadUsers();
      })
      .catch(function (e) {
        toast('Failed to delete user: ' + e.message, 'error');
        loadUsers();
      });
  }

  // ─── Save ───

  function saveUser() {
    var name = qs('[data-um-field-name]').value.trim();
    var email = qs('[data-um-field-email]').value.trim();
    if (!name || !email) {
      toast('Name and email are required', 'error');
      return;
    }

    var payload = {
      name: name,
      email: email,
      phone: qs('[data-um-field-phone]').value.trim(),
      department: qs('[data-um-field-dept]').value,
      role: qs('[data-um-field-role]').value,
      status: qs('[data-um-field-status]').value,
      password: qs('[data-um-field-password]').value.trim(),
    };

    var session = getSession();
    var url = editingUserId ? API_BASE + '/api/users/' + editingUserId : API_BASE + '/api/users';
    var method = editingUserId ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'X-User-Role': session.role || 'user' },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (!r.ok) {
          return r.text().then(function (body) {
            var msg = 'Save failed (' + r.status + ')';
            try {
              var parsed = JSON.parse(body);
              if (parsed.detail) msg = parsed.detail;
            } catch (_) {
              if (body && body.length < 200) msg = body.trim();
            }
            throw new Error(msg);
          });
        }
        return r.json();
      })
      .then(function () {
        closeAddModal();
        toast(editingUserId ? 'User updated successfully' : 'User created successfully', 'success');
        loadUsers();
      })
      .catch(function (e) {
        toast('Failed to save user: ' + e.message, 'error');
      });
  }

  // ─── Helpers ───

  function getUserById(id) {
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === id) return users[i];
    }
    return null;
  }

  function esc(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  // ─── Toast ───

  function toast(message, type) {
    type = type || 'info';
    var container = qs('[data-toast-container]');
    if (!container) return;
    var el = document.createElement('div');
    el.className = 'tp-toast tp-toast--' + type;
    var icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
    el.innerHTML = '<i data-lucide="' + icon + '" size="16"></i> ' + esc(message);
    container.appendChild(el);
    if (window.lucide) lucide.createIcons();
    setTimeout(function () {
      el.style.animation = 'tpToastOut .25s ease forwards';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
    }, 3000);
  }

  // Expose
  window.UsersPage = { init: init };
})();
