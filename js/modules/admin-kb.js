(function () {
  'use strict';

  var articles = [];
  var editingId = null;

  function qs(s) { return document.querySelector(s); }

  function init() {
    var btn = qs('[data-admin-kb-manage]');
    if (!btn) return;
    btn.addEventListener('click', openManager);
    qs('[data-admin-kb-cancel]').addEventListener('click', closeManager);
    qs('[data-admin-kb-save]').addEventListener('click', saveArticle);
    qs('[data-admin-kb-add]').addEventListener('click', function () { openForm(null); });
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem('resolveone_session') || '{}'); } catch (e) { return {}; }
  }

  function openManager() {
    var overlay = qs('[data-admin-kb-overlay]');
    if (overlay) overlay.style.display = '';
    loadArticles();
  }

  function closeManager() {
    qs('[data-admin-kb-overlay]').style.display = 'none';
    qs('[data-admin-kb-form]').style.display = 'none';
  }

  function loadArticles() {
    fetch('/api/kb')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        articles = data || [];
        renderList();
      })
      .catch(function () {
        qs('[data-admin-kb-list]').innerHTML = '<p style="color:var(--color-text);">Failed to load articles.</p>';
      });
  }

  function renderList() {
    var list = qs('[data-admin-kb-list]');
    if (articles.length === 0) {
      list.innerHTML = '<p style="color:var(--color-text);">No articles yet.</p>';
      return;
    }
    var html = '';
    articles.forEach(function (a) {
      html +=
        '<div class="settings-card" style="margin-bottom:8px;padding:12px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div>' +
              '<strong>' + escapeHtml(a.title) + '</strong>' +
              '<span style="font-size:0.75rem;color:var(--color-text);margin-left:8px;">' + escapeHtml(a.category) + '</span>' +
            '</div>' +
            '<div>' +
              '<button class="btn btn-ghost btn-sm" data-kb-edit="' + a.id + '" style="padding:4px 8px;font-size:0.75rem;margin-right:4px;">Edit</button>' +
              '<button class="btn btn-ghost btn-sm" data-kb-delete="' + a.id + '" style="padding:4px 8px;font-size:0.75rem;color:var(--color-error);">Delete</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
    list.innerHTML = html;

    list.querySelectorAll('[data-kb-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-kb-edit'), 10);
        var a = null;
        for (var i = 0; i < articles.length; i++) {
          if (articles[i].id === id) { a = articles[i]; break; }
        }
        if (a) openForm(a);
      });
    });

    list.querySelectorAll('[data-kb-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-kb-delete'), 10);
        if (confirm('Delete this article?')) deleteArticle(id);
      });
    });
  }

  function openForm(article) {
    qs('[data-admin-kb-list-view]').style.display = 'none';
    qs('[data-admin-kb-form]').style.display = 'block';
    if (article) {
      editingId = article.id;
      qs('[data-kb-form-title]').textContent = 'Edit Article';
      qs('[data-kb-field-title]').value = article.title;
      qs('[data-kb-field-category]').value = article.category || '';
      qs('[data-kb-field-summary]').value = article.summary || '';
      qs('[data-kb-field-solution]').value = article.solution || '';
    } else {
      editingId = null;
      qs('[data-kb-form-title]').textContent = 'Add Article';
      qs('[data-kb-field-title]').value = '';
      qs('[data-kb-field-category]').value = '';
      qs('[data-kb-field-summary]').value = '';
      qs('[data-kb-field-solution]').value = '';
    }
  }

  function saveArticle() {
    var payload = {
      title: qs('[data-kb-field-title]').value,
      category: qs('[data-kb-field-category]').value,
      summary: qs('[data-kb-field-summary]').value,
      solution: qs('[data-kb-field-solution]').value,
    };

    var session = getSession();
    var url = editingId ? '/api/kb/' + editingId : '/api/kb';
    var method = editingId ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'X-User-Role': session.role || 'user' },
      body: JSON.stringify(payload),
    }).then(function (r) {
      if (!r.ok) throw new Error('Save failed');
      return r.json();
    }).then(function () {
      qs('[data-admin-kb-form]').style.display = 'none';
      qs('[data-admin-kb-list-view]').style.display = '';
      loadArticles();
    }).catch(function (e) {
      alert('Failed: ' + e.message);
    });
  }

  function deleteArticle(id) {
    var session = getSession();
    fetch('/api/kb/' + id, {
      method: 'DELETE',
      headers: { 'X-User-Role': session.role || 'user' },
    }).then(function (r) {
      if (!r.ok) throw new Error('Delete failed');
      loadArticles();
    }).catch(function (e) {
      alert('Failed: ' + e.message);
    });
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  window.AdminKB = { init: init, openManager: openManager };
})();
