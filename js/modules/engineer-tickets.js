(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';
  var PAGE_SIZE = 15;

  var state = {
    allTickets: [],
    filtered: [],
    sortBy: 'created_desc',
    page: 1,
    selectedTicket: null,
    conversations: [],
    activities: [],
    activeTab: 'overview',
    loading: false,
  };

  var els = {};
  var debounceTimers = {};

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  var COLUMNS = [
    { key: 'ticket_number', label: 'Ticket ID' },
    { key: 'issue', label: 'Subject' },
    { key: 'reporter', label: 'Requester' },
    { key: 'department', label: 'Department' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'category', label: 'Category' },
    { key: 'created', label: 'Created' },
    { key: 'updated', label: 'Updated' },
    { key: 'sla', label: 'SLA' },
    { key: 'assignedEngineer', label: 'Assigned' },
    { key: 'actions', label: 'Actions' },
  ];

  function cacheEls() {
    els.body = qs('[data-tickets-body]');
    els.table = qs('[data-tickets-table]');
    els.loading = qs('[data-loading-state]');
    els.empty = qs('[data-empty-state]');
    els.emptyTitle = qs('[data-empty-title]');
    els.emptyDesc = qs('[data-empty-desc]');
    els.skeleton = qs('[data-skeleton-state]');
    els.pagination = qs('[data-pagination]');
    els.pgInfo = qs('[data-pg-info]');
    els.pgBtns = qs('[data-pg-btns]');
    els.countVal = qs('[data-count-val]');
    els.filterSearch = qs('[data-filter-search]');
    els.filterStatus = qs('[data-filter-status]');
    els.filterPriority = qs('[data-filter-priority]');
    els.filterCategory = qs('[data-filter-category]');
    els.filterDate = qs('[data-filter-date]');
    els.filterSort = qs('[data-filter-sort]');
    els.filterCount = qs('[data-filter-count]');
    els.filterChips = qs('[data-filter-chips]');
    els.resetBtn = qs('[data-reset-btn]');
    els.refreshBtn = qs('[data-refresh-btn]');
    els.exportBtn = qs('[data-export-btn]');
    els.detailPanel = qs('[data-detail-panel]');
    els.detailClose = qs('[data-detail-close]');
    els.detailOverlay = qs('[data-detail-overlay]');
    els.drawerTabs = qsa('[data-drawer-tab]');
    els.drawerBody = qs('[data-drawer-body]');
    els.drawerActions = qs('[data-drawer-actions]');
    els.toastContainer = qs('[data-toast-container]');
    els.noteModal = qs('[data-note-modal]');
    els.noteTextarea = qs('[data-note-textarea]');
    els.noteCancel = qs('[data-note-cancel]');
    els.noteSave = qs('[data-note-save]');
    els.convoInput = qs('[data-convo-input]');
    els.convoSend = qs('[data-convo-send]');
  }

  function init() {
    cacheEls();
    showSkeleton();
    fetchTickets();
    bindEvents();
  }

  /* ─── DATA FETCHING ─── */
  function fetchTickets() {
    state.loading = true;
    fetch(API_BASE + '/api/tickets')
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load tickets');
        return r.json();
      })
      .then(function (data) {
        state.allTickets = data;
        populateCategoryFilter(data);
        applyFilters();
        state.loading = false;
      })
      .catch(function () {
        state.loading = false;
        hideSkeleton();
        showEmptyState('Failed to load tickets', 'Could not connect to the server. Please try refreshing the page.');
      });
  }

  function populateCategoryFilter(tickets) {
    var cats = {};
    tickets.forEach(function (t) { if (t.category) cats[t.category] = true; });
    var sel = els.filterCategory;
    sel.innerHTML = '<option value="">All Categories</option>';
    Object.keys(cats).sort().forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
  }

  /* ─── FILTERING ─── */
  function getFilters() {
    return {
      search: (els.filterSearch.value || '').toLowerCase().trim(),
      status: els.filterStatus.value,
      priority: els.filterPriority.value,
      category: els.filterCategory.value,
      date: els.filterDate.value,
      sort: els.filterSort.value || 'created_desc',
    };
  }

  function applyFilters() {
    var f = getFilters();
    state.filtered = state.allTickets.filter(function (t) {
      var idStr = (t.ticket_number || t.id || '').toLowerCase();
      var issueStr = (t.issue || '').toLowerCase();
      var reporterStr = (t.reporter || '').toLowerCase();
      var searchStr = f.search;
      if (searchStr && idStr.indexOf(searchStr) === -1 && issueStr.indexOf(searchStr) === -1 && reporterStr.indexOf(searchStr) === -1) return false;
      if (f.status && t.status !== f.status) return false;
      if (f.priority && (t.priority || '').toLowerCase() !== f.priority) return false;
      if (f.category && t.category !== f.category) return false;
      if (f.date) {
        var created = t.created ? new Date(t.created) : null;
        if (!created) return false;
        var now = new Date();
        if (f.date === 'today' && !isSameDay(created, now)) return false;
        if (f.date === 'week') { var weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7); if (created < weekAgo) return false; }
        if (f.date === 'month') { var monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1); if (created < monthAgo) return false; }
      }
      return true;
    });
    state.sortBy = f.sort;
    sortTickets();
    state.page = 1;
    renderTable();
    renderFilterChips(f);
    updateFilterCount();
    updateTicketCount();
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  }

  function sortTickets() {
    var parts = state.sortBy.split('_');
    var field = parts[0];
    var dir = parts[1] || 'desc';
    var priorityOrder = { high: 3, medium: 2, low: 1 };
    var statusOrder = { 'Open': 1, 'In Progress': 2, 'Escalated': 3, 'Resolved': 4, 'Closed': 5 };
    state.filtered.sort(function (a, b) {
      var va, vb;
      if (field === 'priority') { va = priorityOrder[(a.priority || '').toLowerCase()] || 0; vb = priorityOrder[(b.priority || '').toLowerCase()] || 0; }
      else if (field === 'status') { va = statusOrder[a.status] || 99; vb = statusOrder[b.status] || 99; }
      else if (field === 'sla') { va = calcSlaSeconds(a); vb = calcSlaSeconds(b); }
      else if (field === 'created' || field === 'updated') { va = new Date(a[field] || 0).getTime(); vb = new Date(b[field] || 0).getTime(); }
      else { va = (a[field] || '').toLowerCase(); vb = (b[field] || '').toLowerCase(); }
      return dir === 'asc' ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
    });
  }

  /* ─── FILTER CHIPS ─── */
  function renderFilterChips(f) {
    var chips = [];
    if (f.search) chips.push({ key: 'search', label: 'Search: "' + f.search + '"' });
    if (f.status) chips.push({ key: 'status', label: 'Status: ' + f.status });
    if (f.priority) chips.push({ key: 'priority', label: 'Priority: ' + f.priority.charAt(0).toUpperCase() + f.priority.slice(1) });
    if (f.category) chips.push({ key: 'category', label: 'Category: ' + f.category });
    if (f.date) chips.push({ key: 'date', label: 'Date: ' + f.date.charAt(0).toUpperCase() + f.date.slice(1) });
    if (!chips.length) { els.filterChips.innerHTML = ''; return; }
    var html = '';
    chips.forEach(function (c, i) {
      html += '<span class="et-chip">' + escapeHtml(c.label) + '<span class="et-chip-remove" data-chip-index="' + i + '" title="Remove filter">&times;</span></span>';
    });
    els.filterChips.innerHTML = html;
    els.filterChips.querySelectorAll('[data-chip-index]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var idx = parseInt(e.target.getAttribute('data-chip-index'));
        removeFilterChip(idx);
      });
    });
  }

  function removeFilterChip(idx) {
    var f = getFilters();
    var keys = ['search', 'status', 'priority', 'category', 'date'];
    var key = keys[idx];
    if (key === 'search') els.filterSearch.value = '';
    else if (key === 'status') els.filterStatus.value = '';
    else if (key === 'priority') els.filterPriority.value = '';
    else if (key === 'category') els.filterCategory.value = '';
    else if (key === 'date') els.filterDate.value = '';
    applyFilters();
  }

  function updateFilterCount() {
    var f = getFilters();
    var count = 0;
    if (f.search) count++;
    if (f.status) count++;
    if (f.priority) count++;
    if (f.category) count++;
    if (f.date) count++;
    if (count > 0) { els.filterCount.textContent = count + ' active filter' + (count > 1 ? 's' : ''); els.filterCount.style.display = ''; }
    else { els.filterCount.style.display = 'none'; }
  }

  function updateTicketCount() {
    els.countVal.textContent = state.filtered.length;
  }

  /* ─── TABLE RENDERING ─── */
  function renderTable() {
    var data = getPageData();
    hideSkeleton();
    if (!state.filtered.length) {
      els.table.style.display = 'none';
      els.pagination.style.display = 'none';
      showEmptyState('No tickets found', state.allTickets.length ? 'No tickets match your current filters. Try adjusting your search criteria.' : 'No tickets have been created yet.');
      return;
    }
    els.empty.style.display = 'none';
    els.table.style.display = '';
    els.pagination.style.display = '';
    var html = '';
    data.forEach(function (t) {
      html += buildRow(t);
    });
    els.body.innerHTML = html;
    renderPagination();
    updateSortIcons();
  }

  function buildRow(t) {
    var p = (t.priority || 'medium').toLowerCase();
    var s = t.status || 'Open';
    var sClass = s.toLowerCase().replace(/ /g, '-');
    var created = formatDate(t.created);
    var updated = formatDate(t.updated);
    var sla = calcSla(t);
    var slaClass = sla === 'breach' ? 'breach' : sla === 'warning' ? 'warning' : 'ok';
    var slaLabel = sla === 'breach' ? 'Breach' : sla === 'warning' ? 'At Risk' : 'On Track';
    var reporter = t.reporter || t.requester || '-';
    var assigned = t.assignedEngineer || t.assigned_engineer || 'Unassigned';
    return '<tr data-ticket-id="' + escapeHtml(t.id || t.ticket_number) + '">' +
      '<td><span class="td-id">' + escapeHtml(t.ticket_number || t.id) + '</span></td>' +
      '<td><span class="td-subject" title="' + escapeAttr(t.issue || '') + '">' + escapeHtml(truncate(t.issue, 60)) + '</span></td>' +
      '<td>' + escapeHtml(reporter) + '</td>' +
      '<td>' + escapeHtml(t.department || '-') + '</td>' +
      '<td><span class="td-priority ' + p + '">' + p.charAt(0).toUpperCase() + p.slice(1) + '</span></td>' +
      '<td><span class="td-status ' + sClass + '">' + escapeHtml(s) + '</span></td>' +
      '<td>' + escapeHtml(t.category || '-') + '</td>' +
      '<td><span class="td-time">' + created + '</span></td>' +
      '<td><span class="td-time">' + updated + '</span></td>' +
      '<td><span class="td-sla ' + slaClass + '">' + slaLabel + '</span></td>' +
      '<td>' + escapeHtml(assigned) + '</td>' +
      '<td><div class="td-actions"><button class="td-action" title="View details" data-view-ticket><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></div></td>' +
      '</tr>';
  }

  function getPageData() {
    var start = (state.page - 1) * PAGE_SIZE;
    return state.filtered.slice(start, start + PAGE_SIZE);
  }

  function renderPagination() {
    var total = state.filtered.length;
    var pages = Math.ceil(total / PAGE_SIZE);
    var start = (state.page - 1) * PAGE_SIZE + 1;
    var end = Math.min(state.page * PAGE_SIZE, total);
    els.pgInfo.textContent = 'Showing ' + start + '-' + end + ' of ' + total;
    var html = '';
    html += '<button class="et-pg-btn" data-pg-prev' + (state.page <= 1 ? ' disabled' : '') + '>&lsaquo;</button>';
    var maxVisible = 7;
    var startPage = Math.max(1, state.page - Math.floor(maxVisible / 2));
    var endPage = Math.min(pages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
    if (startPage > 1) { html += '<button class="et-pg-btn" data-pg="1">1</button>'; if (startPage > 2) html += '<button class="et-pg-btn" disabled>&hellip;</button>'; }
    for (var i = startPage; i <= endPage; i++) {
      html += '<button class="et-pg-btn' + (i === state.page ? ' active' : '') + '" data-pg="' + i + '">' + i + '</button>';
    }
    if (endPage < pages) { if (endPage < pages - 1) html += '<button class="et-pg-btn" disabled>&hellip;</button>'; html += '<button class="et-pg-btn" data-pg="' + pages + '">' + pages + '</button>'; }
    html += '<button class="et-pg-btn" data-pg-next' + (state.page >= pages ? ' disabled' : '') + '>&rsaquo;</button>';
    els.pgBtns.innerHTML = html;
  }

  function updateSortIcons() {
    var parts = state.sortBy.split('_');
    var field = parts[0];
    var dir = parts[1] || 'desc';
    qsa('.et-table th[data-sort]').forEach(function (th) {
      var key = th.getAttribute('data-sort');
      var icon = th.querySelector('.sort-icon');
      if (!icon) return;
      if (key === field) { icon.textContent = dir === 'asc' ? '\u25B2' : '\u25BC'; icon.className = 'sort-icon active'; }
      else { icon.textContent = '\u25B4\u25BE'; icon.className = 'sort-icon'; }
    });
  }

  /* ─── SLA CALCULATION ─── */
  function calcSla(ticket) {
    var created = ticket.created ? new Date(ticket.created) : null;
    if (!created) return 'ok';
    var now = new Date();
    var hours = (now - created) / (1000 * 60 * 60);
    var p = (ticket.priority || 'medium').toLowerCase();
    var threshold = p === 'high' ? 4 : p === 'medium' ? 24 : 72;
    var ratio = hours / threshold;
    if (ratio >= 1) return 'breach';
    if (ratio >= 0.8) return 'warning';
    return 'ok';
  }

  function calcSlaSeconds(ticket) {
    var created = ticket.created ? new Date(ticket.created) : null;
    if (!created) return 0;
    var now = new Date();
    var hours = (now - created) / (1000 * 60 * 60);
    var p = (ticket.priority || 'medium').toLowerCase();
    var threshold = p === 'high' ? 4 : p === 'medium' ? 24 : 72;
    return threshold - hours;
  }

  /* ─── SKELETON / EMPTY STATES ─── */
  function showSkeleton() {
    els.skeleton.style.display = '';
    els.table.style.display = 'none';
    els.empty.style.display = 'none';
    els.loading.style.display = 'none';
    els.pagination.style.display = 'none';
  }

  function hideSkeleton() {
    els.skeleton.style.display = 'none';
  }

  function showEmptyState(title, desc) {
    els.table.style.display = 'none';
    els.pagination.style.display = 'none';
    els.empty.style.display = 'block';
    els.emptyTitle.textContent = title || 'No tickets found';
    els.emptyDesc.textContent = desc || '';
  }

  /* ─── DRAWER ─── */
  function openDrawer(ticketId) {
    var ticket = null;
    for (var i = 0; i < state.allTickets.length; i++) {
      var t = state.allTickets[i];
      if (t.id == ticketId || t.ticket_number === ticketId) { ticket = t; break; }
    }
    if (!ticket) return;
    state.selectedTicket = ticket;
    renderDrawerHeader(ticket);
    renderOverview(ticket);
    els.detailPanel.classList.add('open');
    els.detailOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    switchTab('overview');
    loadConversations(ticket.id || ticket.ticket_number);
    loadActivities(ticket.id || ticket.ticket_number);
    loadRelated(ticket);
    lucide.createIcons();
  }

  function closeDrawer() {
    els.detailPanel.classList.remove('open');
    els.detailOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  function renderDrawerHeader(t) {
    var p = (t.priority || 'medium').toLowerCase();
    var s = t.status || 'Open';
    var sClass = s.toLowerCase().replace(/ /g, '-');
    qs('[data-dd-number]').textContent = t.ticket_number || t.id || 'RSV-0000';
    var pBadge = qs('[data-dd-priority-badge]');
    pBadge.textContent = p.charAt(0).toUpperCase() + p.slice(1);
    pBadge.className = 'et-drawer-badge p-' + p;
    var sBadge = qs('[data-dd-status-badge]');
    sBadge.textContent = s;
    sBadge.className = 'et-drawer-badge ' + sClass;
  }

  function renderOverview(t) {
    qs('[data-dd-reporter]').textContent = t.reporter || t.requester || '-';
    qs('[data-dd-email]').textContent = t.reporterEmail || '-';
    qs('[data-dd-phone]').textContent = t.reporterPhone || '-';
    qs('[data-dd-department]').textContent = t.department || '-';
    qs('[data-dd-category]').textContent = t.category || '-';
    qs('[data-dd-created]').textContent = formatDate(t.created);
    qs('[data-dd-issue]').textContent = t.issue || 'No description provided.';
    renderAiAnalysis(t);
    renderAiRecommendation(t);
  }

  /* ─── AI ANALYSIS ─── */
  function renderAiAnalysis(t) {
    var body = qs('[data-ai-analysis-body]');
    var hasData = t.aiDiagnosis || t.ai_diagnosis || t.possibleCause || t.possible_cause;
    if (!hasData) {
      body.innerHTML = '<div class="et-ai-empty">No AI analysis available for this ticket.</div>';
      return;
    }
    var category = t.category || '-';
    var priority = t.priority || 'medium';
    var rootCause = t.possibleCause || t.possible_cause || '-';
    var confidence = t.confidence;
    var keywords = extractKeywords(t);
    var sentiment = t.sentiment || 'neutral';
    var risk = t.risk_level || (priority === 'high' ? 'high' : priority === 'medium' ? 'medium' : 'low');
    var html = '<div class="et-ai-grid">';
    html += aiItem('Predicted Category', category);
    html += aiItem('Priority Prediction', priority.charAt(0).toUpperCase() + priority.slice(1));
    html += aiItemFull('Root Cause', rootCause);
    if (confidence !== null && confidence !== undefined) {
      html += '<div class="et-ai-item et-ai-item-full"><span class="et-ai-label">Confidence</span><div class="et-ai-confidence"><div class="bar"><div class="fill" style="width:' + confidence + '%"></div></div><span class="pct">' + confidence + '%</span></div></div>';
    }
    if (keywords.length) {
      html += '<div class="et-ai-item et-ai-item-full"><span class="et-ai-label">Detected Keywords</span><div class="et-ai-keywords">' + keywords.map(function (k) { return '<span class="et-ai-keyword">' + escapeHtml(k) + '</span>'; }).join('') + '</div></div>';
    }
    if (t.similarIssue) {
      html += aiItemFull('Possible Duplicate Tickets', t.similarIssue);
    }
    html += '<div class="et-ai-item"><span class="et-ai-label">Sentiment</span><span class="et-ai-sentiment ' + sentiment + '">' + sentiment.charAt(0).toUpperCase() + sentiment.slice(1) + '</span></div>';
    html += '<div class="et-ai-item"><span class="et-ai-label">Risk Level</span><span class="et-ai-risk ' + risk + '">' + risk.charAt(0).toUpperCase() + risk.slice(1) + '</span></div>';
    html += '</div>';
    body.innerHTML = html;
  }

  function aiItem(label, value) {
    return '<div class="et-ai-item"><span class="et-ai-label">' + label + '</span><span class="et-ai-value">' + escapeHtml(value) + '</span></div>';
  }
  function aiItemFull(label, value) {
    return '<div class="et-ai-item et-ai-item-full"><span class="et-ai-label">' + label + '</span><span class="et-ai-value">' + escapeHtml(value) + '</span></div>';
  }

  function extractKeywords(t) {
    var text = (t.issue || '') + ' ' + (t.category || '') + ' ' + (t.aiDiagnosis || t.ai_diagnosis || '');
    var words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    var freq = {};
    var stopWords = { this:1, that:1, with:1, from:1, have:1, been:1, were:1, what:1, when:1, your:1, will:1, been:1, also:1, than:1, then:1, them:1, into:1, could:1, about:1, after:1, other:1, their:1, there:1, which:1, would:1, because:1, issue:1, ticket:1, error:1, need:1, help:1, please:1, thank:1 };
    words.forEach(function (w) { if (!stopWords[w]) freq[w] = (freq[w] || 0) + 1; });
    return Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 6);
  }

  /* ─── AI RECOMMENDATION ─── */
  function renderAiRecommendation(t) {
    var body = qs('[data-ai-rec-body]');
    var rec = t.suggestedFix || t.suggested_fix || t.aiDiagnosis || t.ai_diagnosis || '';
    if (!rec) {
      body.innerHTML = '<div class="et-ai-empty">No recommendation available for this ticket.</div>';
      return;
    }
    var steps = extractSteps(rec);
    var html = '<div class="et-ai-grid">';
    html += aiItemFull('Recommended Resolution', rec);
    if (steps.length) {
      html += '<div class="et-ai-item et-ai-item-full"><span class="et-ai-label">Suggested Troubleshooting Steps</span><div class="et-ai-steps">' +
        steps.map(function (s) { return '<div class="et-ai-step">' + escapeHtml(s) + '</div>'; }).join('') + '</div></div>';
    }
    html += aiItem('Suggested Department', t.department || '-');
    html += aiItem('Suggested Engineer', t.assignedEngineer || t.assigned_engineer || 'Unassigned');
    html += aiItem('Est. Resolution Time', t.eta || t.estimated_response || 'Not set');
    html += aiItem('Suggested Priority', (t.priority || 'medium').charAt(0).toUpperCase() + (t.priority || 'medium').slice(1));
    html += '</div>';
    body.innerHTML = html;
  }

  function extractSteps(text) {
    var steps = [];
    var lines = text.split('\n');
    lines.forEach(function (line) {
      var trimmed = line.replace(/^\d+[\.\)]\s*/, '').replace(/^-\s*/, '').replace(/^\*\s*/, '').trim();
      if (trimmed && trimmed.length > 5 && trimmed.length < 200) steps.push(trimmed);
    });
    return steps.slice(0, 8);
  }

  /* ─── CONVERSATIONS ─── */
  function loadConversations(ticketId) {
    fetch(API_BASE + '/api/admin/ticket/' + ticketId + '/conversations')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) {
        state.conversations = data;
        renderConversations();
      })
      .catch(function () { state.conversations = []; renderConversations(); });
  }

  function renderConversations() {
    var container = qs('[data-dd-conversations]');
    if (!state.conversations.length) {
      container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--color-text-light);font-size:.6875rem;">No messages yet.</div>';
      return;
    }
    var html = '';
    state.conversations.forEach(function (c) {
      var type = (c.sender === 'user' || c.sender === 'customer') ? 'user' : 'engineer';
      html += '<div class="et-convo-msg ' + type + '">' +
        '<div class="msg-sender">' + escapeHtml(c.sender || 'Unknown') + '</div>' +
        '<div>' + escapeHtml(c.message) + '</div>' +
        '<div class="msg-time">' + formatDateTime(c.timestamp) + '</div>' +
        '</div>';
    });
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  function sendConversation(ticketId, message) {
    if (!message.trim()) return;
    var btn = els.convoSend;
    btn.disabled = true;
    fetch(API_BASE + '/api/admin/ticket/' + ticketId + '/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, sender: 'engineer' }),
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    }).then(function () {
      els.convoInput.value = '';
      btn.disabled = true;
      loadConversations(ticketId);
    }).catch(function () {
      showToast('Failed to send message', 'error');
      btn.disabled = false;
    });
  }

  /* ─── ACTIVITY TIMELINE ─── */
  function loadActivities(ticketId) {
    fetch(API_BASE + '/api/admin/ticket/' + ticketId + '/activity')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) {
        state.activities = data;
        renderTimeline();
      })
      .catch(function () { state.activities = []; renderTimeline(); });
  }

  function renderTimeline() {
    var container = qs('[data-dd-timeline]');
    if (!state.activities.length) {
      container.innerHTML = '<div style="padding:16px;color:var(--color-text-light);font-size:.6875rem;text-align:center;">No activity recorded yet.</div>';
      return;
    }
    var html = '';
    state.activities.forEach(function (a) {
      var dotClass = 'engineer';
      if (a.actor === 'system' || a.actor === 'System') dotClass = 'system';
      else if (a.actor === 'user' || a.actor === 'customer') dotClass = 'user';
      html += '<div class="et-tl-item">' +
        '<div class="et-tl-dot ' + dotClass + '"></div>' +
        '<div class="et-tl-action">' + escapeHtml(a.action) + '</div>' +
        (a.detail ? '<div class="et-tl-detail">' + escapeHtml(a.detail) + '</div>' : '') +
        '<div class="et-tl-time">' + formatDateTime(a.timestamp) + ' &middot; ' + escapeHtml(a.actor || 'system') + '</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  /* ─── RELATED TICKETS & KB ARTICLES ─── */
  function loadRelated(currentTicket) {
    var relatedEl = qs('[data-dd-related-tickets]');
    var related = state.allTickets.filter(function (t) {
      return (t.id !== currentTicket.id && t.id !== currentTicket.ticket_number) &&
        (t.category === currentTicket.category || t.department === currentTicket.department);
    }).slice(0, 5);
    if (!related.length) {
      relatedEl.innerHTML = '<div class="et-ai-empty">No related tickets found.</div>';
    } else {
      var html = '';
      related.forEach(function (t) {
        html += '<div class="et-related-item" data-related-id="' + escapeHtml(t.id || t.ticket_number) + '">' +
          '<div class="et-related-item-left"><span class="et-related-item-id">' + escapeHtml(t.ticket_number || t.id) + '</span>' +
          '<span class="et-related-item-issue">' + escapeHtml(truncate(t.issue, 50)) + '</span></div>' +
          '<div class="et-related-item-right"><span class="td-status ' + (t.status || 'Open').toLowerCase().replace(/ /g, '-') + '">' + escapeHtml(t.status || 'Open') + '</span></div></div>';
      });
      relatedEl.innerHTML = html;
      relatedEl.querySelectorAll('[data-related-id]').forEach(function (el) {
        el.addEventListener('click', function () {
          var id = el.getAttribute('data-related-id');
          closeDrawer();
          openDrawer(id);
        });
      });
    }
    loadKbArticles(currentTicket);
  }

  function loadKbArticles(ticket) {
    var kbEl = qs('[data-dd-kb-articles]');
    var searchTerm = (ticket.category || ticket.issue || '').split(' ').slice(0, 3).join(' ');
    fetch(API_BASE + '/api/kb?search=' + encodeURIComponent(searchTerm) + '&per_page=5')
      .then(function (r) { return r.ok ? r.json() : { articles: [] }; })
      .then(function (data) {
        var articles = data.articles || [];
        if (!articles.length) {
          kbEl.innerHTML = '<div class="et-ai-empty">No knowledge base articles linked.</div>';
          return;
        }
        var html = '';
        articles.forEach(function (a) {
          html += '<a href="knowledge-base.html?article=' + a.id + '" class="et-kb-item" target="_blank">' +
            '<div class="et-kb-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>' +
            '<div class="et-kb-item-info"><span class="et-kb-item-title">' + escapeHtml(a.title || '') + '</span>' +
            '<span class="et-kb-item-category">' + escapeHtml(a.category || '') + '</span></div></a>';
        });
        kbEl.innerHTML = html;
      })
      .catch(function () {
        kbEl.innerHTML = '<div class="et-ai-empty">Could not load KB articles.</div>';
      });
  }

  /* ─── QUICK ACTIONS ─── */
  function assignToMe() {
    var t = state.selectedTicket;
    if (!t) return;
    var user = getUser();
    var name = user ? user.full_name || user.name || 'Engineer' : 'Engineer';
    updateTicket(t.id || t.ticket_number, { assigned_engineer: name });
  }

  function acceptTicket() {
    var t = state.selectedTicket;
    if (!t) return;
    var user = getUser();
    var name = user ? user.full_name || user.name || 'Engineer' : 'Engineer';
    updateTicket(t.id || t.ticket_number, { assigned_engineer: name, status: 'In Progress' });
  }

  function escalateTicket() {
    var t = state.selectedTicket;
    if (!t) return;
    updateTicket(t.id || t.ticket_number, { status: 'Escalated' });
  }

  function updateTicket(ticketId, updates) {
    fetch(API_BASE + '/api/ticket/' + ticketId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(function (r) {
      if (!r.ok) throw new Error('Update failed');
      return r.json();
    }).then(function () {
      showToast('Ticket updated successfully', 'success');
      fetchTickets();
      var t = state.selectedTicket;
      if (t) {
        Object.keys(updates).forEach(function (k) { t[k] = updates[k]; });
        renderDrawerHeader(t);
        renderOverview(t);
        lucide.createIcons();
      }
    }).catch(function () {
      showToast('Failed to update ticket', 'error');
    });
  }

  function showNoteModal() {
    els.noteModal.classList.add('active');
    els.noteTextarea.value = '';
    els.noteTextarea.focus();
  }

  function hideNoteModal() {
    els.noteModal.classList.remove('active');
  }

  function saveNote() {
    var t = state.selectedTicket;
    if (!t) return;
    var text = els.noteTextarea.value.trim();
    if (!text) return;
    var btn = els.noteSave;
    btn.disabled = true;
    fetch(API_BASE + '/api/admin/ticket/' + (t.id || t.ticket_number) + '/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sender: 'engineer' }),
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    }).then(function () {
      hideNoteModal();
      showToast('Internal note added', 'success');
      loadConversations(t.id || t.ticket_number);
      loadActivities(t.id || t.ticket_number);
    }).catch(function () {
      showToast('Failed to add note', 'error');
    }).finally(function () { btn.disabled = false; });
  }

  function forwardTicket() {
    var t = state.selectedTicket;
    if (!t) return;
    showToast('Forward option selected for ' + (t.ticket_number || t.id), 'info');
  }

  /* ─── DRAWER TABS ─── */
  function switchTab(tab) {
    state.activeTab = tab;
    els.drawerTabs.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    qsa('[data-tab-content]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-tab-content') === tab);
    });
  }

  /* ─── EXPORT ─── */
  function exportTickets() {
    var rows = [['Ticket ID', 'Subject', 'Requester', 'Department', 'Priority', 'Status', 'Category', 'Created', 'Updated', 'SLA', 'Assigned']];
    var data = state.filtered.length ? state.filtered : state.allTickets;
    data.forEach(function (t) {
      rows.push([
        t.ticket_number || t.id || '',
        t.issue || '',
        t.reporter || '',
        t.department || '',
        t.priority || '',
        t.status || '',
        t.category || '',
        t.created || '',
        t.updated || '',
        calcSla(t),
        t.assignedEngineer || t.assigned_engineer || '',
      ]);
    });
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + (c || '').replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tickets_export_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Exported ' + data.length + ' tickets', 'success');
  }

  /* ─── TOAST ─── */
  function showToast(msg, type) {
    type = type || 'success';
    var el = document.createElement('div');
    el.className = 'tp-toast show ' + type;
    el.innerHTML = '<span>' + escapeHtml(msg) + '</span><span class="tp-toast-close" style="cursor:pointer;opacity:.7;">&times;</span>';
    els.toastContainer.appendChild(el);
    el.querySelector('.tp-toast-close').addEventListener('click', function () { dismissToast(el); });
    setTimeout(function () { dismissToast(el); }, 3500);
  }

  function dismissToast(el) {
    if (!el || el._dismissed) return;
    el._dismissed = true;
    el.classList.remove('show');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }

  /* ─── HELPERS ─── */
  function getUser() {
    try { return window.ResolveOneSession && window.ResolveOneSession.getUser(); } catch (e) { return null; }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      var now = new Date();
      var diff = now - d;
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
      if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
      if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) { return dateStr; }
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return dateStr; }
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ─── EVENTS ─── */
  function bindEvents() {
    els.filterSearch.addEventListener('input', function () {
      clearTimeout(debounceTimers.search);
      debounceTimers.search = setTimeout(applyFilters, 250);
    });
    els.filterStatus.addEventListener('change', applyFilters);
    els.filterPriority.addEventListener('change', applyFilters);
    els.filterCategory.addEventListener('change', applyFilters);
    els.filterDate.addEventListener('change', applyFilters);
    els.filterSort.addEventListener('change', function () {
      state.sortBy = els.filterSort.value;
      sortTickets();
      renderTable();
      renderFilterChips(getFilters());
    });

    els.resetBtn.addEventListener('click', function () {
      els.filterSearch.value = '';
      els.filterStatus.value = '';
      els.filterPriority.value = '';
      els.filterCategory.value = '';
      els.filterDate.value = '';
      applyFilters();
    });

    els.refreshBtn.addEventListener('click', function () {
      els.refreshBtn.classList.add('spinning');
      fetchTickets();
      setTimeout(function () { els.refreshBtn.classList.remove('spinning'); }, 600);
    });

    els.exportBtn.addEventListener('click', exportTickets);

    els.table.addEventListener('click', function (e) {
      var row = e.target.closest('tr[data-ticket-id]');
      if (row && !e.target.closest('.td-action')) {
        openDrawer(row.getAttribute('data-ticket-id'));
      }
      var viewBtn = e.target.closest('[data-view-ticket]');
      if (viewBtn) {
        var row2 = viewBtn.closest('tr[data-ticket-id]');
        if (row2) openDrawer(row2.getAttribute('data-ticket-id'));
      }
    });

    els.detailClose.addEventListener('click', closeDrawer);
    els.detailOverlay.addEventListener('click', closeDrawer);

    els.drawerTabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    els.pgBtns.addEventListener('click', function (e) {
      var btn = e.target.closest('.et-pg-btn');
      if (!btn || btn.disabled) return;
      var pg = btn.getAttribute('data-pg');
      if (pg === 'prev') { if (state.page > 1) state.page--; }
      else if (pg === 'next') { state.page++; }
      else { state.page = parseInt(pg); }
      renderTable();
    });

    qs('[data-action-assign]').addEventListener('click', assignToMe);
    qs('[data-action-accept]').addEventListener('click', acceptTicket);
    qs('[data-action-escalate]').addEventListener('click', escalateTicket);
    qs('[data-action-note]').addEventListener('click', showNoteModal);
    qs('[data-action-forward]').addEventListener('click', forwardTicket);

    els.noteCancel.addEventListener('click', hideNoteModal);
    els.noteSave.addEventListener('click', saveNote);
    els.noteModal.addEventListener('click', function (e) { if (e.target === els.noteModal) hideNoteModal(); });

    els.convoInput.addEventListener('input', function () {
      els.convoSend.disabled = !els.convoInput.value.trim();
    });
    els.convoSend.addEventListener('click', function () {
      var t = state.selectedTicket;
      if (t) sendConversation(t.id || t.ticket_number, els.convoInput.value);
    });
    els.convoInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (els.convoInput.value.trim()) els.convoSend.click();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (els.noteModal.classList.contains('active')) hideNoteModal();
        else closeDrawer();
      }
    });

    window.addEventListener('resize', function () {
      if (state.activeTab) lucide.createIcons();
    });
  }

  window.EngineerTickets = { init: init };
})();
