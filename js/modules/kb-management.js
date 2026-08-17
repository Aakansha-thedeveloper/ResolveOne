(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';

  function apiUrl(path) {
    return API_BASE + '/api/kb' + path;
  }

  var SESSION = (function () {
    try { return JSON.parse(localStorage.getItem('resolveone_session') || '{}'); } catch (e) { return {}; }
  })();

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'X-User-Role': SESSION.role || 'admin' };
  }

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  var state = {
    articles: [],
    total: 0,
    page: 1,
    totalPages: 0,
    perPage: 20,
    search: '',
    category: '',
    status: '',
    sort: 'updated_at',
    selected: [],
  };

  var editingId = null;

  /* ── Toast ── */
  function toast(msg, type) {
    type = type || 'info';
    var c = qs('[data-kbm-toast]');
    if (!c) return;
    var el = document.createElement('div');
    el.className = 'kbm-toast kbm-toast--' + type;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(function () {
      el.style.animation = 'kbmToastOut .25s ease forwards';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, 3000);
  }

  /* ── Confirm Dialog ── */
  function confirmDialog(title, msg) {
    return new Promise(function (resolve) {
      var overlay = qs('[data-kbm-confirm-overlay]');
      qs('[data-kbm-confirm-title]').textContent = title;
      qs('[data-kbm-confirm-message]').textContent = msg;
      overlay.classList.add('open');
      function cleanup() {
        overlay.classList.remove('open');
        qs('[data-kbm-confirm-ok]').removeEventListener('click', onOk);
        qs('[data-kbm-confirm-cancel]').removeEventListener('click', onCancel);
      }
      function onOk() { cleanup(); resolve(true); }
      function onCancel() { cleanup(); resolve(false); }
      qs('[data-kbm-confirm-ok]').addEventListener('click', onOk);
      qs('[data-kbm-confirm-cancel]').addEventListener('click', onCancel);
    });
  }

  /* ── Fetch wrapper ── */
  function apiFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign(authHeaders(), opts.headers || {});
    return fetch(apiUrl(path), opts).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.detail || 'Request failed'); });
      return r.json();
    });
  }

  /* ── Analytics / Stats ── */
  function loadStats() {
    fetch(apiUrl('/analytics'), { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var container = qs('[data-kbm-stats]');
        if (!container) return;
        container.innerHTML =
          '<div class="kbm-stat"><div class="kbm-stat-icon kbm-stat-icon--total"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M16 8.2C14.6 7.5 12.8 7 12 7c-.8 0-2.6.5-4 1.2"/></svg></div><div class="kbm-stat-info"><span class="kbm-stat-number">' + d.total + '</span><span class="kbm-stat-label">Total Articles</span></div></div>' +
          '<div class="kbm-stat"><div class="kbm-stat-icon kbm-stat-icon--published"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="kbm-stat-info"><span class="kbm-stat-number">' + d.published + '</span><span class="kbm-stat-label">Published</span></div></div>' +
          '<div class="kbm-stat"><div class="kbm-stat-icon kbm-stat-icon--draft"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div><div class="kbm-stat-info"><span class="kbm-stat-number">' + d.drafts + '</span><span class="kbm-stat-label">Drafts</span></div></div>' +
          '<div class="kbm-stat"><div class="kbm-stat-icon kbm-stat-icon--review"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="kbm-stat-info"><span class="kbm-stat-number">' + d.review_required + '</span><span class="kbm-stat-label">Review Needed</span></div></div>' +
          '<div class="kbm-stat"><div class="kbm-stat-icon kbm-stat-icon--archived"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg></div><div class="kbm-stat-info"><span class="kbm-stat-number">' + d.archived + '</span><span class="kbm-stat-label">Archived</span></div></div>' +
          '<div class="kbm-stat"><div class="kbm-stat-icon kbm-stat-icon--views"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div><div class="kbm-stat-info"><span class="kbm-stat-number">' + (d.total_views || 0).toLocaleString() + '</span><span class="kbm-stat-label">Total Views</span></div></div>';
      })
      .catch(function () {});
  }

  /* ── Load categories ── */
  function loadCategories() {
    fetch(apiUrl('/categories'), { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (cats) {
        var sel = qs('[data-kbm-filter-category]');
        if (!sel) return;
        var html = '<option value="">All Categories</option>';
        cats.forEach(function (c) {
          html += '<option value="' + esc(c.name) + '">' + esc(c.name) + ' (' + c.count + ')</option>';
        });
        sel.innerHTML = html;
        if (state.category) sel.value = state.category;
      })
      .catch(function () {});
  }

  /* ── Load articles ── */
  function loadArticles() {
    var wrap = qs('[data-kbm-table-wrap]');
    var empty = qs('[data-kbm-empty]');
    var loading = qs('[data-kbm-loading]');
    var body = qs('[data-kbm-table-body]');

    loading.style.display = '';
    if (wrap) wrap.style.display = 'none';
    if (empty) empty.style.display = 'none';
    if (body) body.innerHTML = '';

    var params = '?page=' + state.page + '&per_page=' + state.perPage + '&sort=' + encodeURIComponent(state.sort);
    if (state.search) params += '&search=' + encodeURIComponent(state.search);
    if (state.category) params += '&category=' + encodeURIComponent(state.category);
    if (state.status) params += '&status=' + encodeURIComponent(state.status);

    apiFetch(params)
      .then(function (data) {
        state.articles = data.articles || [];
        state.total = data.total || 0;
        state.totalPages = data.total_pages || 0;
        if (loading) loading.style.display = 'none';
        if (state.articles.length === 0) {
          if (wrap) wrap.style.display = 'none';
          if (empty) empty.style.display = '';
        } else {
          if (wrap) wrap.style.display = '';
          if (empty) empty.style.display = 'none';
          renderTable();
          renderPagination();
        }
        updateBulkBar();
      })
      .catch(function (err) {
        if (loading) loading.style.display = 'none';
        if (empty) {
          empty.style.display = '';
          empty.querySelector('h3').textContent = 'Failed to load articles';
          empty.querySelector('p').textContent = err.message || 'Connection error';
        }
      });
  }

  /* ── Render table ── */
  function renderTable() {
    var body = qs('[data-kbm-table-body]');
    if (!body) return;
    var html = '';
    state.articles.forEach(function (a) {
      var selected = state.selected.indexOf(a.id) !== -1;
      var statusClass = 'kbm-status--' + (a.status || 'draft');
      var statusLabel = (a.status || 'draft').replace(/_/g, ' ');
      var featured = a.is_featured
        ? '<span class="kbm-featured-badge"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Featured</span>'
        : '';
      html +=
        '<tr>' +
          '<td class="kbm-cell-check"><input type="checkbox" data-kbm-select="' + a.id + '"' + (selected ? ' checked' : '') + '></td>' +
          '<td><span class="kbm-cell-article">' + esc(a.article_number) + '</span></td>' +
          '<td><div class="kbm-cell-title">' + esc(a.title) + ' ' + featured + '</div><div class="kbm-cell-summary">' + esc(a.summary || '') + '</div></td>' +
          '<td>' + esc(a.category || '-') + '</td>' +
          '<td><span class="kbm-status ' + statusClass + '">' + esc(statusLabel) + '</span></td>' +
          '<td>' + esc(a.author || '-') + '</td>' +
          '<td>' + (a.views || 0).toLocaleString() + '</td>' +
          '<td>' + formatDate(a.updated_at) + '</td>' +
          '<td class="kbm-cell-actions">' +
            '<button class="btn btn-ghost btn-sm" data-kbm-edit="' + a.id + '" title="Edit"><i data-lucide="edit-3" size="14"></i></button>' +
            '<button class="btn btn-ghost btn-sm" style="color:var(--color-error);" data-kbm-delete="' + a.id + '" title="Delete"><i data-lucide="trash-2" size="14"></i></button>' +
          '</td>' +
        '</tr>';
    });
    body.innerHTML = html;
    lucide.createIcons();

    body.querySelectorAll('[data-kbm-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-kbm-edit'), 10);
        openEdit(id);
      });
    });

    body.querySelectorAll('[data-kbm-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-kbm-delete'), 10);
        deleteArticle(id);
      });
    });

    body.querySelectorAll('[data-kbm-select]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = parseInt(cb.getAttribute('data-kbm-select'), 10);
        if (cb.checked) {
          if (state.selected.indexOf(id) === -1) state.selected.push(id);
        } else {
          state.selected = state.selected.filter(function (s) { return s !== id; });
        }
        updateBulkBar();
        updateSelectAll();
      });
    });
  }

  /* ── Pagination ── */
  function renderPagination() {
    var info = qs('[data-kbm-pg-info]');
    var btns = qs('[data-kbm-pg-btns]');
    if (!info || !btns) return;
    if (state.totalPages <= 1) {
      info.textContent = state.total + ' article' + (state.total !== 1 ? 's' : '');
      btns.innerHTML = '';
      return;
    }
    info.textContent = 'Page ' + state.page + ' of ' + state.totalPages + ' (' + state.total + ' articles)';
    var html = '';
    html += '<button data-kbm-pg="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>‹ Prev</button>';
    var start = Math.max(1, state.page - 2);
    var end = Math.min(state.totalPages, state.page + 2);
    for (var i = start; i <= end; i++) {
      html += '<button data-kbm-pg="' + i + '" class="' + (i === state.page ? 'kbm-pg-active' : '') + '">' + i + '</button>';
    }
    html += '<button data-kbm-pg="' + (state.page + 1) + '"' + (state.page >= state.totalPages ? ' disabled' : '') + '>Next ›</button>';
    btns.innerHTML = html;

    btns.querySelectorAll('[data-kbm-pg]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pg = parseInt(btn.getAttribute('data-kbm-pg'), 10);
        if (pg < 1 || pg > state.totalPages || pg === state.page) return;
        state.page = pg;
        loadArticles();
      });
    });
  }

  /* ── Select All ── */
  function updateSelectAll() {
    var cb = qs('[data-kbm-select-all]');
    if (!cb) return;
    var totalCheckboxes = qsa('[data-kbm-select]').length;
    var checked = qsa('[data-kbm-select]:checked').length;
    cb.checked = totalCheckboxes > 0 && checked === totalCheckboxes;
    cb.indeterminate = checked > 0 && checked < totalCheckboxes;
  }

  /* ── Bulk bar ── */
  function updateBulkBar() {
    var bar = qs('[data-kbm-bulk-bar]');
    var count = qs('[data-kbm-bulk-count]');
    var apply = qs('[data-kbm-bulk-apply]');
    if (!bar || !count || !apply) return;
    if (state.selected.length === 0) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    count.textContent = state.selected.length + ' selected';
    apply.disabled = true;
  }

  /* ── Open slide panel (create / edit) ── */
  function openPanel(article) {
    editingId = article ? article.id : null;
    qs('[data-kbm-panel-title]').textContent = article ? 'Edit Article' : 'New Article';
    qs('[data-kbm-field-id]').value = article ? article.id : '';
    qs('[data-kbm-field-title]').value = article ? (article.title || '') : '';
    qs('[data-kbm-field-category]').value = article ? (article.category || '') : '';
    qs('[data-kbm-field-status]').value = article ? (article.status || 'draft') : 'draft';
    qs('[data-kbm-field-author]').value = article ? (article.author || '') : (SESSION.full_name || SESSION.name || '');
    qs('[data-kbm-field-summary]').value = article ? (article.summary || '') : '';
    qs('[data-kbm-field-problem]').value = article ? (article.problem || '') : '';
    qs('[data-kbm-field-root-cause]').value = article ? (article.root_cause || '') : '';
    qs('[data-kbm-field-solution]').value = article ? (article.solution || '') : '';
    qs('[data-kbm-field-tags]').value = article ? (article.tags || '') : '';
    qs('[data-kbm-field-reading-time]').value = article ? (article.reading_time || 5) : 5;
    qs('[data-kbm-field-featured]').checked = article ? !!article.is_featured : false;
    qs('[data-kbm-panel-overlay]').classList.add('open');
    qs('[data-kbm-slide-panel]').classList.add('open');
  }

  function closePanel() {
    qs('[data-kbm-panel-overlay]').classList.remove('open');
    qs('[data-kbm-slide-panel]').classList.remove('open');
    editingId = null;
  }

  /* ── Save article ── */
  function saveArticle() {
    var title = qs('[data-kbm-field-title]').value.trim();
    if (!title) {
      toast('Title is required', 'error');
      qs('[data-kbm-field-title]').focus();
      return;
    }
    var payload = {
      title: title,
      category: qs('[data-kbm-field-category]').value,
      status: qs('[data-kbm-field-status]').value,
      author: qs('[data-kbm-field-author]').value,
      summary: qs('[data-kbm-field-summary]').value,
      problem: qs('[data-kbm-field-problem]').value,
      root_cause: qs('[data-kbm-field-root-cause]').value,
      solution: qs('[data-kbm-field-solution]').value,
      tags: qs('[data-kbm-field-tags]').value,
      reading_time: parseInt(qs('[data-kbm-field-reading-time]').value, 10) || 5,
      is_featured: qs('[data-kbm-field-featured]').checked,
    };

    var url = editingId ? '/api/kb/' + editingId : '/api/kb';
    var method = editingId ? 'PUT' : 'POST';

    fetch(apiUrl(url), {
      method: method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw new Error(e.detail || 'Save failed'); });
        return r.json();
      })
      .then(function () {
        toast(editingId ? 'Article updated' : 'Article created', 'success');
        closePanel();
        loadArticles();
        loadStats();
        loadCategories();
      })
      .catch(function (err) {
        toast(err.message || 'Failed to save', 'error');
      });
  }

  /* ── Open edit ── */
  function openEdit(id) {
    var a = null;
    for (var i = 0; i < state.articles.length; i++) {
      if (state.articles[i].id === id) { a = state.articles[i]; break; }
    }
    if (a) {
      openPanel(a);
    } else {
      apiFetch('/' + id).then(function (article) {
        openPanel(article);
      }).catch(function (err) {
        toast(err.message || 'Failed to load article', 'error');
      });
    }
  }

  /* ── Delete article ── */
  function deleteArticle(id) {
    confirmDialog('Delete Article', 'Are you sure you want to delete this article? This action cannot be undone.')
      .then(function (confirmed) {
        if (!confirmed) return;
        apiFetch('/' + id, { method: 'DELETE' })
          .then(function () {
            toast('Article deleted', 'success');
            loadArticles();
            loadStats();
            loadCategories();
          })
          .catch(function (err) {
            toast(err.message || 'Failed to delete', 'error');
          });
      });
  }

  /* ── Bulk apply ── */
  function applyBulk() {
    var action = qs('[data-kbm-bulk-action]').value;
    if (!action || state.selected.length === 0) return;
    var msg = action === 'delete'
      ? 'Delete ' + state.selected.length + ' article(s)? This cannot be undone.'
      : (action.charAt(0).toUpperCase() + action.slice(1) + ' ' + state.selected.length + ' article(s)?');
    confirmDialog('Bulk Action', msg).then(function (confirmed) {
      if (!confirmed) return;
      var ids = state.selected.join(',');
      fetch(apiUrl('/bulk?action=' + encodeURIComponent(action) + '&ids=' + ids), {
        method: 'POST',
        headers: authHeaders(),
      })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (e) { throw new Error(e.detail || 'Bulk action failed'); });
          return r.json();
        })
        .then(function () {
          toast(state.selected.length + ' article(s) updated', 'success');
          state.selected = [];
          qs('[data-kbm-bulk-action]').value = '';
          updateBulkBar();
          loadArticles();
          loadStats();
        })
        .catch(function (err) {
          toast(err.message || 'Bulk action failed', 'error');
        });
    });
  }

  /* ── Helpers ── */
  function esc(s) {
    if (typeof s !== 'string') return s;
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '-';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      var now = new Date();
      var diff = (now - d) / 1000;
      if (diff < 60) return 'just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
      return d.toLocaleDateString();
    } catch (e) {
      return iso;
    }
  }

  /* ── Init ── */
  function init() {
    loadStats();
    loadCategories();
    loadArticles();

    /* Search */
    var searchInput = qs('[data-kbm-search]');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.search = searchInput.value;
        state.page = 1;
        clearTimeout(searchInput._timer);
        searchInput._timer = setTimeout(loadArticles, 300);
      });
    }

    /* Category filter */
    var catFilter = qs('[data-kbm-filter-category]');
    if (catFilter) {
      catFilter.addEventListener('change', function () {
        state.category = catFilter.value;
        state.page = 1;
        loadArticles();
      });
    }

    /* Status filter */
    var statusFilter = qs('[data-kbm-filter-status]');
    if (statusFilter) {
      statusFilter.addEventListener('change', function () {
        state.status = statusFilter.value;
        state.page = 1;
        loadArticles();
      });
    }

    /* Sort headers */
    qsa('[data-kbm-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-kbm-sort');
        if (state.sort === key) {
          state.sort = '-' + key;
        } else {
          state.sort = key;
        }
        qsa('[data-kbm-sort]').forEach(function (h) { h.classList.remove('kbm-sort-active'); });
        th.classList.add('kbm-sort-active');
        state.page = 1;
        loadArticles();
      });
    });

    /* Select All */
    var selectAll = qs('[data-kbm-select-all]');
    if (selectAll) {
      selectAll.addEventListener('change', function () {
        state.selected = [];
        if (selectAll.checked) {
          state.articles.forEach(function (a) { state.selected.push(a.id); });
        }
        qsa('[data-kbm-select]').forEach(function (cb) { cb.checked = selectAll.checked; });
        updateBulkBar();
      });
    }

    /* Bulk action */
    var bulkAction = qs('[data-kbm-bulk-action]');
    var bulkApply = qs('[data-kbm-bulk-apply]');
    if (bulkAction && bulkApply) {
      bulkAction.addEventListener('change', function () {
        bulkApply.disabled = !bulkAction.value || state.selected.length === 0;
      });
      bulkApply.addEventListener('click', applyBulk);
    }

    /* Add button */
    qs('[data-kbm-add]').addEventListener('click', function () { openPanel(null); });
    qs('[data-kbm-add-empty]').addEventListener('click', function () { openPanel(null); });

    /* Refresh */
    qs('[data-kbm-refresh]').addEventListener('click', function () {
      loadArticles();
      loadStats();
      loadCategories();
      toast('Refreshed', 'info');
    });

    /* Slide panel */
    qs('[data-kbm-panel-close]').addEventListener('click', closePanel);
    qs('[data-kbm-panel-overlay]').addEventListener('click', closePanel);
    qs('[data-kbm-panel-cancel]').addEventListener('click', closePanel);
    qs('[data-kbm-panel-save]').addEventListener('click', saveArticle);

    /* Keyboard shortcuts */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (qs('[data-kbm-slide-panel]').classList.contains('open')) closePanel();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (qs('[data-kbm-slide-panel]').classList.contains('open')) saveArticle();
      }
    });
  }

  window.KBManagement = { init: init };
})();
