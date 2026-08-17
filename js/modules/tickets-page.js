(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';
  var tickets = [];
  var kpiData = null;
  var filterOpts = null;
  var selectedTicket = null;
  var engineers = [];
  var pollTimer = null;
  var activeTabId = 'overview';

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  function api(path, opts, cb) {
    fetch(API_BASE + path, opts || {})
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) { if (cb) cb(null, data); })
      .catch(function (err) { if (cb) cb(err); });
  }

  function init() {
    loadFilters();
    loadKpi();
    loadTickets();
    loadEngineers();
    bindEvents();
    startPolling();
  }

  /* ─── Filters ─── */
  function loadFilters() {
    api('/api/admin/tickets/filters', null, function (err, data) {
      if (!err && data) { filterOpts = data; populateFilterDropdowns(); }
    });
  }

  function populateFilterDropdowns() {
    if (!filterOpts) return;
    var deptSel = qs('[data-filter-department]');
    var teamSel = qs('[data-filter-team]');
    deptSel.innerHTML = '<option value="">Department</option>';
    filterOpts.departments.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      deptSel.appendChild(o);
    });
    teamSel.innerHTML = '<option value="">Team</option>';
    filterOpts.teams.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      teamSel.appendChild(o);
    });
    var actionTeamSel = qs('[data-action-team]');
    if (actionTeamSel) {
      actionTeamSel.innerHTML = '<option value="">Unassigned</option>';
      filterOpts.teams.forEach(function (v) {
        var o = document.createElement('option');
        o.value = v; o.textContent = v;
        actionTeamSel.appendChild(o);
      });
    }
    var actionDeptSel = qs('[data-action-department]');
    if (actionDeptSel) {
      actionDeptSel.innerHTML = '<option value="">Not set</option>';
      filterOpts.departments.forEach(function (v) {
        var o = document.createElement('option');
        o.value = v; o.textContent = v;
        actionDeptSel.appendChild(o);
      });
    }
  }

  function loadEngineers() {
    api('/api/admin/engineers', null, function (err, data) {
      if (!err && data) {
        engineers = data;
        var sels = [qs('[data-action-engineer]'), qs('[data-filter-engineer]')];
        sels.forEach(function (sel) {
          if (!sel) return;
          var isFilter = sel.getAttribute('data-filter-engineer') !== null;
          sel.innerHTML = '<option value="">' + (isFilter ? 'Engineer' : 'Unassigned') + '</option>';
          data.forEach(function (e) {
            var o = document.createElement('option');
            o.value = e.name; o.textContent = e.name + (e.department ? ' (' + e.department + ')' : '');
            sel.appendChild(o);
          });
        });
      }
    });
  }

  /* ─── KPI ─── */
  function loadKpi() {
    api('/api/admin/tickets/kpi', null, function (err, data) {
      if (!err && data) { kpiData = data; renderKpi(); }
    });
  }

  function renderKpi() {
    if (!kpiData) return;
    var map = {
      'open': { val: kpiData.open, trend: kpiData.openTrend },
      'progress': { val: kpiData.inProgress, trend: 0 },
      'waiting': { val: kpiData.waitingUser, trend: 0 },
      'resolved': { val: kpiData.resolvedToday, trend: kpiData.resolvedTrend },
      'high': { val: kpiData.highPriority, trend: 0 },
      'sla': { val: kpiData.slaBreached, trend: 0 },
    };
    Object.keys(map).forEach(function (k) {
      var el = qs('[data-kpi-' + k + ']');
      var trendEl = qs('[data-kpi-' + k + '-trend]');
      if (el && el.textContent !== String(map[k].val)) {
        var oldVal = el.textContent;
        el.textContent = map[k].val;
        if (oldVal !== '—' && oldVal !== el.textContent) {
          el.classList.remove('bump');
          void el.offsetWidth;
          el.classList.add('bump');
          setTimeout(function () { el.classList.remove('bump'); }, 400);
        }
      }
      if (trendEl && map[k].trend !== undefined) {
        var t = map[k].trend;
        if (t > 0) trendEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>+' + t;
        else if (t < 0) trendEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' + t;
        else trendEl.textContent = '—';
        trendEl.className = 'tp-kpi-trend ' + (t > 0 ? 'up' : t < 0 ? 'down' : 'neutral');
      }
    });
  }

  /* ─── Tickets ─── */
  function loadTickets(silent, cb) {
    if (!silent) { showLoading(true); }
    api('/api/tickets', null, function (err, data) {
      if (err) {
        if (!silent) { showLoading(false); showError(true); }
        if (cb) cb(err);
        return;
      }
      tickets = data || [];
      if (!silent) { showLoading(false); showError(false); }
      var oldSelectedId = selectedTicket ? selectedTicket.id : null;
      renderTicketCards();
      if (oldSelectedId) {
        var updated = findTicket(oldSelectedId);
        if (updated) {
          selectedTicket = updated;
          if (qs('[data-tp-modal]').classList.contains('active')) {
            renderModalHeader(selectedTicket);
            renderOverview();
            renderDiagnosis();
            renderResolution();
            renderActions();
            switchTab(activeTabId);
          }
        }
      }
      updateFilterCount();
      if (cb) cb(null);
    });
  }

  function showLoading(show) {
    var l = qs('[data-tickets-loading]');
    if (l) l.style.display = show ? '' : 'none';
  }

  function showError(show) {
    var e = qs('[data-tickets-error]');
    if (e) e.style.display = show ? '' : 'none';
  }

  function findTicket(id) {
    for (var i = 0; i < tickets.length; i++) {
      if (tickets[i].id === id) return tickets[i];
    }
    return null;
  }

  function updateFilterCount() {
    var el = qs('[data-filter-count]');
    if (!el) return;
    var shown = qsa('.tp-card').length;
    el.textContent = shown + ' of ' + tickets.length + ' ticket' + (tickets.length !== 1 ? 's' : '');
  }

  /* ─── Render Cards ─── */
  function renderTicketCards() {
    var container = qs('[data-ticket-cards]');
    var emptyEl = qs('[data-tickets-empty]');
    if (!container) return;
    var filtered = getFilteredTickets();
    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
      updateFilterCount();
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    var html = '';
    filtered.forEach(function (t) {
      html += renderCard(t);
    });
    container.innerHTML = html;
    attachCardEvents();
    updateFilterCount();
  }

  function updateCardInDOM(t) {
    var card = qs('[data-ticket-row="' + escapeAttr(t.id) + '"]');
    var filtered = getFilteredTickets();
    var stillVisible = filtered.some(function (f) { return f.id === t.id; });
    if (!stillVisible) {
      if (card) {
        card.parentNode.removeChild(card);
        if (qsa('[data-ticket-row]').length === 0) {
          var e = qs('[data-tickets-empty]');
          if (e) e.style.display = '';
        }
      }
      updateFilterCount();
      return;
    }
    var html = renderCard(t);
    if (card) {
      card.outerHTML = html;
    }
    updateFilterCount();
  }

  function renderCard(t) {
    var sc = getStatusClass(t.status);
    var pc = getPriorityClass(t.priority);
    var sel = selectedTicket && selectedTicket.id === t.id;
    var created = formatDate(t.created);
    var reporter = t.reporter || 'Unknown';
    var confidence = t.confidence != null ? t.confidence + '%' : '';
    var unread = t.status === 'Open' && !sel;
    var slaClass = 'sla-ok';
    var slaLabel = 'On Track';
    if (t.created) {
      var hours = (new Date() - new Date(t.created)) / 3600000;
      if (t.priority === 'high' && hours > 4) { slaClass = 'sla-breach'; slaLabel = 'Breached'; }
      else if (t.priority === 'medium' && hours > 24) { slaClass = 'sla-breach'; slaLabel = 'Breached'; }
      else if (t.priority === 'low' && hours > 72) { slaClass = 'sla-breach'; slaLabel = 'Breached'; }
      else if (t.priority === 'high' && hours > 2) { slaClass = 'sla-warn'; slaLabel = 'At Risk'; }
      else if (t.priority === 'medium' && hours > 12) { slaClass = 'sla-warn'; slaLabel = 'At Risk'; }
      else if (t.priority === 'low' && hours > 36) { slaClass = 'sla-warn'; slaLabel = 'At Risk'; }
    }
    var updated = t.updated ? formatDateTime(t.updated) : (t.lastUpdated ? formatDateTime(t.lastUpdated) : '');
    var lastUpdatedText = updated ? '<span class="tp-card-last-updated" title="Last updated"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + updated + '</span>' : '';
    return (
      '<div class="tp-card' + (sel ? ' selected' : '') + (unread ? ' unread' : '') + '" data-ticket-row="' + escapeAttr(t.id) + '">' +
        '<div class="tp-card-top">' +
          '<div class="tp-card-id-row">' +
            '<div class="tp-card-priority ' + pc + '"></div>' +
            '<span class="tp-card-id">' + escapeHtml(t.id) + '</span>' +
            '<span class="tp-card-status ' + sc + '">' + escapeHtml(t.status) + '</span>' +
          '</div>' +
          '<span class="tp-card-time">' + created + '</span>' +
        '</div>' +
        '<div class="tp-card-issue" title="' + escapeAttr(t.issue) + '">' + escapeHtml(t.issue) + '</div>' +
        '<div class="tp-card-meta">' +
          '<span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' + escapeHtml(reporter) + '</span>' +
          '<span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' + escapeHtml(t.department || '—') + '</span>' +
          (t.assignedEngineer ? '<span title="Engineer"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>' + escapeHtml(t.assignedEngineer) + '</span>' : '') +
        '</div>' +
        '<div class="tp-card-meta-extra">' +
          '<span class="tp-card-chip ' + slaClass + '"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + slaLabel + '</span>' +
          '<span class="tp-card-chip count"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' + (t.commentCount || 0) + '</span>' +
          '<span class="tp-card-chip count"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' + (t.attachmentCount || 0) + '</span>' +
          lastUpdatedText +
        '</div>' +
        '<div class="tp-card-footer">' +
          '<div class="tp-card-team"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' + escapeHtml(t.assignedTeam || 'Unassigned') + '</div>' +
          (confidence ? '<span class="tp-card-confidence"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>' + confidence + '</span>' : '') +
          '<div class="tp-card-actions">' +
            '<span class="tp-card-action" data-quick-assign title="Assign"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg></span>' +
            '<span class="tp-card-action" data-quick-escalate title="Escalate"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg></span>' +
            '<span class="tp-card-action" data-quick-resolve title="Resolve"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function attachCardEvents() {
    var container = qs('[data-ticket-cards]');
    if (!container || container._ticketCardEvents) return;
    container._ticketCardEvents = true;
    container.addEventListener('click', function (e) {
      var card = e.target.closest('[data-ticket-row]');
      if (!card) return;
      var action = e.target.closest('[data-quick-assign], [data-quick-escalate], [data-quick-resolve]');
      if (action) {
        e.stopPropagation();
        var id = card.getAttribute('data-ticket-row');
        if (action.hasAttribute('data-quick-assign')) { quickAssign(id); }
        else if (action.hasAttribute('data-quick-escalate')) { quickEscalate(id); }
        else if (action.hasAttribute('data-quick-resolve')) { quickResolve(id); }
        return;
      }
      var id = card.getAttribute('data-ticket-row');
      var t = findTicket(id);
      if (t) selectTicket(t);
    });
  }

  function getFilteredTickets() {
    var searchVal = (qs('[data-filter-search]') || {}).value || '';
    searchVal = searchVal.toLowerCase().trim();
    var statusVal = (qs('[data-filter-status]') || {}).value || '';
    var priorityVal = (qs('[data-filter-priority]') || {}).value || '';
    var deptVal = (qs('[data-filter-department]') || {}).value || '';
    var teamVal = (qs('[data-filter-team]') || {}).value || '';
    var engVal = (qs('[data-filter-engineer]') || {}).value || '';
    var sortVal = (qs('[data-filter-sort]') || {}).value || 'newest';

    var filtered = tickets.filter(function (t) {
      if (searchVal && t.issue.toLowerCase().indexOf(searchVal) === -1 && t.id.toLowerCase().indexOf(searchVal) === -1) return false;
      if (statusVal && t.status !== statusVal) return false;
      if (priorityVal && t.priority !== priorityVal) return false;
      if (deptVal && t.department !== deptVal) return false;
      if (teamVal && t.assignedTeam !== teamVal) return false;
      if (engVal && t.assignedEngineer !== engVal) return false;
      return true;
    });

    filtered.sort(function (a, b) {
      if (sortVal === 'oldest') return (a.created || '').localeCompare(b.created || '');
      if (sortVal === 'priority') {
        var rank = { high: 0, medium: 1, low: 2 };
        return (rank[a.priority] || 99) - (rank[b.priority] || 99);
      }
      return (b.created || '').localeCompare(a.created || '');
    });
    return filtered;
  }

  /* ─── Select Ticket → Open Modal ─── */
  function selectTicket(t) {
    selectedTicket = t;
    qsa('[data-ticket-row]').forEach(function (c) { c.classList.remove('selected'); });
    var card = qs('[data-ticket-row="' + escapeAttr(t.id) + '"]');
    if (card) card.classList.add('selected');
    openTicketModal(t);
  }

  function openTicketModal(t) {
    renderModalHeader(t);
    renderOverview();
    renderDiagnosis();
    renderResolution();
    renderActions();
    switchTab(activeTabId);
    loadConversations(t.id);
    loadNotes(t.id);
    loadActivity(t.id);
    qs('[data-tp-modal]').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeTicketModal() {
    qs('[data-tp-modal]').classList.remove('active');
    document.body.style.overflow = '';
    selectedTicket = null;
  }

  function renderModalHeader(t) {
    var headerEl = qs('[data-tp-modal-header]');
    if (!headerEl) return;
    var sc = getStatusClass(t.status);
    var pc = getPriorityClass(t.priority);
    var slaLabel = 'On Track';
    var slaClass = 'sla-ok';
    if (t.created) {
      var hours = (new Date() - new Date(t.created)) / 3600000;
      if (t.priority === 'high' && hours > 4) { slaLabel = 'Breached'; slaClass = 'sla-breach'; }
      else if (t.priority === 'medium' && hours > 24) { slaLabel = 'Breached'; slaClass = 'sla-breach'; }
      else if (t.priority === 'low' && hours > 72) { slaLabel = 'Breached'; slaClass = 'sla-breach'; }
      else if (t.priority === 'high' && hours > 2) { slaLabel = 'At Risk'; slaClass = 'sla-warn'; }
      else if (t.priority === 'medium' && hours > 12) { slaLabel = 'At Risk'; slaClass = 'sla-warn'; }
      else if (t.priority === 'low' && hours > 36) { slaLabel = 'At Risk'; slaClass = 'sla-warn'; }
    }
    var created = formatDate(t.created);
    var updated = formatDate(t.updated || t.created);
    headerEl.innerHTML =
      '<div class="tp-modal-header-top">' +
        '<div class="tp-modal-header-left">' +
          '<div class="tp-modal-id-badge-row">' +
            '<span class="tp-modal-id">' + escapeHtml(t.id) + '</span>' +
            '<span class="tp-modal-badge ' + sc + '">' + escapeHtml(t.status) + '</span>' +
            '<span class="tp-modal-badge priority-' + pc + '">' + escapeHtml(t.priority) + '</span>' +
          '</div>' +
          '<h2 class="tp-modal-title">' + escapeHtml(t.issue) + '</h2>' +
        '</div>' +
        '<button class="tp-modal-close" data-modal-close-btn aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="tp-modal-info-row">' +
        '<div class="tp-modal-info-item"><svg class="tp-modal-info-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span class="tp-modal-info-label">Reporter</span><span class="tp-modal-info-value">' + escapeHtml(t.reporter || 'Unknown') + '</span></div>' +
        '<div class="tp-modal-info-item"><svg class="tp-modal-info-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg><span class="tp-modal-info-label">Department</span><span class="tp-modal-info-value">' + escapeHtml(t.department || '—') + '</span></div>' +
        '<div class="tp-modal-info-item"><svg class="tp-modal-info-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span class="tp-modal-info-label">Engineer</span><span class="tp-modal-info-value">' + escapeHtml(t.assignedEngineer || 'Unassigned') + '</span></div>' +
        '<div class="tp-modal-info-item"><svg class="tp-modal-info-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span class="tp-modal-info-label">Created</span><span class="tp-modal-info-value">' + created + '</span></div>' +
        '<div class="tp-modal-info-item"><svg class="tp-modal-info-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span class="tp-modal-info-label">Updated</span><span class="tp-modal-info-value">' + updated + '</span></div>' +
        '<div class="tp-modal-info-item"><svg class="tp-modal-info-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span class="tp-modal-info-label">SLA</span><span class="tp-modal-info-value ' + slaClass + '">' + slaLabel + '</span></div>' +
      '</div>' +
      '<div class="tp-modal-actions-bar">' +
        '<button class="tp-modal-action-btn btn-primary" data-modal-action-assign><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>Assign</button>' +
        '<button class="tp-modal-action-btn btn-primary" data-modal-action-progress><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>In Progress</button>' +
        '<button class="tp-modal-action-btn btn-success" data-modal-action-resolve><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Resolve</button>' +
        '<button class="tp-modal-action-btn btn-danger" data-modal-action-escalate><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Escalate</button>' +
        '<button class="tp-modal-action-btn" data-modal-action-close-ticket><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Close Ticket</button>' +
      '</div>';
    // Wire quick-action buttons inside header
    wireBtn('[data-modal-action-assign]', function () { if (selectedTicket) { switchTab('actions'); showToast('Assign from Actions tab', 'info'); } });
    wireBtn('[data-modal-action-progress]', function () { if (selectedTicket) { markInProgress(); } });
    wireBtn('[data-modal-action-resolve]', function () { if (selectedTicket) { resolveTicket(); } });
    wireBtn('[data-modal-action-escalate]', function () { if (selectedTicket) { escalateTicket(); } });
    wireBtn('[data-modal-action-close-ticket]', function () { if (selectedTicket) { closeTicket(); } });
    wireBtn('[data-modal-close-btn]', function () { closeTicketModal(); });
    function wireBtn(sel, fn) {
      var el = headerEl.querySelector(sel);
      if (el) el.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
    }
  }

  function closeTicket() {
    if (!selectedTicket) return;
    updateTicket('status', 'Closed');
  }

  function markInProgress() {
    if (!selectedTicket) return;
    updateTicket('status', 'In Progress');
  }

  function renderOverview() {
    var t = selectedTicket;
    if (!t) return;
    setHtml('[data-dt-issue]', escapeHtml(t.issue));
    setText('[data-dt-category]', t.category || '—');
    setText('[data-dt-dept]', t.department || '—');
    setText('[data-dt-created]', formatDate(t.created));
    setText('[data-dt-updated]', formatDate(t.updated || t.created));
    setText('[data-dt-reporter]', t.reporter || 'Unknown');
    var statusEl = qs('[data-dt-status]');
    if (statusEl) statusEl.innerHTML = '<span class="badge ' + getStatusClass(t.status) + '">' + escapeHtml(t.status) + '</span>';
    var prioEl = qs('[data-dt-priority]');
    if (prioEl) prioEl.innerHTML = '<span class="badge ' + getPriorityClass(t.priority) + '">' + escapeHtml(t.priority) + '</span>';
    setText('[data-dt-team]', t.assignedTeam || 'Unassigned');
    setText('[data-dt-engineer]', t.assignedEngineer || 'Unassigned');
    // SLA
    var slaLbl = 'On Track', slaCls = '';
    if (t.created) {
      var h = (new Date() - new Date(t.created)) / 3600000;
      if (t.priority === 'high' && h > 4) { slaLbl = 'Breached'; slaCls = 'badge escalated'; }
      else if (t.priority === 'medium' && h > 24) { slaLbl = 'Breached'; slaCls = 'badge escalated'; }
      else if (t.priority === 'low' && h > 72) { slaLbl = 'Breached'; slaCls = 'badge escalated'; }
      else if (t.priority === 'high' && h > 2) { slaLbl = 'At Risk'; slaCls = 'badge high'; }
      else if (t.priority === 'medium' && h > 12) { slaLbl = 'At Risk'; slaCls = 'badge high'; }
      else if (t.priority === 'low' && h > 36) { slaLbl = 'At Risk'; slaCls = 'badge high'; }
      else slaLbl = 'On Track';
    }
    var slaEl = qs('[data-dt-sla]');
    if (slaEl) slaEl.innerHTML = '<span class="' + slaCls + '">' + slaLbl + '</span>';
    // Tags
    var tagsEl = qs('[data-dt-tags]');
    if (tagsEl) {
      var tags = t.tags || [];
      if (tags.length) {
        tagsEl.innerHTML = tags.map(function (tag) { return '<span class="tp-tag">' + escapeHtml(tag) + '</span>'; }).join('');
      } else {
        tagsEl.innerHTML = '<span style="color:var(--color-text-light);font-size:.75rem;font-weight:400">No tags assigned</span>';
      }
    }
    // Attachments
    var attEl = qs('[data-dt-attachments]');
    if (attEl) {
      var atts = t.attachments || [];
      if (atts.length) {
        attEl.innerHTML = atts.map(function (a) {
          return '<span class="tp-attachment"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' + escapeHtml(a.name || a) + '</span>';
        }).join('');
      } else {
        attEl.innerHTML = '<span style="color:var(--color-text-light);font-size:.75rem;font-weight:400">No attachments</span>';
      }
    }
  }

  function setHtml(sel, html) {
    var el = qs(sel);
    if (el) el.innerHTML = html || '—';
  }

  function renderDiagnosis() {
    var t = selectedTicket;
    if (!t) return;
    setText('[data-dt-diag-cat]', t.category || 'General');
    // Confidence meter
    var confEl = qs('[data-dt-diag-conf]');
    var fillEl = qs('[data-dt-diag-conf-fill]');
    if (t.confidence != null) {
      if (confEl) confEl.textContent = t.confidence + '%';
      if (fillEl) fillEl.style.width = Math.min(100, Math.max(0, t.confidence)) + '%';
    } else {
      if (confEl) confEl.textContent = 'N/A';
      if (fillEl) fillEl.style.width = '0%';
    }
    setText('[data-dt-diag-cause]', t.possibleCause || t.aiDiagnosis || 'No diagnosis available');
    setText('[data-dt-diag-sys]', t.affectedSystems || 'Not specified');
    setText('[data-dt-diag-eta]', t.eta || 'TBD');
    // Matched incidents
    var matchedEl = qs('[data-dt-diag-similar]');
    if (matchedEl) {
      if (t.similarIssue) {
        matchedEl.style.display = '';
        var body = matchedEl.querySelector('.tp-diag-matched-body');
        if (body) body.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> ' + escapeHtml(t.similarIssue);
      } else {
        matchedEl.style.display = 'none';
      }
    }
  }

  function renderResolution() {
    var t = selectedTicket;
    if (!t) return;
    setText('[data-dt-res-title]', t.suggestedFix || 'No recommended solution recorded');
    setText('[data-dt-res-desc]', t.aiDiagnosis || 'No AI diagnosis available for this ticket.');
    setText('[data-dt-res-eta]', t.eta || 'TBD');
    setText('[data-dt-res-why]', t.resolutionReason || t.aiDiagnosis || 'Based on AI analysis of similar resolved incidents.');
    setText('[data-dt-res-expected]', 'Expected Result: ' + (t.expectedResult || 'Resolution should restore normal service operation.'));
    // Steps
    var stepsEl = qs('[data-dt-res-steps]');
    if (stepsEl) {
      var steps = t.resolutionSteps || [];
      if (steps.length) {
        stepsEl.innerHTML = steps.map(function (s) { return '<div class="tp-res-step">' + escapeHtml(s) + '</div>'; }).join('');
      } else {
        stepsEl.innerHTML = '<div class="tp-res-step">Follow the recommended solution above to resolve the issue.</div>';
      }
    }
  }

  function renderActions() {
    var t = selectedTicket;
    if (!t) return;
    var statusSel = qs('[data-action-status]');
    if (statusSel) statusSel.value = t.status;
    var prioritySel = qs('[data-action-priority]');
    if (prioritySel) prioritySel.value = t.priority;
    var teamSel = qs('[data-action-team]');
    if (teamSel) teamSel.value = t.assignedTeam || '';
    var engSel = qs('[data-action-engineer]');
    if (engSel) engSel.value = t.assignedEngineer || '';
    var deptSel = qs('[data-action-department]');
    if (deptSel) deptSel.value = t.department || '';
    var resText = qs('[data-action-resolution]');
    if (resText) resText.value = t.resolutionNotes || '';
  }

  /* ─── Conversations ─── */
  function loadConversations(ticketId) {
    var convoEl = qs('[data-dt-convo]');
    if (!convoEl) return;
    convoEl.innerHTML = '<div style="text-align:center;padding:12px;color:var(--color-text-light);font-size:0.75rem">Loading...</div>';
    api('/api/admin/ticket/' + encodeURIComponent(ticketId) + '/conversations', null, function (err, data) {
      if (err) { convoEl.innerHTML = '<div style="text-align:center;padding:12px;color:var(--color-text-light);font-size:0.75rem">Failed to load.</div>'; return; }
      var msgs = data || [];
      if (msgs.length === 0) {
        var t = selectedTicket;
        if (t && t.originalMessage) {
          convoEl.innerHTML =
            '<div class="tp-convo-msg user" data-dt-engineer="' + escapeAttr(t.reporter || 'User') + '" data-dt-created="' + escapeAttr(t.created || '') + '"><div class="msg-sender">' + escapeHtml(t.reporter || 'User') + '</div>' + escapeHtml(t.originalMessage) + '<span class="msg-time">' + formatDateTime(t.created) + '</span></div>' +
            '<div class="tp-convo-msg ai"><div class="msg-sender">ResolveOne AI</div>Analysis complete. I\'ve diagnosed the issue and created a ticket. ' + (t.aiDiagnosis ? 'Diagnosis: ' + escapeHtml(t.aiDiagnosis) : '') + '<span class="msg-time">' + formatDateTime(t.created) + '</span></div>';
        } else {
          convoEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--color-text-light);font-size:0.75rem">No conversation recorded for this ticket.</div>';
        }
        return;
      }
      var t = selectedTicket;
      var html = '';
      if (t && t.originalMessage) {
        html +=
          '<div class="tp-convo-msg user" data-dt-engineer="' + escapeAttr(t.reporter || 'User') + '" data-dt-created="' + escapeAttr(t.created || '') + '">' +
            '<div class="msg-sender">' + escapeHtml(t.reporter || 'User') + '</div>' +
            escapeHtml(t.originalMessage) +
            '<span class="msg-time">' + formatDateTime(t.created) + '</span>' +
          '</div>' +
          '<div class="tp-convo-msg ai">' +
            '<div class="msg-sender">ResolveOne AI</div>' +
            'Analysis complete. I\'ve diagnosed the issue and created a ticket. ' + (t.aiDiagnosis ? 'Diagnosis: ' + escapeHtml(t.aiDiagnosis) : '') +
            '<span class="msg-time">' + formatDateTime(t.created) + '</span>' +
          '</div>';
      }
      msgs.forEach(function (m) {
        var cls = m.sender === 'admin' ? 'admin' : (m.sender === 'ai' ? 'ai' : 'user');
        var label = m.sender === 'admin' ? 'Admin' : (m.sender === 'ai' ? 'ResolveOne AI' : m.sender || 'User');
        html +=
          '<div class="tp-convo-msg ' + cls + '">' +
            '<div class="msg-sender">' + escapeHtml(label) + '</div>' +
            escapeHtml(m.message) +
            '<span class="msg-time">' + formatDateTime(m.timestamp) + '</span>' +
          '</div>';
      });
      convoEl.innerHTML = html;
    });
  }

  /* ─── Internal Notes ─── */
  function loadNotes(ticketId) {
    var notesEl = qs('[data-dt-notes]');
    if (!notesEl) return;
    api('/api/admin/ticket/' + encodeURIComponent(ticketId) + '/conversations', null, function (err, data) {
      if (err) { notesEl.innerHTML = '<div style="text-align:center;padding:12px;color:var(--color-text-light);font-size:0.75rem">Failed to load.</div>'; return; }
      var msgs = (data || []).filter(function (m) { return m.sender === 'admin'; });
      if (msgs.length === 0) {
        notesEl.innerHTML = '<div style="text-align:center;padding:12px;color:var(--color-text-light);font-size:0.75rem">No internal notes yet.</div>';
        return;
      }
      msgs.sort(function (a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
      var html = '';
      msgs.forEach(function (m) {
        html +=
          '<div class="tp-note-item">' +
            '<div class="tp-note-avatar">A</div>' +
            '<div class="tp-note-body">' +
              '<div class="tp-note-header"><span class="tp-note-author">' + escapeHtml(m.sender || 'Admin') + '</span><span class="tp-note-time">' + formatDateTime(m.timestamp) + '</span></div>' +
              '<div class="tp-note-text">' + escapeHtml(m.message) + '</div>' +
            '</div>' +
          '</div>';
      });
      notesEl.innerHTML = html;
    });
  }

  function addNote() {
    if (!selectedTicket) return;
    var input = qs('[data-note-input]');
    var msg = input.value.trim();
    if (!msg) return;
    var btn = qs('[data-btn-add-note]');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    api('/api/admin/ticket/' + encodeURIComponent(selectedTicket.id) + '/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, sender: 'admin' }),
    }, function (err) {
      btn.disabled = false;
      btn.textContent = 'Send';
      if (err) { showToast('Failed to add note', 'error'); return; }
      input.value = '';
      loadNotes(selectedTicket.id);
      loadConversations(selectedTicket.id);
      loadActivity(selectedTicket.id);
      showToast('Note added', 'success');
    });
  }

  /* ─── Activity Timeline ─── */
  function loadActivity(ticketId) {
    var tlEl = qs('[data-dt-timeline]');
    if (!tlEl) return;
    tlEl.innerHTML = '<div style="text-align:center;padding:12px;color:var(--color-text-light);font-size:0.75rem">Loading...</div>';
    api('/api/admin/ticket/' + encodeURIComponent(ticketId) + '/activity', null, function (err, data) {
      if (err) { tlEl.innerHTML = '<div style="text-align:center;padding:12px;color:var(--color-text-light);font-size:0.75rem">Failed to load.</div>'; return; }
      var logs = data || [];
      if (logs.length === 0) {
        tlEl.innerHTML = '<div style="text-align:center;padding:12px;color:var(--color-text-light);font-size:0.75rem">No activity recorded yet.</div>';
        return;
      }
      var timelineIcons = {
        'created': '<span class="tp-tl-icon">📋</span>',
        'status': '🔄',
        'priority': '⚡',
        'engineer': '👤',
        'team': '👥',
        'escalated': '🚨',
        'resolved': '✅',
        'note': '📝',
        'assigned': '👤',
        'changed': '🔄',
      };
      function getTimelineIcon(action) {
        var lower = (action || '').toLowerCase();
        for (var key in timelineIcons) {
          if (lower.indexOf(key) !== -1) return timelineIcons[key];
        }
        return '📌';
      }
      var html = '';
      logs.forEach(function (l) {
        var dotClass = l.actor === 'admin' ? 'admin' : l.actor === 'user' ? 'user' : 'system';
        var icon = getTimelineIcon(l.action);
        html +=
          '<div class="tp-tl-item">' +
            '<div class="tp-tl-dot ' + dotClass + '"></div>' +
            icon +
            '<div class="tp-tl-action">' + escapeHtml(l.action) + '</div>' +
            (l.detail ? '<div class="tp-tl-detail">' + escapeHtml(l.detail) + '</div>' : '') +
            '<div class="tp-tl-time"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + formatDateTime(l.timestamp) + ' by ' + escapeHtml(l.actor) + '</div>' +
          '</div>';
      });
      tlEl.innerHTML = html;
    });
  }

  /* ─── Tab Management ─── */
  function switchTab(tabId) {
    activeTabId = tabId;
    qsa('[data-tab]').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });
    qsa('[data-tab-content]').forEach(function (content) {
      content.classList.toggle('active', content.getAttribute('data-tab-content') === tabId);
    });
  }

  /* ─── Admin Actions ─── */
  function updateTicket(field, value, cb) {
    if (!selectedTicket) return;
    var body = {};
    body[field] = value;
    var id = selectedTicket.id;
    api('/api/ticket/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, function (err) {
      if (err) { showToast('Failed to update ' + field, 'error'); return; }
      var t = findTicket(id);
      if (t) {
        if (field === 'status') t.status = value;
        if (field === 'priority') t.priority = value;
        if (field === 'assigned_team') t.assignedTeam = value;
        if (field === 'assigned_engineer') t.assignedEngineer = value;
      }
      selectedTicket = findTicket(id);
      if (selectedTicket) {
        renderOverview();
        renderModalHeader(selectedTicket);
        updateCardInDOM(selectedTicket);
      }
      loadKpi();
      loadActivity(id);
      var label = field.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      showToast(label + ' updated to "' + value + '"', 'success');
      if (cb) cb();
    });
  }

  function assignEngineer() {
    if (!selectedTicket) return;
    var val = qs('[data-action-engineer]').value;
    var id = selectedTicket.id;
    var body = { assigned_engineer: val };
    if (val && selectedTicket.status === 'Open') body.status = 'Assigned';
    api('/api/ticket/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, function (err) {
      if (err) { showToast('Failed to assign engineer', 'error'); return; }
      var t = findTicket(id);
      if (t) {
        t.assignedEngineer = val;
        if (body.status) t.status = 'Assigned';
      }
      selectedTicket = findTicket(id);
      if (selectedTicket) {
        renderOverview();
        renderModalHeader(selectedTicket);
        updateCardInDOM(selectedTicket);
        renderActions();
      }
      loadKpi();
      loadActivity(id);
      showToast(val ? 'Assigned to ' + val : 'Engineer unassigned', 'success');
    });
  }

  function saveChanges() {
    if (!selectedTicket) return;
    var body = {};
    var statusVal = qs('[data-action-status]').value;
    var priorityVal = qs('[data-action-priority]').value;
    var teamVal = qs('[data-action-team]').value;
    var deptVal = qs('[data-action-department]').value;
    var resVal = qs('[data-action-resolution]').value;
    if (statusVal !== selectedTicket.status) body.status = statusVal;
    if (priorityVal !== selectedTicket.priority) body.priority = priorityVal;
    if (teamVal !== (selectedTicket.assignedTeam || '')) body.assigned_team = teamVal;
    if (deptVal !== (selectedTicket.department || '')) body.department = deptVal;
    if (resVal !== (selectedTicket.resolutionNotes || '')) body.resolution_notes = resVal;
    if (Object.keys(body).length === 0) return;
    var id = selectedTicket.id;
    api('/api/ticket/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, function (err) {
      if (err) { showToast('Failed to save changes', 'error'); return; }
      var t = findTicket(id);
      if (t) {
        if (body.status) t.status = body.status;
        if (body.priority) t.priority = body.priority;
        if (body.assigned_team) t.assignedTeam = body.assigned_team;
        if (body.department) t.department = body.department;
        if (body.resolution_notes) t.resolutionNotes = body.resolution_notes;
      }
      selectedTicket = findTicket(id);
      if (selectedTicket) {
        renderOverview();
        renderModalHeader(selectedTicket);
        updateCardInDOM(selectedTicket);
        renderActions();
      }
      loadKpi();
      loadActivity(id);
      showToast('Changes saved successfully', 'success');
    });
  }

  function escalateTicket() {
    if (!selectedTicket) return;
    updateTicket('status', 'Escalated');
  }

  function resolveTicket() {
    if (!selectedTicket) return;
    updateTicket('status', 'Resolved');
  }

  function requestReply() {
    if (!selectedTicket) return;
    var btn = qs('[data-btn-request]');
    btn.textContent = 'Requested';
    btn.disabled = true;
    api('/api/admin/ticket/' + encodeURIComponent(selectedTicket.id) + '/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Admin is requesting an update from the user. Please respond with any additional information.', sender: 'admin' }),
    }, function (err) {
      if (err) { btn.textContent = 'Request Reply'; btn.disabled = false; showToast('Failed to request reply', 'error'); return; }
      setTimeout(function () { btn.textContent = 'Request Reply'; btn.disabled = false; }, 2000);
      loadNotes(selectedTicket.id);
      loadConversations(selectedTicket.id);
      loadActivity(selectedTicket.id);
      updateTicket('status', 'Waiting User');
      showToast('Reply requested from user', 'info');
    });
  }

  /* ─── Quick Actions ─── */
  function quickAssign(ticketId) {
    var t = findTicket(ticketId);
    if (!t) return;
    selectedTicket = t;
    qsa('[data-ticket-row]').forEach(function (c) { c.classList.remove('selected'); });
    var card = qs('[data-ticket-row="' + escapeAttr(t.id) + '"]');
    if (card) card.classList.add('selected');
    openTicketModal(t);
    switchTab('actions');
    showToast('Ticket opened in Actions tab for assignment', 'info');
  }

  function quickEscalate(ticketId) {
    var t = findTicket(ticketId);
    if (!t) return;
    selectedTicket = t;
    updateTicket('status', 'Escalated');
  }

  function quickResolve(ticketId) {
    var t = findTicket(ticketId);
    if (!t) return;
    selectedTicket = t;
    updateTicket('status', 'Resolved');
  }

  /* ─── Helpers ─── */
  function getStatusClass(s) {
    if (s === 'Open') return 'open';
    if (s === 'Assigned') return 'assigned';
    if (s === 'In Progress') return 'progress';
    if (s === 'Waiting User') return 'waiting';
    if (s === 'Escalated') return 'escalated';
    if (s === 'Resolved') return 'resolved';
    if (s === 'Closed') return 'closed';
    return 'open';
  }

  function getPriorityClass(p) {
    if (p === 'critical' || p === 'high') return 'high';
    if (p === 'medium') return 'medium';
    return 'low';
  }

  function setText(sel, val) {
    var el = qs(sel);
    if (el) el.textContent = val || '—';
  }

  function formatDate(d) {
    if (!d) return '—';
    try {
      var dt = new Date(d);
      if (isNaN(dt.getTime())) return '—';
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return '—'; }
  }

  function formatDateTime(d) {
    if (!d) return '';
    try {
      var dt = new Date(d);
      if (isNaN(dt.getTime())) return '';
      return dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ─── Toast Notifications ─── */
  function showToast(message, type) {
    type = type || 'success';
    var container = qs('[data-toast-container]');
    if (!container) return;
    var icons = { success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', error: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' };
    var toast = document.createElement('div');
    toast.className = 'tp-toast ' + type;
    toast.innerHTML = icons[type] || icons.success + '<span>' + escapeHtml(message) + '</span><span class="tp-toast-close" data-toast-close><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>';
    container.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });
    toast.querySelector('[data-toast-close]').addEventListener('click', function () {
      toast.classList.remove('show');
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    });
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 4000);
  }

  /* ─── Polling ─── */
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(function () {
      loadKpi();
      loadTickets(true);
    }, 30000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function refresh() {
    var btn = qs('[data-btn-refresh]');
    btn.classList.add('spinning');
    loadFilters();
    loadKpi();
    loadEngineers();
    loadTickets(false, function () { btn.classList.remove('spinning'); });
  }

  function resetFilters() {
    qs('[data-filter-search]').value = '';
    qs('[data-filter-status]').value = '';
    qs('[data-filter-priority]').value = '';
    qs('[data-filter-department]').value = '';
    qs('[data-filter-team]').value = '';
    qs('[data-filter-engineer]').value = '';
    qs('[data-filter-sort]').value = 'newest';
    renderTicketCards();
  }

  /* ─── Events ─── */
  function bindEvents() {
    qs('[data-filter-search]').addEventListener('input', renderTicketCards);
    qs('[data-filter-status]').addEventListener('change', renderTicketCards);
    qs('[data-filter-priority]').addEventListener('change', renderTicketCards);
    qs('[data-filter-department]').addEventListener('change', renderTicketCards);
    qs('[data-filter-team]').addEventListener('change', renderTicketCards);
    qs('[data-filter-engineer]').addEventListener('change', renderTicketCards);
    qs('[data-filter-sort]').addEventListener('change', renderTicketCards);
    qs('[data-btn-refresh]').addEventListener('click', refresh);
    qs('[data-btn-reset]').addEventListener('click', resetFilters);
    var emptyResetBtn = qs('[data-empty-reset-btn]');
    if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetFilters);
    var errorRefreshBtn = qs('[data-btn-refresh-error]');
    if (errorRefreshBtn) errorRefreshBtn.addEventListener('click', refresh);

    // Tab switching
    qsa('[data-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchTab(tab.getAttribute('data-tab'));
      });
    });

    // Admin actions
    var assignEngBtn = qs('[data-btn-assign-eng]');
    if (assignEngBtn) assignEngBtn.addEventListener('click', assignEngineer);
    var saveBtn = qs('[data-btn-save]');
    if (saveBtn) saveBtn.addEventListener('click', saveChanges);
    var escalateBtn = qs('[data-btn-escalate]');
    if (escalateBtn) escalateBtn.addEventListener('click', escalateTicket);
    var resolveBtn = qs('[data-btn-resolve]');
    if (resolveBtn) resolveBtn.addEventListener('click', resolveTicket);
    var requestBtn = qs('[data-btn-request]');
    if (requestBtn) requestBtn.addEventListener('click', requestReply);
    var closeTicketBtn = qs('[data-btn-close-ticket]');
    if (closeTicketBtn) closeTicketBtn.addEventListener('click', closeTicket);

    // Note textarea enter key
    var noteInput = qs('[data-note-input]');
    if (noteInput) {
      noteInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          addNote();
        }
      });
    }
    var addNoteBtn = qs('[data-btn-add-note]');
    if (addNoteBtn) addNoteBtn.addEventListener('click', addNote);

    // Conversation reply
    var convoReplyBtn = qs('[data-convo-reply-btn]');
    if (convoReplyBtn) convoReplyBtn.addEventListener('click', sendConvoReply);
    var convoInput = qs('[data-convo-reply-input]');
    if (convoInput) {
      convoInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendConvoReply();
        }
      });
    }

    // Resolution buttons
    var resBtn = qs('[data-dt-res-btn]');
    if (resBtn) {
      resBtn.addEventListener('click', function () {
        if (selectedTicket) {
          window.open('knowledge-base.html?search=' + encodeURIComponent(selectedTicket.suggestedFix || selectedTicket.issue), '_blank');
        }
      });
    }
    var copyBtn = qs('[data-dt-res-copy]');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (selectedTicket) {
          var txt = selectedTicket.suggestedFix || selectedTicket.aiDiagnosis || '';
          navigator.clipboard.writeText(txt).then(function () { showToast('Solution copied to clipboard', 'success'); });
        }
      });
    }
    var shareBtn = qs('[data-dt-res-share]');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        if (selectedTicket) {
          requestReply();
          showToast('Solution shared with user', 'info');
        }
      });
    }

    // Modal overlay click-outside close
    var modalOverlay = qs('[data-tp-modal]');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) closeTicketModal();
      });
    }
  }

  function sendConvoReply() {
    if (!selectedTicket) return;
    var input = qs('[data-convo-reply-input]');
    var msg = input.value.trim();
    if (!msg) return;
    var btn = qs('[data-convo-reply-btn]');
    var origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Sending...';
    api('/api/admin/ticket/' + encodeURIComponent(selectedTicket.id) + '/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, sender: 'admin' }),
    }, function (err) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
      if (err) { showToast('Failed to send reply', 'error'); return; }
      input.value = '';
      loadConversations(selectedTicket.id);
      loadNotes(selectedTicket.id);
      loadActivity(selectedTicket.id);
      showToast('Reply sent', 'success');
    });
  }



  // Escape key closes modal (global)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = qs('[data-tp-modal]');
      if (modal && modal.classList.contains('active')) closeTicketModal();
    }
  });

  window.TicketsPage = { init: init };
})();
