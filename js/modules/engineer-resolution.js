(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';
  var STORAGE_KEY = 'rs_workspace_v1';
  var PANEL_STORAGE_KEY = 'rs_panels_v1';
  var STATUS_ORDER = ['Open', 'In Progress', 'Pending User', 'Escalated', 'Resolved', 'Closed'];
  var SAVE_DEBOUNCE = 700;
  var SLA_THRESHOLD_HOURS = { high: 4, medium: 24, low: 72 };
  var DEFAULT_PANELS = { overview: true, workspace: true, analysis: false, recommendation: false };
  var PANEL_NAMES = ['overview', 'workspace', 'analysis', 'recommendation'];
  var COLLAPSIBLE_PANELS = ['overview', 'analysis', 'recommendation'];

  var state = {
    allTickets: [],
    currentTicket: null,
    engineers: [],
    activeTab: 'remarks',
    selectedEngineer: null,
    previousStatus: null,
    uploads: [],
    debounceTimers: {},
    slaTimer: null,
    loadingTicket: false,
    dirty: { remarks: false, resolution: false, internal: false },
  };

  var els = {};

  function qs(s) { return document.querySelector(s); }
  function qsa(s, ctx) { return (ctx || document).querySelectorAll(s); }

  function cacheEls() {
    els.selector = qs('[data-ticket-select]');
    els.backToSelection = qs('[data-back-to-selection]');
    els.workspace = qs('[data-workspace]');
    els.emptyState = qs('[data-empty-state]');
    els.stepper = qs('[data-stepper]');
    els.headerMeta = qs('[data-header-meta]');
    els.hdrStatus = qs('[data-hdr-status]');
    els.hdrPriority = qs('[data-hdr-priority]');
    els.hdrSla = qs('[data-hdr-sla]');
    els.hdrEngineer = qs('[data-hdr-engineer]');
    els.hdrUpdated = qs('[data-hdr-updated]');
    els.toastContainer = qs('[data-toast-container]');
    els.unsavedBanner = qs('[data-unsaved-banner]');
    els.aiAnalysisSummary = qs('[data-ai-summary="analysis"]');
    els.aiRecSummary = qs('[data-ai-summary="recommendation"]');

    els.rsId = qs('[data-rs-id]');
    els.rsIssue = qs('[data-rs-issue]');
    els.rsStatus = qs('[data-rs-status]');
    els.rsPriority = qs('[data-rs-priority]');
    els.rsEngineer = qs('[data-rs-engineer]');
    els.rsReporter = qs('[data-rs-reporter]');
    els.rsDept = qs('[data-rs-dept]');
    els.rsCategory = qs('[data-rs-category]');
    els.rsCreated = qs('[data-rs-created]');
    els.rsUpdated = qs('[data-rs-updated]');
    els.rsSla = qs('[data-rs-sla]');

    els.analysisBody = qs('[data-rs-analysis-body]');
    els.recBody = qs('[data-rs-rec-body]');

    els.panelToggles = qsa('[data-panel-toggle]');

    els.actionTabs = qsa('[data-tab]');
    els.inputRemarks = qs('[data-input-remarks]');
    els.inputResolution = qs('[data-input-resolution]');
    els.inputInternal = qs('[data-input-internal]');
    els.statusRemarks = qs('[data-status-remarks]');
    els.statusResolution = qs('[data-status-resolution]');
    els.statusInternal = qs('[data-status-internal]');

    els.selectStatus = qs('[data-select-status]');
    els.btnStatus = qs('[data-btn-status]');
    els.btnUndoStatus = qs('[data-btn-undo-status]');

    els.slaTimerWrap = qs('[data-sla-timer]');
    els.slaBar = qs('[data-sla-bar]');
    els.slaCount = qs('[data-sla-count]');
    els.slaSub = qs('[data-sla-sub]');

    els.engSearch = qs('[data-eng-search]');
    els.engDept = qs('[data-eng-dept]');
    els.engList = qs('[data-eng-list]');
    els.engReason = qs('[data-eng-reason]');
    els.btnAssign = qs('[data-btn-assign]');

    els.valErrors = qs('[data-val-errors]');
    els.btnClose = qs('[data-btn-close]');
    els.closeHint = qs('[data-close-hint]');

    els.meta = qs('[data-meta]');
    els.historyTimeline = qs('[data-history-timeline]');

    els.dropzone = qs('[data-dropzone]');
    els.fileInput = qs('[data-file-input]');
    els.uploadList = qs('[data-upload-list]');

    els.closeModal = qs('[data-close-modal]');
    els.csTicket = qs('[data-cs-ticket]');
    els.csResolution = qs('[data-cs-resolution]');
    els.csEngineer = qs('[data-cs-engineer]');
    els.csTime = qs('[data-cs-time]');
    els.csStatus = qs('[data-cs-status]');
    els.csErrors = qs('[data-cs-errors]');
    els.csCancel = qs('[data-cs-cancel]');
    els.csConfirm = qs('[data-cs-confirm]');
  }

  function init() {
    console.log('[ERS] init() started');
    cacheEls();
    console.log('[ERS] cacheEls() done, selector =', els.selector ? 'FOUND' : 'NULL');
    loadTickets(function () {
      loadEngineers();
      restoreWorkspaceState();
    });
    bindEvents();
    console.log('[ERS] init() completed');
  }

  /* ─── STORAGE (workspace persistence) ─── */

  function readStorage() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function persistWorkspaceState() {
    if (!state.currentTicket) return;
    var id = state.currentTicket.id || state.currentTicket.ticket_number;
    var s = {
      id: id,
      tab: state.activeTab,
      drafts: {
        remarks: els.inputRemarks ? els.inputRemarks.value : '',
        resolution: els.inputResolution ? els.inputResolution.value : '',
        internal: els.inputInternal ? els.inputInternal.value : '',
      },
      uploads: state.uploads,
    };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function loadSavedState(id) {
    var s = readStorage();
    if (!s || s.id !== id) {
      return { drafts: { remarks: '', resolution: '', internal: '' }, tab: 'remarks', uploads: [] };
    }
    return {
      drafts: s.drafts || { remarks: '', resolution: '', internal: '' },
      tab: s.tab || 'remarks',
      uploads: Array.isArray(s.uploads) ? s.uploads : [],
    };
  }

  function readPanels() {
    try {
      var raw = sessionStorage.getItem(PANEL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return DEFAULT_PANELS;
  }

  function savePanels() {
    var panels = {};
    PANEL_NAMES.forEach(function (name) {
      var el = qs('[data-panel="' + name + '"]');
      panels[name] = el ? el.classList.contains('open') : DEFAULT_PANELS[name];
    });
    try { sessionStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(panels)); } catch (e) {}
  }

  function clearPanels() {
    try { sessionStorage.removeItem(PANEL_STORAGE_KEY); } catch (e) {}
  }

  function applyPanelStates(panels) {
    panels = panels || DEFAULT_PANELS;
    PANEL_NAMES.forEach(function (name) {
      var el = qs('[data-panel="' + name + '"]');
      if (!el) return;
      if (COLLAPSIBLE_PANELS.indexOf(name) !== -1) {
        el.classList.toggle('open', !!panels[name]);
      } else {
        el.classList.add('open');
      }
    });
    savePanels();
  }

  function clearWorkspaceState() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function restoreWorkspaceState() {
    var s = readStorage();
    if (!s || !s.id) return;
    if (els.selector) els.selector.value = s.id;
    selectTicket(s.id);
  }

  /* ─── DATA FETCHING ─── */

  function loadTickets(done) {
    fetch(API_BASE + '/api/tickets')
      .then(function (r) { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(function (data) {
        state.allTickets = data || [];
        populateSelector(state.allTickets);
        if (done) done();
      })
      .catch(function (err) {
        console.log('[ERS] loadTickets failed:', err);
        showToast('Failed to load tickets', 'error');
      });
  }

  function populateSelector(tickets) {
    els.selector.innerHTML = '<option value="">Select a ticket to work on...</option>';
    tickets.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t.id || t.ticket_number || '';
      o.textContent = (t.ticket_number || t.id || 'RSV-0000') + ' - ' + truncate(t.issue || '', 60);
      els.selector.appendChild(o);
    });
  }

  function loadEngineers() {
    fetch(API_BASE + '/api/admin/engineers')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        state.engineers = Array.isArray(data) ? data : [];
        populateDeptFilter();
        filterEngineers();
      })
      .catch(function () {
        fetch(API_BASE + '/api/users')
          .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function (data) {
            var users = data.users || data || [];
            state.engineers = users.filter(function (u) {
              return u.role === 'engineer' || u.role === 'support_engineer' || u.role === 'admin';
            }).map(function (u) {
              return { name: u.full_name || u.name || u.email || 'Unknown', email: u.email || '', department: u.department || '' };
            });
            populateDeptFilter();
            filterEngineers();
          })
          .catch(function () {});
      });
  }

  function populateDeptFilter() {
    var depts = [];
    state.engineers.forEach(function (u) {
      if (u.department && depts.indexOf(u.department) === -1) depts.push(u.department);
    });
    var html = '<option value="">All departments</option>';
    depts.sort().forEach(function (d) { html += '<option value="' + escapeAttr(d) + '">' + escapeHtml(d) + '</option>'; });
    els.engDept.innerHTML = html;
  }

  /* ─── TICKET SELECTION ─── */

  function selectTicket(id) {
    if (state.loadingTicket) return;
    state.loadingTicket = true;
    var ticket = null;
    for (var i = 0; i < state.allTickets.length; i++) {
      if (state.allTickets[i].id == id || state.allTickets[i].ticket_number === id) {
        ticket = state.allTickets[i];
        break;
      }
    }
    if (!ticket) {
      fetch(API_BASE + '/api/ticket/' + encodeURIComponent(id))
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (t) {
          ticket = t;
          state.currentTicket = ticket;
          renderWorkspace(ticket);
          state.loadingTicket = false;
        })
        .catch(function () {
          showToast('Failed to load ticket', 'error');
          state.loadingTicket = false;
          showEmptyState();
        });
      return;
    }
    state.currentTicket = ticket;
    renderWorkspace(ticket);
    state.loadingTicket = false;
  }

  function renderWorkspace(t) {
    stopSlaTimer();
    els.emptyState.style.display = 'none';
    els.workspace.style.display = 'block';
    els.headerMeta.style.display = 'flex';
    if (els.backToSelection) els.backToSelection.style.display = 'inline-flex';

    var p = (t.priority || 'medium').toLowerCase();
    var s = t.status || 'Open';
    var id = t.ticket_number || t.id || 'RSV-0000';

    els.rsId.textContent = id;
    els.rsIssue.textContent = t.issue || 'No description provided.';
    els.rsStatus.textContent = s;
    els.rsPriority.textContent = p.charAt(0).toUpperCase() + p.slice(1);
    els.rsEngineer.textContent = t.assignedEngineer || t.assigned_engineer || 'Unassigned';
    els.rsReporter.textContent = t.reporter || '-';
    els.rsDept.textContent = t.department || '-';
    els.rsCreated.textContent = formatDate(t.created);
    els.rsUpdated.textContent = formatDate(t.updated);
    if (els.rsCategory) els.rsCategory.textContent = t.category || '-';
    if (els.rsSla) els.rsSla.textContent = calcSlaLabel(t);

    renderHeaderBadges(t);
    buildStepper(t);
    renderAiAnalysis(t);
    renderAiRecommendation(t);
    renderAiSummary(t);
    renderMetadata(t);

    els.selectStatus.value = s;
    state.previousStatus = null;
    els.btnUndoStatus.style.display = 'none';

    var saved = loadSavedState(id);
    applyPanelStates(readPanels());
    els.inputRemarks.value = saved.drafts.remarks;
    els.inputResolution.value = saved.drafts.resolution;
    els.inputInternal.value = saved.drafts.internal;
    setSaveStatus(els.statusRemarks, saved.drafts.remarks ? 'saved' : '', '');
    setSaveStatus(els.statusResolution, saved.drafts.resolution ? 'saved' : '');
    setSaveStatus(els.statusInternal, saved.drafts.internal ? 'saved' : '');
    switchTab(saved.tab);

    var isClosed = s === 'Closed';
    els.inputRemarks.disabled = isClosed;
    els.inputResolution.disabled = isClosed;
    els.inputInternal.disabled = isClosed;
    els.selectStatus.disabled = isClosed;
    els.btnStatus.disabled = isClosed;
    els.btnAssign.disabled = isClosed;
    els.fileInput.disabled = isClosed;

    state.uploads = saved.uploads.slice();
    renderUploads();

    resetDirty();
    updateCloseState();
    loadHistory(t);
    startSlaTimer(t);
    closeCloseModal();
    try { lucide.createIcons(); } catch (e) {}
  }

  /* ─── HEADER BADGES ─── */

  function statusChipClass(s) {
    switch ((s || '').toLowerCase()) {
      case 'open': return 'open';
      case 'in progress': return 'progress';
      case 'pending user': return 'progress';
      case 'escalated': return 'escalated';
      case 'resolved': return 'resolved';
      case 'closed': return 'closed';
      default: return 'open';
    }
  }

  function renderHeaderBadges(t) {
    var s = t.status || 'Open';
    var p = (t.priority || 'medium').toLowerCase();

    els.hdrStatus.textContent = s;
    els.hdrStatus.className = 'rw-chip ' + statusChipClass(s);

    els.hdrPriority.textContent = p.charAt(0).toUpperCase() + p.slice(1);
    els.hdrPriority.className = 'rw-chip p-' + p;

    var sla = calcSlaStatus(t);
    els.hdrSla.textContent = sla === 'breach' ? 'SLA Breach' : sla === 'warning' ? 'SLA At Risk' : 'SLA On Track';
    els.hdrSla.className = 'rw-chip sla-' + sla;

    var engineer = t.assignedEngineer || t.assigned_engineer || '';
    if (engineer) {
      els.hdrEngineer.innerHTML = '<span class="dot"></span> ' + escapeHtml(engineer);
      els.hdrEngineer.querySelector('.dot').className = 'dot';
    } else {
      els.hdrEngineer.innerHTML = '<span class="dot unassigned"></span> Unassigned';
    }

    els.hdrUpdated.textContent = 'Updated ' + formatDateTime(t.updated || t.created || '');
  }

  /* ─── STEPPER ─── */

  function buildStepper(t) {
    els.stepper.innerHTML = '';
    STATUS_ORDER.forEach(function (status, idx) {
      var step = document.createElement('button');
      step.type = 'button';
      step.className = 'rw-step';
      step.setAttribute('data-step-status', status);
      step.setAttribute('data-step-idx', idx);
      step.setAttribute('role', 'button');
      step.setAttribute('tabindex', '0');
      step.innerHTML =
        '<span class="rw-step-dot"><span class="rw-step-num">' + (idx + 1) + '</span><span class="rw-step-check">&#10003;</span></span>' +
        '<span class="rw-step-label">' + escapeHtml(status) + '</span>' +
        '<span class="rw-step-line"></span>';
      els.stepper.appendChild(step);
    });
    setStepperActive(t.status || 'Open');
  }

  function setStepperActive(status) {
    var currentIdx = STATUS_ORDER.indexOf(status);
    if (currentIdx === -1) currentIdx = 0;
    qsa('.rw-step', els.stepper).forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-step-idx'), 10);
      el.classList.remove('active', 'completed');
      el.removeAttribute('disabled');
      if (idx < currentIdx) el.classList.add('completed');
      else if (idx === currentIdx) el.classList.add('active');
    });
  }

  function handleStepClick(el) {
    var t = state.currentTicket;
    if (!t) return;
    var status = el.getAttribute('data-step-status');
    if (!status || status === (t.status || 'Open')) {
      showToast('Current status is ' + status, 'info');
      return;
    }
    if (status === 'Closed') {
      openCloseModal();
      return;
    }
    updateStatus(status);
  }

  /* ─── AI RENDERING ─── */

  function renderAiAnalysis(t) {
    var hasData = t.aiDiagnosis || t.ai_diagnosis || t.possibleCause || t.possible_cause;
    if (!hasData) {
      els.analysisBody.innerHTML = '<div class="rw-ai-empty">No AI analysis available for this ticket.</div>';
      return;
    }
    var category = t.category || '-';
    var priority = (t.priority || 'medium').charAt(0).toUpperCase() + (t.priority || 'medium').slice(1);
    var rootCause = t.possibleCause || t.possible_cause || '-';
    var confidence = t.confidence;
    var keywords = extractKeywords(t);
    var sentiment = t.sentiment || 'neutral';
    var risk = t.risk_level || (t.priority === 'high' ? 'high' : t.priority === 'medium' ? 'medium' : 'low');
    var html = '<div class="rw-ai-grid">';
    html += aiItem('Category', category);
    html += aiItem('Priority', priority);
    html += '<div class="rw-ai-full rw-ai-item"><div class="rw-ai-label">Root Cause</div><div class="rw-ai-value">' + escapeHtml(rootCause) + '</div></div>';
    if (confidence !== null && confidence !== undefined) {
      html += '<div class="rw-ai-full rw-ai-item"><div class="rw-ai-label">Confidence</div><div class="rw-ai-confidence"><div class="bar"><div class="fill" style="width:' + confidence + '%"></div></div><span class="pct">' + confidence + '%</span></div></div>';
    }
    if (keywords.length) {
      html += '<div class="rw-ai-full rw-ai-item"><div class="rw-ai-label">Keywords</div><div class="rw-ai-keywords">' + keywords.map(function (k) { return '<span class="rw-ai-keyword">' + escapeHtml(k) + '</span>'; }).join('') + '</div></div>';
    }
    if (t.similarIssue) {
      html += '<div class="rw-ai-full rw-ai-item"><div class="rw-ai-label">Possible Duplicates</div><div class="rw-ai-value">' + escapeHtml(t.similarIssue) + '</div></div>';
    }
    html += '<div class="rw-ai-item"><div class="rw-ai-label">Sentiment</div><div class="rw-ai-value">' + sentiment.charAt(0).toUpperCase() + sentiment.slice(1) + '</div></div>';
    html += '<div class="rw-ai-item"><div class="rw-ai-label">Risk Level</div><span class="rw-ai-risk ' + risk + '">' + risk.charAt(0).toUpperCase() + risk.slice(1) + '</span></div>';
    html += '</div>';
    els.analysisBody.innerHTML = html;
  }

  function aiItem(label, value) {
    return '<div class="rw-ai-item"><span class="rw-ai-label">' + label + '</span><span class="rw-ai-value">' + escapeHtml(value) + '</span></div>';
  }

  function renderAiRecommendation(t) {
    var rec = t.suggestedFix || t.suggested_fix || t.aiDiagnosis || t.ai_diagnosis || '';
    if (!rec) {
      els.recBody.innerHTML = '<div class="rw-ai-empty">No recommendation available for this ticket.</div>';
      return;
    }
    var steps = extractSteps(rec);
    var html = '<div class="rw-ai-grid">';
    html += '<div class="rw-ai-full rw-ai-item"><div class="rw-ai-label">Recommended Resolution</div><div class="rw-ai-value">' + escapeHtml(rec) + '</div></div>';
    if (steps.length) {
      html += '<div class="rw-ai-full rw-ai-item"><div class="rw-ai-label">Troubleshooting Steps</div><div class="rw-ai-steps">' +
        steps.map(function (s) { return '<div class="rw-ai-step">' + escapeHtml(s) + '</div>'; }).join('') + '</div></div>';
    }
    html += aiItem('Department', t.department || '-');
    html += aiItem('Engineer', t.assignedEngineer || t.assigned_engineer || 'Unassigned');
    html += aiItem('ETA', t.eta || t.estimated_response || 'Not set');
    html += '</div>';
    els.recBody.innerHTML = html;
  }

  function aiSummaryChip(label, value, cls) {
    return '<span class="chip' + (cls ? ' ' + cls : '') + '">' + escapeHtml(label) + ': <b>' + escapeHtml(truncate(value || '—', 40)) + '</b></span>';
  }

  function renderAiSummary(t) {
    var rootCause = t.possibleCause || t.possible_cause || '';
    var conf = t.confidence;
    var rec = t.suggestedFix || t.suggested_fix || t.aiDiagnosis || t.ai_diagnosis || '';
    var analysisHtml = '';
    if (rootCause) analysisHtml += aiSummaryChip('Root Cause', rootCause);
    if (conf !== null && conf !== undefined) analysisHtml += '<span class="chip primary">Confidence: <b class="dotpct">' + escapeHtml(conf) + '%</b></span>';
    els.aiAnalysisSummary.innerHTML = analysisHtml || '<span class="chip">No analysis available</span>';
    els.aiRecSummary.innerHTML = rec ? aiSummaryChip('Recommendation', rec) : '<span class="chip">No recommendation available</span>';
  }

  function extractKeywords(t) {
    var text = (t.issue || '') + ' ' + (t.category || '') + ' ' + (t.aiDiagnosis || t.ai_diagnosis || '');
    var words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    var freq = {};
    var stopWords = { this:1, that:1, with:1, from:1, have:1, been:1, were:1, what:1, when:1, your:1, will:1, also:1, than:1, then:1, them:1, into:1, could:1, about:1, after:1, other:1, their:1, there:1, which:1, would:1, because:1, issue:1, ticket:1, error:1, need:1, help:1, please:1, thank:1 };
    words.forEach(function (w) { if (!stopWords[w]) freq[w] = (freq[w] || 0) + 1; });
    return Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 6);
  }

  function extractSteps(text) {
    var steps = [];
    text.split('\n').forEach(function (line) {
      var trimmed = line.replace(/^\d+[\.\)]\s*/, '').replace(/^-\s*/, '').replace(/^\*\s*/, '').trim();
      if (trimmed && trimmed.length > 5 && trimmed.length < 200) steps.push(trimmed);
    });
    return steps.slice(0, 8);
  }

  /* ─── METADATA ─── */

  function renderMetadata(t) {
    var items = [
      ['Ticket ID', t.ticket_number || t.id || 'RSV-0000'],
      ['Category', t.category || '-'],
      ['Department', t.department || '-'],
      ['Priority', t.priority || '-'],
      ['Status', t.status || '-'],
      ['Created', formatDateTime(t.created) || '-'],
      ['Updated', formatDateTime(t.updated) || '-'],
      ['Requester', t.reporter || '-'],
      ['SLA', calcSlaLabel(t)],
      ['Assigned Team', t.assignedTeam || '-'],
    ];
    els.meta.innerHTML = items.map(function (pair) {
      return '<div class="rw-meta-item"><span class="rw-meta-label">' + escapeHtml(pair[0]) + '</span><span class="rw-meta-value">' + escapeHtml(pair[1]) + '</span></div>';
    }).join('');
  }

  /* ─── ENGINEER ACTION TABS ─── */

  function switchTab(tab) {
    state.activeTab = tab;
    els.actionTabs.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    qsa('[data-tab-content]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-tab-content') === tab);
    });
    persistWorkspaceState();
  }

  function setSaveStatus(el, kind, msg) {
    var cls = 'rw-save-status';
    if (kind === 'saving') cls += ' saving';
    else if (kind === 'saved') cls += ' saved';
    else if (kind === 'unsaved') cls += ' unsaved';
    else if (kind === 'error') cls += ' error';
    el.className = cls;
    el.textContent = msg || '';
  }

  function setDirty(field, isDirty) {
    if (field) state.dirty[field] = isDirty;
    var any = state.dirty.remarks || state.dirty.resolution || state.dirty.internal;
    if (els.unsavedBanner) els.unsavedBanner.classList.toggle('show', any);
    return any;
  }

  function resetDirty() {
    state.dirty = { remarks: false, resolution: false, internal: false };
    if (els.unsavedBanner) els.unsavedBanner.classList.remove('show');
  }

  function saveNoteDebounced(field) {
    clearTimeout(state.debounceTimers[field]);
    state.debounceTimers[field] = setTimeout(function () { saveNote(field); }, SAVE_DEBOUNCE);
  }

  function saveNote(field) {
    var t = state.currentTicket;
    if (!t) return;
    var textarea = field === 'remarks' ? els.inputRemarks : field === 'resolution' ? els.inputResolution : els.inputInternal;
    var statusEl = field === 'remarks' ? els.statusRemarks : field === 'resolution' ? els.statusResolution : els.statusInternal;
    var msg = textarea.value.trim();
    if (!msg) {
      setDirty(field, false);
      setSaveStatus(statusEl, '', '');
      return;
    }
    var prefix = field === 'remarks' ? 'Engineer Remarks' : field === 'resolution' ? 'Resolution Notes' : 'Internal Notes';
    setSaveStatus(statusEl, 'saving', 'Saving...');
    fetch(API_BASE + '/api/admin/ticket/' + encodeURIComponent(t.id || t.ticket_number) + '/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prefix + ': ' + msg, sender: 'engineer' }),
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed');
      setDirty(field, false);
      setSaveStatus(statusEl, 'saved', 'Saved just now');
      loadHistory(t);
    }).catch(function () {
      setDirty(field, true);
      setSaveStatus(statusEl, 'error', 'Save failed — will retry on next change');
    });
  }

  /* ─── STATUS MANAGEMENT ─── */

  function updateStatus(candidate) {
    var t = state.currentTicket;
    if (!t) return;
    var newStatus = candidate || els.selectStatus.value;
    if (newStatus === t.status) {
      showToast('Status is already ' + newStatus, 'info');
      return;
    }
    if (newStatus === 'Closed') { openCloseModal(); return; }
    els.selectStatus.value = newStatus;
    state.previousStatus = t.status;
    els.btnUndoStatus.style.display = 'inline-flex';
    var btn = els.btnStatus;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" size="14" class="spinning"></i> Updating...';
    try { lucide.createIcons(); } catch (e) {}
    fetch(API_BASE + '/api/ticket/' + encodeURIComponent(t.id || t.ticket_number), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    }).then(function () {
      t.status = newStatus;
      els.rsStatus.textContent = newStatus;
      els.selectStatus.value = newStatus;
      showToast('Status updated to ' + newStatus, 'success');
      renderHeaderBadges(t);
      setStepperActive(newStatus);
      updateCloseState();
      loadHistory(t);
    }).catch(function () {
      showToast('Failed to update status', 'error');
      els.selectStatus.value = t.status;
      state.previousStatus = null;
      els.btnUndoStatus.style.display = 'none';
    }).finally(function () {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="arrow-up" size="14"></i> Update Status';
      try { lucide.createIcons(); } catch (e) {}
    });
  }

  function undoStatus() {
    var t = state.currentTicket;
    if (!t || !state.previousStatus) return;
    var prev = state.previousStatus;
    els.selectStatus.value = prev;
    els.btnUndoStatus.style.display = 'none';
    state.previousStatus = null;
    fetch(API_BASE + '/api/ticket/' + encodeURIComponent(t.id || t.ticket_number), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: prev }),
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    }).then(function () {
      t.status = prev;
      els.rsStatus.textContent = prev;
      showToast('Status reverted to ' + prev, 'success');
      renderHeaderBadges(t);
      setStepperActive(prev);
      updateCloseState();
      loadHistory(t);
    }).catch(function () {
      showToast('Failed to revert status', 'error');
    });
  }

  /* ─── SLA TIMER ─── */

  function startSlaTimer(t) {
    stopSlaTimer();
    var created = t.created ? new Date(t.created) : null;
    if (!created || isNaN(created.getTime())) {
      els.slaCount.textContent = '—';
      els.slaSub.textContent = 'No SLA target set';
      return;
    }
    var p = (t.priority || 'medium').toLowerCase();
    var thresholdH = SLA_THRESHOLD_HOURS[p] || SLA_THRESHOLD_HOURS.medium;
    var deadline = created.getTime() + thresholdH * 3600000;
    var total = thresholdH * 3600000;
    els.slaSub.textContent = 'Priority target: ' + thresholdH + 'h (' + p.charAt(0).toUpperCase() + p.slice(1) + ')';

    function tick() {
      var remain = deadline - Date.now();
      var pct = Math.max(0, Math.min(100, (remain / total) * 100));
      els.slaBar.classList.remove('warning', 'breach');
      if (remain <= 0) {
        els.slaBar.classList.add('breach');
        els.slaCount.textContent = 'SLA Breached';
        els.slaCount.classList.add('breach');
        els.slaBar.firstElementChild.style.width = '0%';
        return;
      }
      els.slaCount.classList.remove('breach');
      if (pct < 20) els.slaBar.classList.add('warning');
      els.slaBar.firstElementChild.style.width = pct + '%';
      var h = Math.floor(remain / 3600000);
      var m = Math.floor((remain % 3600000) / 60000);
      var s = Math.floor((remain % 60000) / 1000);
      els.slaCount.textContent = (h > 0 ? h + 'h ' : '') + m + 'm ' + s + 's';
    }
    tick();
    state.slaTimer = setInterval(tick, 1000);
  }

  function stopSlaTimer() {
    if (state.slaTimer) { clearInterval(state.slaTimer); state.slaTimer = null; }
  }

  /* ─── ASSIGN ENGINEER ─── */

  function engineerLoad(email) {
    var h = 0;
    for (var i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) % 1000;
    var workload = h % 12;
    var r = h % 10;
    var availability = r < 5 ? 'available' : r < 8 ? 'busy' : 'offline';
    return { workload: workload, availability: availability };
  }

  function filterEngineers() {
    var q = (els.engSearch.value || '').toLowerCase().trim();
    var d = els.engDept.value.toLowerCase();
    var list = state.engineers.filter(function (u) {
      var name = (u.name || u.full_name || '').toLowerCase();
      var dept = (u.department || '').toLowerCase();
      var email = (u.email || '').toLowerCase();
      if (d && dept !== d) return false;
      if (q && name.indexOf(q) === -1 && email.indexOf(q) === -1 && dept.indexOf(q) === -1) return false;
      return true;
    });
    renderEngineerList(list);
  }

  function renderEngineerList(list) {
    if (!list.length) {
      els.engList.innerHTML = '<div class="rw-ai-empty">No engineers match your filters.</div>';
      return;
    }
    var current = state.currentTicket ? (state.currentTicket.assignedEngineer || state.currentTicket.assigned_engineer || '') : '';
    var html = '';
    list.forEach(function (u) {
      var name = u.name || u.full_name || u.email || 'Unknown';
      var dept = u.department || '';
      var load = engineerLoad(u.email || name);
      var initials = name.split(' ').map(function (s) { return s.charAt(0); }).join('').toUpperCase().slice(0, 2);
      var selected = state.selectedEngineer && state.selectedEngineer.name === name;
      var isCurrent = current && current === name;
      var loadLabel = load.availability === 'available' ? 'Available' : load.availability === 'busy' ? 'Busy' : 'Offline';
      html += '<div class="rw-eng-item' + (selected ? ' selected' : '') + '" data-eng-name="' + escapeAttr(name) + '" data-eng-email="' + escapeAttr(u.email || '') + '">' +
        '<div class="rw-eng-avatar">' + initials + '</div>' +
        '<div class="rw-eng-info"><div class="rw-eng-name">' + escapeHtml(name) + (isCurrent ? ' <span style="color:var(--color-primary);font-size:.5rem;font-weight:700;">• CURRENT</span>' : '') + '</div>' +
        '<div class="rw-eng-dept">' + escapeHtml(dept) + '</div></div>' +
        '<span class="rw-eng-load ' + load.availability + '">' + load.workload + ' tickets · ' + loadLabel + '</span>' +
        '</div>';
    });
    els.engList.innerHTML = html;
    qsa('.rw-eng-item', els.engList).forEach(function (el) {
      el.addEventListener('click', function () {
        qsa('.rw-eng-item', els.engList).forEach(function (i) { i.classList.remove('selected'); });
        el.classList.add('selected');
        state.selectedEngineer = {
          name: el.getAttribute('data-eng-name'),
          email: el.getAttribute('data-eng-email'),
        };
      });
    });
  }

  function assignEngineer() {
    var t = state.currentTicket;
    if (!t) return;
    if (!state.selectedEngineer) {
      showToast('Select an engineer from the list first', 'error');
      return;
    }
    var name = state.selectedEngineer.name;
    var reason = els.engReason.value.trim();
    var btn = els.btnAssign;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" size="14" class="spinning"></i> Assigning...';
    try { lucide.createIcons(); } catch (e) {}
    fetch(API_BASE + '/api/ticket/' + encodeURIComponent(t.id || t.ticket_number), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_engineer: name }),
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    }).then(function () {
      t.assignedEngineer = name;
      t.assigned_engineer = name;
      els.rsEngineer.textContent = name;
      renderHeaderBadges(t);
      updateCloseState();
      showToast('Assigned to ' + name, 'success');
      var notes = [];
      if (reason) notes.push(fetch(API_BASE + '/api/admin/ticket/' + encodeURIComponent(t.id || t.ticket_number) + '/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Transfer reason: ' + reason, sender: 'engineer' }),
      }));
      Promise.all(notes).then(function () { loadHistory(t); }).catch(function () { loadHistory(t); });
      state.selectedEngineer = null;
      qsa('.rw-eng-item', els.engList).forEach(function (i) { i.classList.remove('selected'); });
      els.engReason.value = '';
      filterEngineers();
    }).catch(function () {
      showToast('Failed to assign engineer', 'error');
    }).finally(function () {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="user-check" size="14"></i> Assign';
      try { lucide.createIcons(); } catch (e) {}
    });
  }

  /* ─── CLOSE TICKET ─── */

  function closeRequirements(t) {
    var resolution = els.inputResolution ? els.inputResolution.value.trim() : '';
    var engineer = t.assignedEngineer || t.assigned_engineer || '';
    var status = t.status || '';
    var unmet = [];
    if (!resolution) unmet.push('Resolution Notes are required.');
    if (!engineer) unmet.push('Ticket must be assigned to an engineer.');
    if (status === 'Open') unmet.push('Status must move beyond Open before closing.');
    return { valid: unmet.length === 0, unmet: unmet };
  }

  function updateCloseState() {
    var t = state.currentTicket;
    if (!t || (t.status || '') === 'Closed') {
      els.btnClose.disabled = true;
      els.closeHint.style.display = 'none';
      return;
    }
    var req = closeRequirements(t);
    els.btnClose.disabled = !req.valid;
    els.closeHint.textContent = req.unmet.join(' · ');
    els.closeHint.style.display = req.unmet.length ? 'block' : 'none';
  }

  function renderValErrors(target, errors) {
    if (!target) return;
    target.innerHTML = errors.map(function (e) {
      return '<div class="rw-val-error"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><span>' + escapeHtml(e) + '</span></div>';
    }).join('');
  }

  function openCloseModal() {
    var t = state.currentTicket;
    if (!t) return;
    var req = closeRequirements(t);
    if (!req.valid) {
      renderValErrors(els.valErrors, req.unmet);
      return;
    }
    els.valErrors.innerHTML = '';
    var resolutionText = els.inputResolution.value.trim();
    var engineer = t.assignedEngineer || t.assigned_engineer || 'Unassigned';
    var status = t.status || '';
    els.csTicket.textContent = (t.ticket_number || t.id || 'RSV-0000') + ' — ' + truncate(t.issue || '', 40);
    els.csResolution.textContent = truncate(resolutionText, 60);
    els.csEngineer.textContent = engineer;
    els.csTime.textContent = calcTimeTaken(t);
    els.csStatus.textContent = status + ' → Closed';
    els.csErrors.innerHTML = '';
    els.closeModal.classList.add('active');
    try { lucide.createIcons(); } catch (e) {}
  }

  function closeCloseModal() {
    els.closeModal.classList.remove('active');
  }

  function confirmClose() {
    var t = state.currentTicket;
    if (!t) return;
    var btn = els.csConfirm;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" size="14" class="spinning"></i> Closing...';
    try { lucide.createIcons(); } catch (e) {}

    var resolutionMsg = els.inputResolution.value.trim();
    var remarksMsg = els.inputRemarks.value.trim();
    var internalMsg = els.inputInternal.value.trim();

    var savePromises = [];
    if (resolutionMsg) {
      savePromises.push(fetch(API_BASE + '/api/admin/ticket/' + encodeURIComponent(t.id || t.ticket_number) + '/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Resolution Notes: ' + resolutionMsg, sender: 'engineer' }),
      }));
    }
    if (remarksMsg) {
      savePromises.push(fetch(API_BASE + '/api/admin/ticket/' + encodeURIComponent(t.id || t.ticket_number) + '/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Engineer Remarks: ' + remarksMsg, sender: 'engineer' }),
      }));
    }
    if (internalMsg) {
      savePromises.push(fetch(API_BASE + '/api/admin/ticket/' + encodeURIComponent(t.id || t.ticket_number) + '/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Internal Notes: ' + internalMsg, sender: 'engineer' }),
      }));
    }

    Promise.all(savePromises).then(function () {
      return fetch(API_BASE + '/api/ticket/' + encodeURIComponent(t.id || t.ticket_number), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Closed' }),
      });
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    }).then(function () {
      t.status = 'Closed';
      els.rsStatus.textContent = 'Closed';
      els.selectStatus.value = 'Closed';
      els.inputRemarks.disabled = true;
      els.inputResolution.disabled = true;
      els.inputInternal.disabled = true;
      els.selectStatus.disabled = true;
      els.btnStatus.disabled = true;
      els.btnAssign.disabled = true;
      els.btnClose.disabled = true;
      els.fileInput.disabled = true;
      setSaveStatus(els.statusRemarks, 'saved', 'Saved just now');
      setSaveStatus(els.statusResolution, 'saved', 'Saved just now');
      setSaveStatus(els.statusInternal, 'saved', 'Saved just now');
      closeCloseModal();
      showToast('Ticket ' + (t.ticket_number || t.id) + ' closed successfully', 'success');
      renderHeaderBadges(t);
      setStepperActive('Closed');
      updateCloseState();
      loadHistory(t);
    }).catch(function () {
      showToast('Failed to close ticket', 'error');
    }).finally(function () {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="check" size="14"></i> Close Ticket';
      try { lucide.createIcons(); } catch (e) {}
    });
  }

  /* ─── ATTACHMENTS ─── */

  function handleFiles(files) {
    if (!files) return;
    Array.prototype.forEach.call(files, function (f) {
      if (state.uploads.length >= 10) {
        showToast('Maximum 10 attachments per ticket', 'error');
        return;
      }
      state.uploads.push({ name: f.name, size: f.size });
    });
    renderUploads();
  }

  function renderUploads() {
    if (!state.uploads.length) {
      els.uploadList.innerHTML = '';
      return;
    }
    var html = '';
    state.uploads.forEach(function (f, idx) {
      html += '<div class="rw-upload-item">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' +
        '<span class="rw-upload-name">' + escapeHtml(f.name) + '</span>' +
        '<span class="rw-upload-size">' + humanSize(f.size) + '</span>' +
        '<button type="button" data-upload-remove="' + idx + '" style="border:none;background:none;cursor:pointer;color:var(--color-text-light);font-size:.75rem;line-height:1;padding:0 2px;" aria-label="Remove attachment">&times;</button>' +
        '</div>';
    });
    els.uploadList.innerHTML = html;
    qsa('[data-upload-remove]', els.uploadList).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(btn.getAttribute('data-upload-remove'), 10);
        state.uploads.splice(i, 1);
        renderUploads();
      });
    });
  }

  /* ─── HISTORY ─── */

  function loadHistory(t) {
    var ticketId = t.id || t.ticket_number;
    fetch(API_BASE + '/api/admin/ticket/' + encodeURIComponent(ticketId) + '/activity')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (activities) {
        renderHistoryTimeline(activities);
      })
      .catch(function () {
        els.historyTimeline.innerHTML = '<div class="rw-ai-empty">Could not load resolution history.</div>';
      });
  }

  function renderHistoryTimeline(activities) {
    if (!activities || !activities.length) {
      els.historyTimeline.innerHTML = '<div class="rw-ai-empty">No resolution history recorded.</div>';
      return;
    }
    var sorted = activities.slice().sort(function (a, b) {
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });
    var html = '';
    sorted.forEach(function (a) {
      var action = a.action || 'Update';
      var detail = a.detail || '';
      var actor = a.actor || 'System';
      var ts = formatDateTime(a.timestamp);
      var dotClass = 'status';
      var aLow = (a.action || '').toLowerCase();
      if (aLow.indexOf('note') !== -1) dotClass = 'note';
      else if (aLow.indexOf('assign') !== -1 || aLow.indexOf('engineer') !== -1) dotClass = 'assign';
      else if (aLow.indexOf('close') !== -1) dotClass = 'close';
      else if (aLow.indexOf('resolv') !== -1) dotClass = 'resolve';
      else if ((a.actor || '').toLowerCase() === 'system') dotClass = 'system';
      html += '<div class="rw-tl-item">' +
        '<div class="rw-tl-dot ' + dotClass + '"></div>' +
        '<div class="rw-tl-action">' + escapeHtml(action) + '</div>' +
        (detail ? '<div class="rw-tl-detail">' + escapeHtml(detail) + '</div>' : '') +
        '<div class="rw-tl-meta">' + ts + ' &middot; ' + escapeHtml(actor) + '</div>' +
        '</div>';
    });
    els.historyTimeline.innerHTML = html;
  }

  /* ─── HELPERS ─── */

  function calcSlaStatus(ticket) {
    var created = ticket.created ? new Date(ticket.created) : null;
    if (!created || isNaN(created.getTime())) return 'ok';
    var hours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
    var p = (ticket.priority || 'medium').toLowerCase();
    var threshold = SLA_THRESHOLD_HOURS[p] || SLA_THRESHOLD_HOURS.medium;
    var ratio = hours / threshold;
    if (ratio >= 1) return 'breach';
    if (ratio >= 0.8) return 'warning';
    return 'ok';
  }

  function calcSlaLabel(ticket) {
    var s = calcSlaStatus(ticket);
    return s === 'breach' ? 'Breach' : s === 'warning' ? 'At Risk' : 'On Track';
  }

  function calcTimeTaken(ticket) {
    if (!ticket.created) return 'N/A';
    try {
      var created = new Date(ticket.created);
      var diff = Date.now() - created.getTime();
      var hours = Math.floor(diff / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);
      if (hours > 24) return Math.floor(hours / 24) + 'd ' + (hours % 24) + 'h';
      return hours + 'h ' + mins + 'm';
    } catch (e) { return 'N/A'; }
  }

  function humanSize(bytes) {
    if (!bytes) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return (i === 0 ? bytes : bytes.toFixed(1)) + ' ' + units[i];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      var diff = Date.now() - d.getTime();
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

  function formatTime(date) {
    try { return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
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

  function showEmptyState() {
    stopSlaTimer();
    resetDirty();
    els.workspace.style.display = 'none';
    els.headerMeta.style.display = 'none';
    if (els.backToSelection) els.backToSelection.style.display = 'none';
    els.emptyState.style.display = 'block';
    state.currentTicket = null;
    state.uploads = [];
  }

  /* ─── TOAST ─── */

  function showToast(msg, type) {
    type = type || 'success';
    var el = document.createElement('div');
    el.className = 'tp-toast show ' + type;
    el.innerHTML = '<span>' + escapeHtml(msg) + '</span><span class="tp-toast-close" style="cursor:pointer;opacity:.7;">&times;</span>';
    if (els.toastContainer) els.toastContainer.appendChild(el);
    el.querySelector('.tp-toast-close').addEventListener('click', function () { dismissToast(el); });
    setTimeout(function () { dismissToast(el); }, 3500);
  }

  function dismissToast(el) {
    if (!el || el._dismissed) return;
    el._dismissed = true;
    el.classList.remove('show');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }

  /* ─── EVENTS ─── */

  function bindEvents() {
    els.selector.addEventListener('change', function () {
      if (this.value) selectTicket(this.value);
      else { clearWorkspaceState(); clearPanels(); showEmptyState(); }
    });

    if (els.backToSelection) {
      els.backToSelection.addEventListener('click', function () {
        clearWorkspaceState();
        clearPanels();
        els.selector.value = '';
        showEmptyState();
      });
    }

    els.panelToggles.forEach(function (header) {
      header.addEventListener('click', function () {
        var panel = header.closest('.rw-panel');
        if (panel) {
          panel.classList.toggle('open');
          savePanels();
        }
      });
    });

    els.actionTabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    els.inputRemarks.addEventListener('input', function () {
      setDirty('remarks', true);
      setSaveStatus(els.statusRemarks, 'unsaved', 'Unsaved changes');
      saveNoteDebounced('remarks');
      persistWorkspaceState();
      updateCloseState();
    });
    els.inputResolution.addEventListener('input', function () {
      setDirty('resolution', true);
      setSaveStatus(els.statusResolution, 'unsaved', 'Unsaved changes');
      saveNoteDebounced('resolution');
      persistWorkspaceState();
      updateCloseState();
    });
    els.inputInternal.addEventListener('input', function () {
      setDirty('internal', true);
      setSaveStatus(els.statusInternal, 'unsaved', 'Unsaved changes');
      saveNoteDebounced('internal');
      persistWorkspaceState();
    });

    els.btnStatus.addEventListener('click', function () { updateStatus(); });
    els.btnUndoStatus.addEventListener('click', undoStatus);

    els.stepper.addEventListener('click', function (e) {
      var step = e.target.closest('.rw-step');
      if (step) handleStepClick(step);
    });
    els.stepper.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var step = e.target.closest('.rw-step');
        if (step) { e.preventDefault(); handleStepClick(step); }
      }
    });

    els.engSearch.addEventListener('input', filterEngineers);
    els.engDept.addEventListener('change', filterEngineers);
    els.btnAssign.addEventListener('click', assignEngineer);

    els.btnClose.addEventListener('click', openCloseModal);
    els.csCancel.addEventListener('click', closeCloseModal);
    els.csConfirm.addEventListener('click', confirmClose);
    els.closeModal.addEventListener('click', function (e) {
      if (e.target === els.closeModal) closeCloseModal();
    });

    if (els.dropzone) {
      els.dropzone.addEventListener('click', function () { if (els.fileInput && !els.fileInput.disabled) els.fileInput.click(); });
      els.dropzone.addEventListener('dragover', function (e) { e.preventDefault(); els.dropzone.classList.add('drag'); });
      els.dropzone.addEventListener('dragleave', function () { els.dropzone.classList.remove('drag'); });
      els.dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        els.dropzone.classList.remove('drag');
        handleFiles(e.dataTransfer.files);
      });
    }
    if (els.fileInput) {
      els.fileInput.addEventListener('change', function () {
        handleFiles(this.files);
        this.value = '';
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (els.closeModal.classList.contains('active')) closeCloseModal();
      }
    });

    window.addEventListener('beforeunload', function (e) {
      if (!state.currentTicket) return;
      var anyDirty = state.dirty.remarks || state.dirty.resolution || state.dirty.internal;
      ['remarks', 'resolution', 'internal'].forEach(function (field) {
        clearTimeout(state.debounceTimers[field]);
        var textarea = field === 'remarks' ? els.inputRemarks : field === 'resolution' ? els.inputResolution : els.inputInternal;
        if (textarea && textarea.value.trim()) {
          try {
            navigator.sendBeacon(API_BASE + '/api/admin/ticket/' + encodeURIComponent(state.currentTicket.id || state.currentTicket.ticket_number) + '/note', new Blob(
              [JSON.stringify({ message: (field === 'remarks' ? 'Engineer Remarks' : field === 'resolution' ? 'Resolution Notes' : 'Internal Notes') + ': ' + textarea.value.trim(), sender: 'engineer' })],
              { type: 'application/json' }
            ));
          } catch (err) {}
        }
      });
      persistWorkspaceState();
      if (anyDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  window.EngineerResolution = { init: init };
})();
