(function () {
  'use strict';

  var els = {};
  var THEME_KEY = 'rs-theme';

  function qs(s, c) { return (c || document).querySelector(s); }

  function getSession() {
    try {
      var raw = localStorage.getItem('rs_session_v2');
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.token && data.user) {
          return { token: data.token, email: data.user.email, name: data.user.full_name || data.user.name || data.user.email, role: data.user.role };
        }
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem('resolveone_session');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function init() {
    cacheEls();
    var session = getSession();
    if (!session || !session.email) {
      if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
        window.location.href = 'login.html';
        return;
      }
    }
    syncProfile(session);
    bindEvents();
    applyStoredTheme();
  }

  function syncProfile(session) {
    if (!session) return;
    var name = session.name || session.email || 'Engineer';
    var initials = (session.name || 'EN').split(' ').map(function (s) { return s[0]; }).join('').toUpperCase().slice(0, 2);
    var avatarEl = qs('.navbar-profile-avatar');
    var nameEl = qs('.navbar-profile-name');
    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = name;
    var ddAvatar = qs('.dropdown-user-avatar');
    var ddName = qs('.dropdown-user-name');
    var ddEmail = qs('.dropdown-user-email');
    if (ddAvatar) ddAvatar.textContent = initials;
    if (ddName) ddName.textContent = name;
    if (ddEmail) ddEmail.textContent = session.email || '';
  }

  function cacheEls() {
    els.notifToggle = qs('[data-notif-toggle]');
    els.notifDropdown = qs('[data-notif-dropdown]');
    els.notifList = qs('[data-notif-list]');
    els.notifBadge = qs('[data-notif-count]');
    els.markRead = qs('[data-mark-read]');
    els.profileToggle = qs('[data-profile-toggle]');
    els.profileDropdown = qs('[data-profile-dropdown]');
    els.logoutBtn = qs('[data-logout-btn]');
    els.themeToggle = qs('[data-theme-toggle]');
    els.themeSubmenu = qs('[data-theme-submenu]');
    els.modalOverlay = qs('[data-modal-overlay]');
    els.modalCancel = qs('[data-modal-cancel]');
    els.modalConfirm = qs('[data-modal-confirm]');
    els.navToggle = qs('[data-nav-toggle]');
    els.navLinks = qs('[data-nav-links]');
  }

  function bindEvents() {
    if (els.profileToggle) {
      els.profileToggle.addEventListener('click', function (e) { e.stopPropagation(); toggleDropdown(els.profileDropdown); });
    }
    if (els.notifToggle) {
      els.notifToggle.addEventListener('click', function (e) { e.stopPropagation(); toggleDropdown(els.notifDropdown); });
    }
    if (els.markRead) {
      els.markRead.addEventListener('click', function () { markAllRead(); });
    }
    if (els.logoutBtn) {
      els.logoutBtn.addEventListener('click', function (e) { e.stopPropagation(); closeAllDropdowns(); openModal(); });
    }
    if (els.themeToggle) {
      els.themeToggle.addEventListener('click', function (e) { e.stopPropagation(); if (els.themeSubmenu) els.themeSubmenu.classList.toggle('open'); });
    }
    var themeOptions = document.querySelectorAll('[data-theme-option]');
    themeOptions.forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        var theme = opt.getAttribute('data-theme-option');
        setTheme(theme);
        themeOptions.forEach(function (o) { o.classList.remove('active'); });
        opt.classList.add('active');
        if (els.themeSubmenu) els.themeSubmenu.classList.remove('open');
      });
    });
    if (els.modalCancel) els.modalCancel.addEventListener('click', closeModal);
    if (els.modalConfirm) {
      els.modalConfirm.addEventListener('click', function () {
        if (window.ResolveOneSession) { window.ResolveOneSession.clearSession(); }
        else { localStorage.removeItem('resolveone_session'); localStorage.removeItem('rs_session_v2'); }
        localStorage.removeItem('auth');
        window.location.href = 'login.html';
      });
    }
    if (els.navToggle && els.navLinks) {
      els.navToggle.addEventListener('click', function () {
        var open = els.navLinks.classList.toggle('open');
        els.navToggle.setAttribute('aria-expanded', open);
      });
    }
    document.addEventListener('click', function (e) {
      var wraps = document.querySelectorAll('.navbar-dropdown-wrap');
      var inWrap = false;
      wraps.forEach(function (w) { if (w.contains(e.target)) inWrap = true; });
      if (!inWrap) { closeAllDropdowns(); if (els.themeSubmenu) els.themeSubmenu.classList.remove('open'); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAllDropdowns(); closeModal(); } });
    if (els.modalOverlay) els.modalOverlay.addEventListener('click', function (e) { if (e.target === els.modalOverlay) closeModal(); });
  }

  function toggleDropdown(el) { if (el) el.classList.toggle('open'); }

  function closeAllDropdowns() {
    document.querySelectorAll('.navbar-dropdown.open').forEach(function (d) { d.classList.remove('open'); });
  }

  function openModal() { if (els.modalOverlay) els.modalOverlay.classList.add('open'); }

  function closeModal() { if (els.modalOverlay) els.modalOverlay.classList.remove('open'); }

  function markAllRead() {
    var items = document.querySelectorAll('[data-notif-id]');
    items.forEach(function (i) { i.classList.remove('unread'); });
    if (els.notifBadge) els.notifBadge.textContent = '0';
  }

  function applyStoredTheme() {
    var theme = 'light';
    try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
    if (theme === 'system') theme = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    applyTheme(theme);
    syncThemeButtons();
  }

  function applyTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }

  function setTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    var resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : theme;
    applyTheme(resolved);
    syncThemeButtons();
  }

  function syncThemeButtons() {
    var stored = 'light';
    try { stored = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
    var btns = document.querySelectorAll('[data-theme-option]');
    btns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-theme-option') === stored); });
  }

  window.EngineerNavbar = { init: init };
})();