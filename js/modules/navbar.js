(function () {
  'use strict';

  var notifications = [
    { id: 1, icon: 'check-circle', type: 'resolved', title: 'Ticket #RSV-2398 Resolved', desc: 'Your ticket regarding VPN connectivity has been resolved.', time: '2 min ago', unread: true },
    { id: 2, icon: 'clock', type: 'pending', title: 'Ticket Under Review', desc: 'Your ticket #RSV-2402 is currently being reviewed.', time: '1 hour ago', unread: true },
    { id: 3, icon: 'bot', type: 'ai', title: 'AI Suggestion Available', desc: 'AI Assistant suggested a solution for your VPN issue.', time: '3 hours ago', unread: true },
    { id: 4, icon: 'shield', type: 'security', title: 'Password Changed', desc: 'Your password was changed successfully.', time: 'Yesterday', unread: false },
    { id: 5, icon: 'user-check', type: 'profile', title: 'Profile Updated', desc: 'Your profile information was updated successfully.', time: 'Yesterday', unread: false },
    { id: 6, icon: 'message-square', type: 'reply', title: 'New Reply on Ticket', desc: 'A reply has been added to your support ticket #RSV-2385.', time: '2 days ago', unread: false },
    { id: 7, icon: 'arrow-up', type: 'priority', title: 'Ticket Priority Changed', desc: 'The priority of ticket #RSV-2372 has been changed to High.', time: '3 days ago', unread: false },
    { id: 8, icon: 'check-circle', type: 'closed', title: 'Ticket Closed', desc: 'Ticket #RSV-2360 has been closed successfully.', time: '5 days ago', unread: false },
    { id: 9, icon: 'clock', type: 'maintenance', title: 'Maintenance Reminder', desc: 'Scheduled maintenance is planned for this weekend.', time: '6 days ago', unread: false },
    { id: 10, icon: 'bell', type: 'welcome', title: 'Welcome to ResolveOne', desc: 'Welcome aboard! Get started with AI-powered support.', time: '1 week ago', unread: false }
  ];

  var els = {};
  var THEME_KEY = 'rs-theme';

  function qs(s, c) { return (c || document).querySelector(s); }

  function getSession() {
    function norm(data) {
      if (!data || !data.token) return null;
      var u = data.user || {};
      var name = u.full_name || u.name || data.name || u.email || data.email || '';
      return { token: data.token, email: u.email || data.email || '', name: name, full_name: name, role: u.role || data.role || '', avatar_initials: u.avatar_initials || data.avatar_initials || '' };
    }
    try {
      var raw = localStorage.getItem('rs_session_v2');
      if (raw) {
        var n = norm(JSON.parse(raw));
        if (n) return n;
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem('resolveone_session');
      if (raw) {
        var data = JSON.parse(raw);
        var n2 = norm(data);
        if (n2) return n2;
        if (data && data.email) return { token: data.token || '', email: data.email, name: data.name || data.email, full_name: data.name || data.email, role: data.role || '', avatar_initials: data.avatar_initials || '' };
      }
    } catch (e) {}
    return null;
  }

  function init() {
    cacheEls();
    var session = getSession();
    if (!session || !session.email) {
      if (!window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return;
      }
    }
    renderNavForRole(session);
    renderNotifications();
    bindEvents();
    updateBadge();
    applyStoredTheme();
    showAdminOnly(session);
  }

  function renderNavForRole(session) {
    session = session || getSession();
    if (!session) return;
    syncProfile(session);
    if (session.role === 'admin') {
      injectAdminNav(session);
    } else if (session.role === 'support_engineer' || session.role === 'engineer') {
      injectEngineerNav(session);
    }
  }

  function injectEngineerNav(session) {
    if (!session) return;
    if (session.role !== 'support_engineer' && session.role !== 'engineer') return;
    var navLinks = qs('[data-nav-links]');
    if (!navLinks) return;
    if (navLinks.querySelector('[data-nav-engineer]')) return;

    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var engineerLinks = [
      { href: 'engineer-dashboard.html', icon: 'layout-dashboard', label: 'Dashboard' },
      { href: 'engineer-tickets.html', icon: 'ticket', label: 'Open Tickets' },
      { href: 'engineer-resolution.html', icon: 'clipboard-check', label: 'Resolution' },
      { href: 'reports.html', icon: 'bar-chart-3', label: 'Reports' }
    ];

    navLinks.innerHTML = '';
    navLinks.setAttribute('data-nav-engineer', '');

    engineerLinks.forEach(function (link) {
      var a = document.createElement('a');
      a.href = link.href;
      a.className = 'navbar-link';
      a.setAttribute('role', 'menuitem');
      if (link.href === currentPage) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
      a.innerHTML = '<i data-lucide="' + link.icon + '" size="16"></i> ' + link.label;
      navLinks.appendChild(a);
    });

    var brandSub = qs('.navbar-brand-sub');
    if (brandSub) brandSub.textContent = 'Engineer Portal';

    var logo = qs('.navbar-logo');
    if (logo && logo.tagName.toLowerCase() === 'div') {
      var a = document.createElement('a');
      a.className = 'navbar-logo';
      a.href = 'engineer-dashboard.html';
      a.setAttribute('aria-hidden', 'true');
      a.setAttribute('style', 'text-decoration:none;color:#fff;display:flex;align-items:center;justify-content:center;');
      a.textContent = logo.textContent;
      logo.parentNode.replaceChild(a, logo);
    }

    removeHelpCenterLink();

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function injectAdminNav(session) {
    if (!session || session.role !== 'admin') return;
    var navLinks = qs('[data-nav-links]');
    if (!navLinks) return;

    var currentPage = window.location.pathname.split('/').pop() || 'index.html';

    var adminLinks = [
      { href: 'index.html', icon: 'home', label: 'Home' },
      { href: 'tickets.html', icon: 'ticket', label: 'Ticket Management' },
      { href: 'users.html', icon: 'users', label: 'Users' },
      { href: 'knowledge-base-admin.html', icon: 'book-open', label: 'Knowledge Base Management' },
      { href: 'reports.html', icon: 'bar-chart-3', label: 'Reports' },
      { href: 'settings.html', icon: 'settings', label: 'Settings' },
    ];

    navLinks.innerHTML = '';

    adminLinks.forEach(function (link) {
      var a = document.createElement('a');
      a.href = link.href;
      a.className = 'navbar-link';
      a.setAttribute('role', 'menuitem');
      if (link.href === currentPage) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
      a.innerHTML = '<i data-lucide="' + link.icon + '" size="16"></i> ' + link.label;
      navLinks.appendChild(a);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();

    removeHelpCenterLink();

    var dropUserCard = qs('.dropdown-user-card');
    if (dropUserCard) {
      var badge = document.createElement('div');
      badge.className = 'dropdown-user-role-badge';
      badge.textContent = 'Admin';
      badge.style.cssText = 'font-size:0.6875rem;font-weight:600;color:var(--color-primary);margin-top:2px;';
      var info = dropUserCard.querySelector('.dropdown-user-info');
      if (info) info.appendChild(badge);
    }
  }

  function removeHelpCenterLink() {
    var help = null;
    document.querySelectorAll('.dropdown-item').forEach(function (it) {
      if ((it.getAttribute('href') || '').indexOf('help-center.html') !== -1) help = it;
    });
    if (!help || !help.parentNode) return;
    var prev = help.previousElementSibling;
    var next = help.nextElementSibling;
    help.parentNode.removeChild(help);
    if (prev && prev.classList.contains('dropdown-divider')) prev.parentNode.removeChild(prev);
    else if (next && next.classList.contains('dropdown-divider')) next.parentNode.removeChild(next);
  }

  function showAdminOnly(session) {
    if (!session || session.role !== 'admin') return;
    var els = document.querySelectorAll('[data-admin-only]');
    els.forEach(function (el) { el.style.display = ''; });
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
  }

  /* ─── Theme ─── */
  function applyStoredTheme() {
    var theme = 'light';
    try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(theme);
    syncThemeButtons();
  }

  function applyTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }

  function setTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    applyTheme(resolved);
    syncThemeButtons();
  }

  function syncThemeButtons() {
    var stored = 'light';
    try { stored = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
    var btns = document.querySelectorAll('[data-theme-option]');
    btns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme-option') === stored);
    });
  }

  /* ─── Profile Sync (single source of truth = the authenticated session) ─── */
  function syncProfile(session) {
    if (!session) return;
    var name = session.full_name || session.name || session.email || '';
    var email = session.email || '';
    var initials = session.avatar_initials || getInitials(name) || (email ? getInitials(email.split('@')[0].replace(/[._-]+/g, ' ')) : '');

    var navAvatar = qs('.navbar-profile-avatar');
    var dropAvatar = qs('.dropdown-user-avatar');
    var navName = qs('.navbar-profile-name');
    var dropName = qs('.dropdown-user-name');
    var dropEmail = qs('.dropdown-user-email');

    var avatarUrl = '';
    try {
      var raw = localStorage.getItem('resolveone_profile');
      if (raw) {
        var prof = JSON.parse(raw);
        if (prof && prof.email && email && prof.email.toLowerCase() === email.toLowerCase() && prof.avatar) avatarUrl = prof.avatar;
      }
    } catch (e) {}

    [navAvatar, dropAvatar].forEach(function (el) {
      if (!el) return;
      el.style.backgroundImage = avatarUrl ? 'url(' + avatarUrl + ')' : '';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.textContent = avatarUrl ? '' : initials;
    });

    if (navName) navName.textContent = name;
    if (dropName) dropName.textContent = name;
    if (dropEmail) dropEmail.textContent = email;
  }

  function getInitials(name) {
    if (!name) return '';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  /* ─── Notifications ─── */
  function renderNotifications() {
    if (!els.notifList) return;
    if (notifications.length === 0) {
      els.notifList.innerHTML = '<div class="notif-empty">No notifications yet</div>';
      return;
    }
    var html = '';
    notifications.forEach(function (n) {
      html +=
        '<div class="notif-item' + (n.unread ? ' unread' : '') + '" data-notif-id="' + n.id + '">' +
          '<div class="notif-icon ' + n.type + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + getIconPath(n.icon) + '</svg>' +
          '</div>' +
          '<div class="notif-content">' +
            '<div class="notif-title">' + escapeHtml(n.title) + '</div>' +
            '<div class="notif-desc">' + escapeHtml(n.desc) + '</div>' +
            '<span class="notif-time">' + n.time + '</span>' +
          '</div>' +
          (n.unread ? '<div class="notif-unread-dot"></div>' : '') +
        '</div>';
    });
    els.notifList.innerHTML = html;
  }

  function getIconPath(name) {
    var paths = {
      'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      'bot': '<path d="M12 8V4m0 4a2 2 0 0 1 2 2v2a2 2 0 0 1-4 0v-2a2 2 0 0 1 2-2z"/><rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 18h8"/><path d="M8 14h1"/><path d="M15 14h1"/>',
      'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      'user-check': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
      'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      'arrow-up': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
      'bell': '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'
    };
    return paths[name] || '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  function updateBadge() {
    if (!els.notifBadge) return;
    var count = notifications.filter(function (n) { return n.unread; }).length;
    if (count > 0) {
      els.notifBadge.textContent = count;
      els.notifBadge.style.display = '';
    } else {
      els.notifBadge.style.display = 'none';
    }
  }

  function toggleDropdown(el) {
    if (!el) return;
    var isOpen = el.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) el.classList.add('open');
  }

  function closeAllDropdowns() {
    var open = document.querySelectorAll('.navbar-dropdown.open');
    open.forEach(function (d) { d.classList.remove('open'); });
  }

  function bindEvents() {
    if (els.notifToggle && els.notifDropdown) {
      els.notifToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDropdown(els.notifDropdown);
      });
    }

    if (els.profileToggle && els.profileDropdown) {
      els.profileToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDropdown(els.profileDropdown);
      });
    }

    if (els.notifList) {
      els.notifList.addEventListener('click', function (e) {
        var item = e.target.closest('.notif-item');
        if (!item) return;
        var id = parseInt(item.getAttribute('data-notif-id'), 10);
        markRead(id);
      });
    }

    if (els.markRead) {
      els.markRead.addEventListener('click', function (e) {
        e.stopPropagation();
        markAllRead();
      });
    }

    if (els.logoutBtn) {
      els.logoutBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAllDropdowns();
        openModal();
      });
    }

    if (els.themeToggle) {
      els.themeToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        if (els.themeSubmenu) {
          els.themeSubmenu.classList.toggle('open');
        }
      });
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

    if (els.modalCancel) {
      els.modalCancel.addEventListener('click', closeModal);
    }

    if (els.modalConfirm) {
      els.modalConfirm.addEventListener('click', function () {
        if (window.ResolveOneSession) {
          window.ResolveOneSession.clearSession();
        } else {
          localStorage.removeItem('resolveone_session');
          localStorage.removeItem('rs_session_v2');
        }
        localStorage.removeItem('auth');
        window.location.href = 'login.html';
      });
    }

    document.addEventListener('click', function (e) {
      var wraps = document.querySelectorAll('.navbar-dropdown-wrap');
      var inWrap = false;
      wraps.forEach(function (w) {
        if (w.contains(e.target)) inWrap = true;
      });
      if (!inWrap) {
        closeAllDropdowns();
        if (els.themeSubmenu) els.themeSubmenu.classList.remove('open');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeAllDropdowns();
        closeModal();
      }
    });

    if (els.modalOverlay) {
      els.modalOverlay.addEventListener('click', function (e) {
        if (e.target === els.modalOverlay) closeModal();
      });
    }
  }

  function markRead(id) {
    var n = null;
    for (var i = 0; i < notifications.length; i++) {
      if (notifications[i].id === id) { n = notifications[i]; break; }
    }
    if (n) {
      n.unread = false;
      renderNotifications();
      updateBadge();
    }
  }

  function markAllRead() {
    notifications.forEach(function (n) { n.unread = false; });
    renderNotifications();
    updateBadge();
  }

  function openModal() {
    if (els.modalOverlay) els.modalOverlay.classList.add('open');
  }

  function closeModal() {
    if (els.modalOverlay) els.modalOverlay.classList.remove('open');
  }

  window.NavbarModule = { init: init, syncProfile: syncProfile, renderNavForRole: renderNavForRole, getSession: getSession };
})();
