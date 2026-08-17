(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';
  var currentTickets = [];
  var currentDrawerTicketId = null;
  var pollTimer = null;

  var els = {};

  function qs(s, c) { return (c || document).querySelector(s); }
  function qsa(s, c) { return (c || document).querySelectorAll(s); }

  function cacheEls() {
    els.tableBody = qs('[data-table-body]');
    els.searchInput = qs('[data-search-input]');
    els.filterSelects = qsa('.mt-filter-select');
    els.empty = qs('[data-empty]');
    els.tableWrap = qs('[data-table-wrap]');
    els.drawerOverlay = qs('[data-drawer-overlay]');
    els.drawer = qs('[data-drawer]');
    els.drawerClose = qs('[data-drawer-close]');
    els.drawerBody = qs('[data-drawer-body]');
    els.counter = qs('[data-ticket-count]');
    els.header = qs('[data-mt-header]');
  }

  function loadTickets() {
    fetch(API_BASE + '/api/tickets')
      .then(function (r) { return r.json(); })
      .then(function (tickets) {
        currentTickets = tickets;
        try { localStorage.setItem('resolveone_tickets', JSON.stringify(currentTickets)); } catch (e) {}
        renderTicketTable();
      })
      .catch(function () {
        try {
          currentTickets = JSON.parse(localStorage.getItem('resolveone_tickets') || '[]');
        } catch (e) {
          currentTickets = [];
        }
        renderTicketTable();
      });
  }

  function saveTickets() {
    try { localStorage.setItem('resolveone_tickets', JSON.stringify(currentTickets)); } catch (e) {}
  }

  function renderTableRow(ticket) {
    var statusClass = ticket.status === 'Open' ? 'mt-badge-open' : ticket.status === 'In Progress' ? 'mt-badge-progress' : ticket.status === 'Resolved' ? 'mt-badge-resolved' : ticket.status === 'Closed' ? 'mt-badge-closed' : 'mt-badge-open';
    var createdDate = '';
    if (ticket.created) {
      var d = new Date(ticket.created);
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      createdDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    var row = document.createElement('tr');
    row.className = 'mt-table-row';
    row.setAttribute('data-ticket-id', ticket.id);
    row.setAttribute('tabindex', '0');
    row.setAttribute('role', 'button');

    row.innerHTML = '<td class="mt-cell mt-cell-id"><span class="mt-id-text">' + ticket.id + '</span></td>' +
      '<td class="mt-cell mt-cell-issue"><div class="mt-issue-wrap"><span class="mt-issue-text">' + ticket.issue + '</span></div></td>' +
      '<td class="mt-cell mt-cell-dept"><span class="mt-dept-text">' + (ticket.department || '-') + '</span></td>' +
      '<td class="mt-cell mt-cell-status"><span class="mt-badge ' + statusClass + '">' + ticket.status + '</span></td>' +
      '<td class="mt-cell mt-cell-created"><span class="mt-created-text">' + createdDate + '</span></td>' +
      '<td class="mt-cell mt-cell-action"><button class="mt-action-btn" data-view-btn title="View details"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button></td>';

    row.addEventListener('click', function (e) {
      if (e.target.closest('[data-view-btn]') || e.target.closest('.mt-action-btn')) {
        openDrawer(ticket.id);
      } else {
        openDrawer(ticket.id);
      }
    });

    return row;
  }

  function renderTicketTable() {
    if (!els.tableBody) return;
    var filtered = getFilteredTickets();
    els.tableBody.innerHTML = '';

    if (filtered.length === 0) {
      if (els.tableWrap) els.tableWrap.style.display = 'none';
      if (els.empty) {
        els.empty.style.display = 'flex';
        var emptyText = els.empty.querySelector('.mt-empty-text');
        if (!emptyText) {
          els.empty.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-text);opacity:0.4;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><p class="mt-empty-text" style="margin-top:12px;color:var(--color-text);font-size:0.875rem;">No tickets found</p>';
        } else {
          els.empty.querySelector('p').textContent = 'No tickets found';
        }
      }
      if (els.counter) els.counter.textContent = '0 tickets';
      return;
    }

    if (els.tableWrap) els.tableWrap.style.display = '';
    if (els.empty) els.empty.style.display = 'none';

    filtered.forEach(function (t) {
      els.tableBody.appendChild(renderTableRow(t));
    });

    if (els.counter) els.counter.textContent = filtered.length + ' ticket' + (filtered.length !== 1 ? 's' : '');
  }

  function getFilteredTickets() {
    var search = els.searchInput ? els.searchInput.value.trim().toLowerCase() : '';
    var statusFilter = qs('.mt-filter-select[data-filter="status"]');
    var deptFilter = qs('.mt-filter-select[data-filter="department"]');
    var status = statusFilter ? statusFilter.value : 'all';
    var department = deptFilter ? deptFilter.value : 'all';

    return currentTickets.filter(function (t) {
      if (search && t.issue.toLowerCase().indexOf(search) === -1 && t.id.toLowerCase().indexOf(search) === -1) return false;
      if (status !== 'all' && t.status.toLowerCase() !== status.toLowerCase()) return false;
      if (department !== 'all' && t.department !== department) return false;
      return true;
    }).sort(function (a, b) {
      return new Date(b.created) - new Date(a.created);
    });
  }

  function bindEvents() {
    if (els.searchInput) {
      els.searchInput.addEventListener('input', function () {
        renderTicketTable();
      });
    }
    els.filterSelects.forEach(function (sel) {
      sel.addEventListener('change', function () {
        renderTicketTable();
      });
    });
    if (els.drawerOverlay) {
      els.drawerOverlay.addEventListener('click', closeDrawer);
    }
    if (els.drawerClose) {
      els.drawerClose.addEventListener('click', closeDrawer);
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  function openDrawer(ticketId) {
    currentDrawerTicketId = ticketId;
    var ticket = null;
    for (var i = 0; i < currentTickets.length; i++) {
      if (currentTickets[i].id === ticketId) {
        ticket = currentTickets[i];
        break;
      }
    }
    if (!ticket) return;

    document.body.classList.add('drawer-open');

    renderDrawerContent(ticket);

    if (els.drawerOverlay) els.drawerOverlay.classList.add('active');
    if (els.drawer) {
      els.drawer.classList.add('active');
      els.drawer.setAttribute('aria-hidden', 'false');
    }

    setTimeout(function () {
      var panel = qs('.mt-drawer-panel');
      if (panel) panel.scrollTop = 0;
    }, 50);
  }

  function closeDrawer() {
    currentDrawerTicketId = null;
    document.body.classList.remove('drawer-open');
    if (els.drawerOverlay) els.drawerOverlay.classList.remove('active');
    if (els.drawer) {
      els.drawer.classList.remove('active');
      els.drawer.setAttribute('aria-hidden', 'true');
    }
  }

  function loadDrawerConversations(ticketId) {
    var convoEl = qs('[data-drawer-convo]', els.drawerBody);
    if (!convoEl) return;
    fetch(API_BASE + '/api/admin/ticket/' + encodeURIComponent(ticketId) + '/conversations')
      .then(function (r) { return r.json(); })
      .then(function (msgs) {
        msgs = msgs || [];
        if (msgs.length === 0) {
          convoEl.innerHTML = '<div style="font-size:0.8125rem;color:var(--color-text);">No messages yet. Admin replies will appear here.</div>';
          return;
        }
        var html = '';
        msgs.forEach(function (m) {
          var isAdmin = m.sender === 'admin';
          html += '<div style="max-width:90%;padding:8px 12px;border-radius:8px;font-size:0.75rem;line-height:1.5;' +
            (isAdmin
              ? 'align-self:flex-start;background:var(--color-bg);border:1px solid var(--color-border);border-bottom-left-radius:4px'
              : 'align-self:flex-end;background:rgba(31, 122, 140,.08);border-bottom-right-radius:4px') +
            '">' +
            '<div style="font-size:0.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-light);margin-bottom:3px">' +
            (isAdmin ? 'Admin' : 'You') + '</div>' +
            escapeHtml(m.message) +
            (m.timestamp ? '<div style="font-size:0.5625rem;color:var(--color-text-light);margin-top:4px;opacity:.7">' + formatDateTime(m.timestamp) + '</div>' : '') +
            '</div>';
        });
        convoEl.innerHTML = html;
      })
      .catch(function () {
        convoEl.innerHTML = '<div style="font-size:0.8125rem;color:var(--color-text);">Failed to load conversations.</div>';
      });
  }

  function renderDrawerContent(ticket) {
    if (!els.drawerBody) return;

    var statusClass = ticket.status === 'Open' ? 'mt-badge-open' : ticket.status === 'In Progress' ? 'mt-badge-progress' : ticket.status === 'Resolved' ? 'mt-badge-resolved' : ticket.status === 'Closed' ? 'mt-badge-closed' : 'mt-badge-open';
    var createdDate = '';
    if (ticket.created) {
      var d = new Date(ticket.created);
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var hours = d.getHours();
      var minutes = d.getMinutes();
      var ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      createdDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' at ' + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ' ' + ampm;
    }

    var etaDisplay = ticket.eta || 'N/A';
    var assignedTeamDisplay = ticket.assignedTeam || 'Unassigned';
    var diagnosisText = ticket.aiDiagnosis || 'No AI diagnosis available.';
    var similarText = ticket.similarIssue || 'No similar issues found.';
    var fixText = ticket.suggestedFix || 'No suggested fix recorded.';

    var html = '';
    html += '<div class="mt-drawer-header">';
    html += '<div class="mt-drawer-id-row">';
    html += '<span class="mt-drawer-id">' + ticket.id + '</span>';
    html += '<span class="mt-badge ' + statusClass + '">' + ticket.status + '</span>';
    html += '</div>';
    html += '<button class="mt-drawer-close-btn" data-drawer-close aria-label="Close drawer"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    html += '</div>';

    html += '<div class="mt-drawer-body-scroll">';

    html += '<div class="mt-drawer-section">';
    html += '<div class="mt-drawer-field"><span class="mt-drawer-field-label">Issue</span><span class="mt-drawer-field-value">' + ticket.issue + '</span></div>';
    html += '<div class="mt-drawer-field"><span class="mt-drawer-field-label">Department</span><span class="mt-drawer-field-value">' + ticket.department + '</span></div>';
    html += '<div class="mt-drawer-row">';
    html += '<div class="mt-drawer-field"><span class="mt-drawer-field-label">Assigned Team</span><span class="mt-drawer-field-value">' + assignedTeamDisplay + '</span></div>';
    html += '<div class="mt-drawer-field"><span class="mt-drawer-field-label">Est. Response</span><span class="mt-drawer-field-value">' + etaDisplay + '</span></div>';
    html += '</div>';
    html += '<div class="mt-drawer-field"><span class="mt-drawer-field-label">Created</span><span class="mt-drawer-field-value">' + createdDate + '</span></div>';
    html += '</div>';

    html += '<div class="mt-drawer-sec-title">Conversation</div>';
    html += '<div class="mt-drawer-section"><div class="mt-drawer-convo" data-drawer-convo style="max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px"><div style="font-size:0.8125rem;color:var(--color-text);">Loading...</div></div></div>';

    html += '<div class="mt-drawer-sec-title">Status Timeline</div>';
    html += '<div class="mt-drawer-section mt-timeline-section">';
    if (ticket.timeline && ticket.timeline.length > 0) {
      for (var i = 0; i < ticket.timeline.length; i++) {
        var step = ticket.timeline[i];
        var dotBg = step.status === 'completed' ? 'var(--color-success)' : step.status === 'active' ? 'var(--color-primary)' : 'var(--color-border)';
        var dotSize = '10px';
        var dotInner = '';
        if (step.status === 'completed') {
          dotInner = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          dotSize = '22px';
        } else if (step.status === 'active') {
          dotInner = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';
          dotSize = '22px';
        }
        html += '<div class="mt-timeline-item">';
        html += '<div class="mt-timeline-dot" style="width:' + dotSize + ';height:' + dotSize + ';background:' + dotBg + ';">' + dotInner + '</div>';
        html += '<div class="mt-timeline-content">';
        html += '<div class="mt-timeline-title">' + step.title + '</div>';
        if (step.time) html += '<div class="mt-timeline-time">' + step.time + '</div>';
        html += '</div>';
        html += '</div>';
        if (i < ticket.timeline.length - 1) {
          html += '<div class="mt-timeline-connector"></div>';
        }
      }
    } else {
      html += '<div style="font-size:0.8125rem;color:var(--color-text);">No timeline data available.</div>';
    }
    html += '</div>';

    html += '<div class="mt-drawer-sec-title">AI Diagnosis</div>';
    html += '<div class="mt-drawer-section">';
    html += '<div class="mt-drawer-diagnosis">';
    html += '<div class="mt-drawer-diagnosis-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>';
    html += '<div class="mt-drawer-diagnosis-text">' + diagnosisText + '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="mt-drawer-sec-title">Similar Issue Found</div>';
    html += '<div class="mt-drawer-section">';
    html += '<div class="mt-drawer-similar">';
    html += '<div class="mt-drawer-similar-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>';
    html += '<div class="mt-drawer-similar-text">' + similarText + '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="mt-drawer-sec-title">Suggested Fix</div>';
    html += '<div class="mt-drawer-section">';
    html += '<div class="mt-drawer-fix">';
    html += '<div class="mt-drawer-fix-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>';
    html += '<div class="mt-drawer-fix-text">' + fixText + '</div>';
    html += '</div>';
    html += '</div>';

    html += '</div>';

    html += '<div class="mt-drawer-actions">';
    if (ticket.status === 'Open' || ticket.status === 'In Progress') {
      html += '<button class="mt-drawer-action-btn secondary" data-reopen-btn style="display:none;"></button>';
    }
    if (ticket.status !== 'Open' && ticket.status !== 'In Progress') {
      html += '<button class="mt-drawer-action-btn secondary" data-reopen-btn>Reopen Ticket</button>';
    }
    html += '<button class="mt-drawer-action-btn secondary" data-download-btn>Download Report</button>';
    html += '<button class="mt-drawer-action-btn primary" data-copy-btn>Copy Ticket ID</button>';
    html += '</div>';

    els.drawerBody.innerHTML = html;

    loadDrawerConversations(ticket.id);

    var newCloseBtn = els.drawerBody.querySelector('[data-drawer-close]');
    if (newCloseBtn) newCloseBtn.addEventListener('click', closeDrawer);

    var reopenBtn = els.drawerBody.querySelector('[data-reopen-btn]');
    if (reopenBtn) reopenBtn.addEventListener('click', function () { reopenTicket(ticket.id); });

    var downloadBtn = els.drawerBody.querySelector('[data-download-btn]');
    if (downloadBtn) downloadBtn.addEventListener('click', function () { downloadReport(ticket.id); });

    var copyBtn = els.drawerBody.querySelector('[data-copy-btn]');
    if (copyBtn) copyBtn.addEventListener('click', function () { copyTicketId(ticket.id); });
  }

  function reopenTicket(ticketId) {
    for (var i = 0; i < currentTickets.length; i++) {
      if (currentTickets[i].id === ticketId && (currentTickets[i].status === 'Resolved' || currentTickets[i].status === 'Closed')) {
        currentTickets[i].status = 'Open';
        fetch(API_BASE + '/api/ticket/' + ticketId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Open' })
        }).catch(function () {});
        if (currentTickets[i].timeline) {
          currentTickets[i].timeline.push({ title: 'Ticket Reopened', status: 'active', time: 'Just now' });
        }
        saveTickets();
        renderTicketTable();
        if (currentDrawerTicketId === ticketId) openDrawer(ticketId);
        return;
      }
    }
  }

  function downloadReport(ticketId) {
    for (var i = 0; i < currentTickets.length; i++) {
      if (currentTickets[i].id === ticketId) {
        var t = currentTickets[i];
        var report = '=== ResolveOne Ticket Report ===\n';
        report += 'Ticket ID: ' + t.id + '\n';
        report += 'Status: ' + t.status + '\n';
        report += 'Issue: ' + t.issue + '\n';
        report += 'Department: ' + (t.department || 'N/A') + '\n';
        report += 'Assigned Team: ' + (t.assignedTeam || 'Unassigned') + '\n';
        report += 'Created: ' + (t.created || 'N/A') + '\n';
        report += 'AI Diagnosis: ' + (t.aiDiagnosis || 'N/A') + '\n';
        report += 'Similar Issue: ' + (t.similarIssue || 'N/A') + '\n';
        report += 'Suggested Fix: ' + (t.suggestedFix || 'N/A') + '\n';
        report += '==============================';
        var blob = new Blob([report], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'ticket-' + t.id + '-report.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    }
  }

  function copyTicketId(ticketId) {
    try {
      navigator.clipboard.writeText(ticketId).then(function () {
        var btn = qs('[data-copy-btn]');
        if (btn) {
          btn.textContent = 'Copied!';
          setTimeout(function () { btn.textContent = 'Copy Ticket ID'; }, 2000);
        }
      });
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = ticketId;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      var btn = qs('[data-copy-btn]');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy Ticket ID'; }, 2000);
      }
    }
  }

  function generateLocalId() {
    return 'RSV-' + Date.now().toString(36).toUpperCase();
  }

  function addTicket(ticket) {
    return fetch(API_BASE + '/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket)
    })
    .then(function (r) { return r.json(); })
    .then(function (saved) {
      currentTickets.unshift(saved);
      saveTickets();
      renderTicketTable();
      return saved;
    })
    .catch(function () {
      var fallback = JSON.parse(JSON.stringify(ticket));
      if (!fallback.id) fallback.id = generateLocalId();
      currentTickets.unshift(fallback);
      saveTickets();
      renderTicketTable();
      return fallback;
    });
  }

  function refreshTable() {
    loadTickets();
  }

  function migrateLocalTickets() {
    var migrated;
    try { migrated = localStorage.getItem('resolveone_migrated') === 'true'; } catch (e) { migrated = false; }
    if (migrated) return;

    var localTickets = [];
    try { localTickets = JSON.parse(localStorage.getItem('resolveone_tickets') || '[]'); } catch (e) {}
    if (localTickets.length === 0) {
      try { localStorage.setItem('resolveone_migrated', 'true'); } catch (e) {}
      return;
    }

    var payload = localTickets.map(function (t) {
      return {
        id: t.id,
        issue: t.issue,
        department: t.department,
        category: t.category,
        priority: t.priority,
        status: t.status,
        aiDiagnosis: t.aiDiagnosis,
        assignedTeam: t.assignedTeam,
        eta: t.eta,
        created: t.created,
        timeline: t.timeline,
        similarIssue: t.similarIssue,
        suggestedFix: t.suggestedFix,
        fixWorked: t.fixWorked,
        originalMessage: t.originalMessage
      };
    });

    fetch(API_BASE + '/api/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickets: payload })
    })
    .then(function () {
      try { localStorage.setItem('resolveone_migrated', 'true'); } catch (e) {}
      loadTickets();
    })
    .catch(function () {
      try { localStorage.setItem('resolveone_migrated', 'true'); } catch (e) {}
    });
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(function () {
      fetch(API_BASE + '/api/tickets')
        .then(function (r) { return r.json(); })
        .then(function (tickets) {
          currentTickets = tickets;
          renderTicketTable();
          if (currentDrawerTicketId) {
            var t = null;
            for (var i = 0; i < tickets.length; i++) {
              if (tickets[i].id === currentDrawerTicketId) { t = tickets[i]; break; }
            }
            if (t) { renderDrawerContent(t); loadDrawerConversations(t.id); }
          }
        })
        .catch(function () {});
    }, 30000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function init() {
    cacheEls();
    migrateLocalTickets();
    loadTickets();
    bindEvents();
    startPolling();
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  function formatDateTime(d) {
    if (!d) return '';
    try {
      var dt = new Date(d);
      if (isNaN(dt.getTime())) return '';
      return dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  window.MyTickets = {
    init: init,
    addTicket: addTicket,
    refreshTable: refreshTable,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    loadTickets: loadTickets
  };
})();
