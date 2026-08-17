(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';
  var editing = false;
  var profileData = {};

  function qs(s) { return document.querySelector(s); }

  function init() {
    showSkeleton();
    loadProfile();
    bindEvents();
  }

  function showSkeleton() {
    var skel = qs('#ep-skeleton');
    var content = qs('#ep-content');
    if (skel) skel.style.display = 'block';
    if (content) content.style.display = 'none';
  }

  function hideSkeleton() {
    var skel = qs('#ep-skeleton');
    var content = qs('#ep-content');
    if (skel) skel.style.display = 'none';
    if (content) content.style.display = 'block';
  }

  function loadProfile() {
    var user = null;
    try { user = window.ResolveOneSession && window.ResolveOneSession.getUser(); } catch (e) {}

    if (!user) {
      hideSkeleton();
      return;
    }

    profileData = {
      id: user.id,
      name: user.full_name || user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      role: user.role || 'support_engineer',
      status: user.status || 'active',
      avatar_initials: user.avatar_initials || ''
    };

    var token = null;
    try { token = window.ResolveOneSession && window.ResolveOneSession.getToken(); } catch (e) {}

    if (token) {
      fetch(API_BASE + '/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(function (r) {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      }).then(function (data) {
        profileData = {
          id: data.id,
          name: data.full_name || data.name || profileData.name,
          email: data.email || profileData.email,
          phone: data.phone || profileData.phone || '',
          department: data.department || profileData.department || '',
          role: data.role || profileData.role,
          status: data.status || profileData.status || 'active',
          avatar_initials: data.avatar_initials || profileData.avatar_initials || '',
          last_login: data.last_login || '',
          created_at: data.created_at || ''
        };
        renderProfile();
      }).catch(function () {
        renderProfile();
      });
    } else {
      renderProfile();
    }
  }

  function renderProfile() {
    var initials = profileData.avatar_initials;
    if (!initials && profileData.name) {
      initials = profileData.name.split(' ').map(function (s) { return s[0]; }).join('').toUpperCase().slice(0, 2);
    }
    if (!initials) initials = 'EN';

    qs('[data-ep-avatar]').textContent = initials;
    qs('[data-ep-name]').textContent = profileData.name || 'Support Engineer';
    qs('[data-ep-email]').textContent = profileData.email || '';
    qs('[data-field-name]').textContent = profileData.name || '-';
    if (qs('[data-edit-name]')) qs('[data-edit-name]').value = profileData.name || '';
    qs('[data-field-empid]').textContent = profileData.id ? 'RSV-' + String(profileData.id).padStart(4, '0') : '-';
    qs('[data-field-email]').textContent = profileData.email || '-';
    qs('[data-field-phone]').textContent = profileData.phone || '-';
    if (qs('[data-edit-phone]')) qs('[data-edit-phone]').value = profileData.phone || '';
    qs('[data-field-dept]').textContent = profileData.department || '-';
    if (qs('[data-edit-dept]')) qs('[data-edit-dept]').value = profileData.department || '';
    qs('[data-field-role]').textContent = 'Support Engineer';

    var statusEl = qs('[data-field-status]');
    if (statusEl) {
      var s = (profileData.status || 'active').toLowerCase();
      statusEl.textContent = s === 'active' ? 'Active' : 'Inactive';
      statusEl.className = 'ep-status ' + (s === 'active' ? 'active' : 'inactive');
    }

    qs('[data-field-joined]').textContent = profileData.created_at ? formatDate(profileData.created_at) : '-';
    qs('[data-field-lastlogin]').textContent = profileData.last_login ? formatDate(profileData.last_login) : '-';

    hideSkeleton();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return dateStr; }
  }

  function toggleEdit(enable) {
    editing = enable;
    qs('[data-view-actions]').classList.toggle('ep-hidden', enable);
    qs('[data-edit-actions]').classList.toggle('ep-hidden', !enable);

    var fields = ['name', 'phone', 'dept'];
    fields.forEach(function (f) {
      var display = qs('[data-field-' + f + ']');
      var input = qs('[data-edit-' + f + ']');
      if (display) display.classList.toggle('ep-hidden', enable);
      if (input) input.classList.toggle('ep-hidden', !enable);
    });
  }

  function saveProfile() {
    var btn = qs('[data-save-btn]');
    if (btn) btn.classList.add('is-loading');

    var token = null;
    try { token = window.ResolveOneSession && window.ResolveOneSession.getToken(); } catch (e) {}

    if (!token || !profileData.id) {
      showToast('Authentication required', 'error');
      if (btn) btn.classList.remove('is-loading');
      return;
    }

    var payload = {
      name: (qs('[data-edit-name]') || {}).value || profileData.name,
      phone: (qs('[data-edit-phone]') || {}).value || '',
      department: (qs('[data-edit-dept]') || {}).value || ''
    };

    fetch(API_BASE + '/api/users/' + profileData.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('Update failed');
      return r.json();
    }).then(function (data) {
      profileData.name = payload.name;
      profileData.phone = payload.phone;
      profileData.department = payload.department;
      renderProfile();
      toggleEdit(false);
      showToast('Profile updated successfully', 'success');
    }).catch(function (err) {
      showToast('Failed to update profile: ' + (err.message || 'Unknown error'), 'error');
    }).finally(function () {
      if (btn) btn.classList.remove('is-loading');
    });
  }

  function changePassword() {
    var currentEl = qs('[data-pw-current]');
    var newEl = qs('[data-pw-new]');
    var confirmEl = qs('[data-pw-confirm]');

    var current = currentEl ? currentEl.value : '';
    var newPw = newEl ? newEl.value : '';
    var confirm = confirmEl ? confirmEl.value : '';

    if (!current || !newPw || !confirm) {
      showToast('Please fill in all password fields', 'error');
      return;
    }
    if (newPw.length < 8) {
      showToast('New password must be at least 8 characters', 'error');
      return;
    }
    if (newPw !== confirm) {
      showToast('New passwords do not match', 'error');
      return;
    }

    var btn = qs('[data-pw-btn]');
    if (btn) btn.classList.add('is-loading');

    var token = null;
    try { token = window.ResolveOneSession && window.ResolveOneSession.getToken(); } catch (e) {}

    if (!token || !profileData.id) {
      showToast('Authentication required', 'error');
      if (btn) btn.classList.remove('is-loading');
      return;
    }

    fetch(API_BASE + '/api/users/' + profileData.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ password: newPw })
    }).then(function (r) {
      if (!r.ok) throw new Error('Password update failed');
      return r.json();
    }).then(function () {
      if (currentEl) currentEl.value = '';
      if (newEl) newEl.value = '';
      if (confirmEl) confirmEl.value = '';
      showToast('Password updated successfully', 'success');
    }).catch(function (err) {
      showToast('Failed to update password: ' + (err.message || 'Unknown error'), 'error');
    }).finally(function () {
      if (btn) btn.classList.remove('is-loading');
    });
  }

  function bindEvents() {
    var editBtn = qs('[data-edit-btn]');
    if (editBtn) editBtn.addEventListener('click', function () { toggleEdit(true); });

    var cancelBtn = qs('[data-cancel-btn]');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { toggleEdit(false); });

    var saveBtn = qs('[data-save-btn]');
    if (saveBtn) saveBtn.addEventListener('click', saveProfile);

    var pwBtn = qs('[data-pw-btn]');
    if (pwBtn) pwBtn.addEventListener('click', changePassword);
  }

  function showToast(msg, type) {
    var el = qs('[data-ep-toast]');
    if (!el) return;
    el.textContent = msg;
    el.className = 'ep-toast ' + (type || 'success') + ' show';
    clearTimeout(el._timer);
    el._timer = setTimeout(function () {
      el.classList.remove('show');
    }, 3000);
  }

  window.EngineerProfile = { init: init };
})();