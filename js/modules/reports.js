/* ═══════════════════════════════════════════════════════════════
   REPORTS & ANALYTICS — COMMAND CENTER
   js/modules/reports.js  (cc- namespace)
   STEP 1-2 · Masthead · Command bar · Signal strip · Bands 01-02
   Rebuilt from scratch · Reuses ONLY backend APIs
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';
  var DAY = 86400000;
  var HOUR = 3600000;
  var SLA_HOURS = { high: 4, medium: 24, low: 72 };
  var SLA_STATUSES = { 'Open': true, 'In Progress': true, 'Waiting User': true };

  var STATUS_ORDER = ['Open', 'In Progress', 'Waiting User', 'Escalated', 'Resolved', 'Closed'];
  var STATUS_COLORS = {
    'Open': '#3B82F6', 'In Progress': '#F59E0B', 'Waiting User': '#94A3B8',
    'Escalated': '#EF4444', 'Resolved': '#10B981', 'Closed': '#6B7280'
  };
  var PRI_COLORS = { high: '#DC2626', medium: '#D97706', low: '#15803D' };
  var CAT_COLORS = ['#1F7A8C', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#64748B'];

  /* Permanent color per department — same color everywhere in Reports */
  var DEPT_COLORS = {
    'Hardware Support': '#1F7A8C',
    'Desktop Support': '#3B82F6',
    'Network Operations': '#10B981',
    'Security Operations': '#EF4444',
    'Cloud Infrastructure': '#8B5CF6',
    'Email & Collaboration': '#EC4899',
    'Network & VPN': '#06B6D4',
    'Database Team': '#022B3A',
    'Linux Administration': '#6366F1',
    'Windows Administration': '#64748B',
    'Identity & Access': '#F59E0B',
    'ERP / SAP': '#175E6B',
    'Application Support': '#14B8A6',
    'DevOps': '#A21CAF',
    'Platform Engineering': '#1E40AF',
    'AI Operations': '#7E22CE',
    'Database & SQL': '#022B3A',
    'Windows & OS': '#64748B'
  };
  var DEPT_FALLBACK = ['#1F7A8C', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#F59E0B', '#6366F1', '#022B3A', '#14B8A6', '#64748B'];
  function deptColor(d) {
    if (DEPT_COLORS[d]) return DEPT_COLORS[d];
    var h = 0;
    for (var i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) >>> 0;
    return DEPT_FALLBACK[h % DEPT_FALLBACK.length];
  }

  /* Draws the stacked-total value at the end of every horizontal bar */
  var valueLabelsPlugin = {
    id: 'valueLabels',
    afterDatasetsDraw: function (chart) {
      var meta = chart.getDatasetMeta(0);
      var ds = chart.data.datasets;
      if (!meta.data || !meta.data.length || !chart.scales.x) return;
      var ctx = chart.ctx;
      ctx.save();
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = textColor();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      for (var i = 0; i < meta.data.length; i++) {
        var total = 0;
        for (var j = 0; j < ds.length; j++) total += (ds[j].data[i] || 0);
        if (!total) continue;
        ctx.fillText(String(total), chart.scales.x.getPixelForValue(total) + 8, meta.data[i].y);
      }
      ctx.restore();
    }
  };

  var state = {
    tickets: [],
    engineers: [],
    filters: { range: '30', department: 'all', engineer: 'all', priority: 'all', status: 'all' },
    drill: null,
    chartInstances: {}
  };

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  function isDark() { return document.body.classList.contains('dark-theme'); }
  function textColor() { return isDark() ? '#cbd5e1' : '#475569'; }
  function gridColor() { return isDark() ? 'rgba(148,163,184,.12)' : 'rgba(148,163,184,.16)'; }

  /* ── Normalizers ─────────────────────────────────────────── */
  function normStatus(s) {
    s = String(s == null ? 'Open' : s).toLowerCase().trim();
    var map = {
      'open': 'Open', 'in progress': 'In Progress', 'in-progress': 'In Progress',
      'waiting user': 'Waiting User', 'pending user': 'Waiting User',
      'escalated': 'Escalated', 'resolved': 'Resolved', 'closed': 'Closed'
    };
    if (map[s]) return map[s];
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function normPriority(p) {
    p = String(p == null ? 'medium' : p).toLowerCase().trim();
    return (p === 'high' || p === 'medium' || p === 'low') ? p : 'medium';
  }
  function normEngineer(t) { return t.assignedEngineer || t.assigned_engineer || t.assigned_engineer_name || ''; }
  function normDepartment(t) { return (t.department || t.assignedTeam || '').trim() || 'Uncategorized'; }
  function normCategory(t) { return (t.category || '').trim() || (t.assignedTeam || '').trim() || 'Uncategorized'; }
  function parseDate(v) { if (!v) return null; var d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  function getDate(t, field) { return parseDate(t[field] || t[field + '_at']); }
  function hoursBetween(a, b) { return (b - a) / HOUR; }
  function isResolvedStatus(s) { return s === 'Resolved' || s === 'Closed'; }
  function isSlaStatus(s) { return !!SLA_STATUSES[s]; }
  function slaHours(p) { return SLA_HOURS[normPriority(p)] || 24; }
  function isBreached(t) {
    if (!isSlaStatus(normStatus(t.status))) return false;
    var c = getDate(t, 'created');
    if (!c) return false;
    return hoursBetween(c, new Date()) > slaHours(t.priority);
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str == null ? '' : String(str)));
    return d.innerHTML;
  }
  function fmtNum(n) { return n == null || isNaN(n) ? '—' : String(n); }
  function fmtPct(n) { return n == null ? '—' : n + '%'; }
  function fmtDuration(hours) {
    if (hours == null || isNaN(hours)) return '—';
    if (hours < 1) return Math.round(hours * 60) + 'm';
    if (hours < 24) return Math.round(hours * 10) / 10 + 'h';
    var d = Math.floor(hours / 24), h = Math.round(hours % 24);
    return h > 0 ? d + 'd ' + h + 'h' : d + 'd';
  }

  /* ── Loading ─────────────────────────────────────────────── */
  function fetchJson(url) {
    return fetch((API_BASE || '') + url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function fetchWithRetry(url, attempts, delay) {
    attempts = attempts || 3;
    delay = delay || 400;
    function tryOnce(n) {
      return fetchJson(url).catch(function (err) {
        if (n >= attempts) throw err;
        return new Promise(function (r) { setTimeout(r, delay); }).then(function () { return tryOnce(n + 1); });
      });
    }
    return tryOnce(1);
  }

  function loadData(done) {
    return Promise.all([
      fetchWithRetry('/api/tickets'),
      fetchWithRetry('/api/admin/engineers')
    ]).then(function (results) {
      state.tickets = results[0] || [];
      state.engineers = (results[1] || []).map(function (e) { return e.name; });
      var build = qs('[data-build-banner]');
      if (build) build.textContent = new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      try {
        populateFilters();
        renderAll();
      } catch (e) {
        try { console.error('[reports] render failed:', e); } catch (err) {}
      }
      var sync = qs('[data-sync-time]');
      if (sync) sync.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      var footerSync = qs('[data-footer-sync]');
      if (footerSync) footerSync.textContent = sync ? sync.textContent : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      var dbCount = qs('[data-db-count]');
      if (dbCount) dbCount.textContent = fmtNum(state.tickets.length);
      if (done) done();
    }).catch(function () {
      var grid = qs('[data-signals]');
      if (grid) grid.innerHTML = '<div class="cc-load-error">Unable to load data. Please refresh.</div>';
      if (done) done();
    });
  }

  /* ── Filters ─────────────────────────────────────────────── */
  function populateFilters() {
    var eng = qs('[data-filter="engineer"]');
    if (eng) {
      var names = {};
      state.engineers.forEach(function (n) { if (n) names[n] = true; });
      state.tickets.forEach(function (t) { var e = normEngineer(t); if (e) names[e] = true; });
      var opts = ['<option value="all">All engineers</option>'];
      Object.keys(names).sort().forEach(function (n) {
        opts.push('<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>');
      });
      eng.innerHTML = opts.join('');
    }
    var dept = qs('[data-filter="department"]');
    if (dept) {
      var depts = {};
      state.tickets.forEach(function (t) { var d = normDepartment(t); if (d !== 'Uncategorized') depts[d] = true; });
      var dOpts = ['<option value="all">All departments</option>'];
      Object.keys(depts).sort().forEach(function (d) {
        dOpts.push('<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + '</option>');
      });
      dept.innerHTML = dOpts.join('');
    }
  }

  function applyFilters() {
    var f = state.filters;
    return state.tickets.filter(function (t) {
      if (f.range !== 'all') {
        var c = getDate(t, 'created');
        if (!c) return false;
        if (Date.now() - c.getTime() > parseInt(f.range, 10) * DAY) return false;
      }
      if (f.department !== 'all' && normDepartment(t) !== f.department) return false;
      if (f.engineer !== 'all' && normEngineer(t) !== f.engineer) return false;
      if (f.priority !== 'all' && normPriority(t.priority) !== f.priority) return false;
      if (f.status !== 'all' && normStatus(t.status) !== f.status) return false;
      return true;
    });
  }

  /* ── Drill-down ──────────────────────────────────────────── */
  function setDrill(drill) {
    state.drill = drill;
    var bar = qs('[data-drillbar]');
    var chip = qs('[data-drill-chip]');
    if (bar && chip) {
      bar.hidden = !drill;
      if (drill) chip.textContent = drill.label;
    }
    renderAll();
  }
  function clearDrill() { setDrill(null); }

  function getVisible() {
    var list = applyFilters();
    if (state.drill && state.drill.test) list = list.filter(state.drill.test);
    return list;
  }

  /* ── Signal strip ────────────────────────────────────────── */
  function countDelta24(tickets, predicate) {
    var now = Date.now(), cur = 0, prev = 0;
    tickets.forEach(function (t) {
      if (predicate && !predicate(t)) return;
      var d = getDate(t, 'created');
      if (!d) return;
      var h = Math.floor((now - d.getTime()) / HOUR);
      if (h >= 0 && h < 24) cur++;
      else if (h >= 24 && h < 48) prev++;
    });
    return { cur: cur, prev: prev };
  }
  function deltaArrow(c) { return c === 'good' ? '↑' : (c === 'bad' ? '↓' : ''); }
  function deltaText(f) {
    if (f.cur === 0 && f.prev === 0) return { t: 'No 24h activity', c: '' };
    if (f.prev === 0) return { t: '+' + f.cur, c: f.cur > 0 ? 'good' : '' };
    var d = f.cur - f.prev;
    return { t: (d >= 0 ? '+' : '') + d + ' vs yesterday', c: d >= 0 ? 'good' : 'bad' };
  }

  function renderSignals(tickets) {
    var total = tickets.length;
    var open = tickets.filter(function (t) { return normStatus(t.status) === 'Open'; }).length;
    var inProgress = tickets.filter(function (t) { return normStatus(t.status) === 'In Progress'; }).length;
    var escalated = tickets.filter(function (t) { return normStatus(t.status) === 'Escalated'; }).length;

    var active = tickets.filter(function (t) { return isSlaStatus(normStatus(t.status)); });
    var breachedCount = active.filter(isBreached).length;
    var slaPct = active.length ? Math.round(((active.length - breachedCount) / active.length) * 100) : null;

    var signals = {
      total:      { v: fmtNum(total), delta: deltaText(countDelta24(tickets)) },
      open:       { v: fmtNum(open), delta: deltaText(countDelta24(tickets, function (t) { return normStatus(t.status) === 'Open'; })) },
      inprogress: { v: fmtNum(inProgress), delta: deltaText(countDelta24(tickets, function (t) { return normStatus(t.status) === 'In Progress'; })) },
      sla:        { v: fmtPct(slaPct), delta: { t: active.length ? (active.length - breachedCount) + ' of ' + active.length + ' within SLA' : 'no active', c: breachedCount ? 'bad' : 'good' } },
      escalated:  { v: fmtNum(escalated), delta: { t: escalated + ' escalated', c: escalated ? 'bad' : '' } }
    };

    qsa('[data-signal]').forEach(function (el) {
      var key = el.getAttribute('data-signal');
      var s = signals[key];
      if (!s) return;
      var valEl = el.querySelector('[data-signal-value]');
      var deltaEl = el.querySelector('[data-signal-delta]');
      if (valEl) valEl.textContent = s.v;
      if (deltaEl) {
        var arrow = deltaArrow(s.delta.c);
        deltaEl.className = 'cc-signal-delta mono' + (s.delta.c ? ' ' + s.delta.c : '');
        deltaEl.innerHTML = (arrow ? '<span class="cc-signal-arrow">' + arrow + '</span>' : '') +
          '<span>' + s.delta.t + '</span>';
      }
    });
  }

  /* ── Chart helpers ───────────────────────────────────────── */
  function destroyChart(key) { var c = state.chartInstances[key]; if (c) { try { c.destroy(); } catch (e) {} delete state.chartInstances[key]; } }
  function chartCanvas(key) { return document.querySelector('[data-chart="' + key + '"]'); }
  function chartEmpty(key) { return document.querySelector('[data-empty="' + key + '"]'); }
  function setChartData(key, has) {
    var c = chartCanvas(key), e = chartEmpty(key);
    if (c) c.style.display = has ? 'block' : 'none';
    if (e) e.hidden = has;
  }
  function tooltipStyle() {
    return {
      backgroundColor: isDark() ? '#1A1D24' : '#ffffff',
      titleColor: isDark() ? '#F1F5F9' : '#111827',
      bodyColor: isDark() ? '#94A3B8' : '#6B7280',
      borderColor: isDark() ? '#2D3139' : '#E5E7EB',
      borderWidth: 1, cornerRadius: 8, padding: 10,
      titleFont: { family: 'Manrope', weight: '800', size: 12 },
      bodyFont: { family: 'JetBrains Mono', size: 11 }
    };
  }
  function baseOptions(extra) {
    var o = {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      interaction: { mode: 'nearest', intersect: true },
      layout: { padding: { top: 10 } },
      plugins: {
        legend: {
          position: 'bottom',
          align: 'center',
          labels: {
            color: textColor(),
            padding: 20,
            boxWidth: 14,
            boxHeight: 14,
            usePointStyle: true,
            pointStyle: 'circle',
            pointStyleWidth: 9,
            font: { family: 'Manrope', size: 11.5, weight: '700' }
          }
        },
        tooltip: tooltipStyle()
      }
    };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function lineGradient(hex, alpha) {
    return function (ctx) {
      var g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, hexToRgba(hex, alpha));
      g.addColorStop(1, hexToRgba(hex, 0));
      return g;
    };
  }
  function hexToRgba(hex, a) {
    var h = hex.replace('#', '');
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function subText(key, text) { var el = qs('[data-sub="' + key + '"]'); if (el) el.textContent = text; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* ── Trend chart ─────────────────────────────────────────── */
  function renderTrend(tickets) {
    destroyChart('trend');
    var now = new Date();
    var labels = [], created = [], resolved = [], escalated = [], closed = [];
    for (var i = 29; i >= 0; i--) {
      var d = new Date(now); d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      created.push(0); resolved.push(0); escalated.push(0); closed.push(0);
    }
    tickets.forEach(function (t) {
      var c = getDate(t, 'created');
      if (c) { var dc = Math.floor((now - c) / DAY); if (dc >= 0 && dc <= 29) created[29 - dc]++; }
      if (isResolvedStatus(normStatus(t.status))) {
        var u = getDate(t, 'updated');
        if (u) { var du = Math.floor((now - u) / DAY); if (du >= 0 && du <= 29) { if (normStatus(t.status) === 'Closed') closed[29 - du]++; else resolved[29 - du]++; } }
      }
      if (normStatus(t.status) === 'Escalated') {
        var ce = getDate(t, 'created');
        if (ce) { var de = Math.floor((now - ce) / DAY); if (de >= 0 && de <= 29) escalated[29 - de]++; }
      }
    });
    var empty = created.reduce(function (a, b) { return a + b; }, 0) + resolved.reduce(function (a, b) { return a + b; }, 0) +
      escalated.reduce(function (a, b) { return a + b; }, 0) + closed.reduce(function (a, b) { return a + b; }, 0) === 0;
    setChartData('trend', !empty);
    subText('trend', created.reduce(function (a, b) { return a + b; }, 0) + ' opened · ' + resolved.reduce(function (a, b) { return a + b; }, 0) + ' resolved');
    if (empty) return;

    var seriesDefs = [
      { key: 'created', label: 'Created', data: created, color: '#1F7A8C', fill: 0.08 },
      { key: 'resolved', label: 'Resolved', data: resolved, color: '#10B981', fill: 0.06 },
      { key: 'escalated', label: 'Escalated', data: escalated, color: '#EF4444', fill: 0 },
      { key: 'closed', label: 'Closed', data: closed, color: '#94A3B8', fill: 0 }
    ];
    var days = labels.map(function (l, i) {
      var dd = new Date(now); dd.setDate(dd.getDate() - (29 - i));
      return dd.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
    });

    state.chartInstances.trend = new Chart(chartCanvas('trend'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: seriesDefs.map(function (s) {
          return {
            label: s.label, data: s.data, borderColor: s.color,
            backgroundColor: s.fill ? lineGradient(s.color, s.fill) : 'transparent',
            fill: !!s.fill, tension: 0.4, borderWidth: s.key === 'created' ? 2 : 1.75, borderCapStyle: 'round', borderJoinStyle: 'round',
            pointRadius: 0, pointHoverRadius: 6, pointHitRadius: 14, pointHoverBackgroundColor: s.color, pointHoverBorderColor: '#ffffff', pointHoverBorderWidth: 2.5
          };
        })
      },
      options: baseOptions({
        onClick: function (evt, els) {
          if (!els || !els.length) return;
          var el = els[0];
          var def = seriesDefs[el.datasetIndex];
          if (!def) return;
          var day = days[el.index];
          setDrill({
            label: def.label + ' · ' + labels[el.index],
            test: function (t) {
              var d = def.key === 'created' ? getDate(t, 'created') : (def.key === 'escalated' ? getDate(t, 'created') : getDate(t, 'updated'));
              if (!d) return false;
              var match = d.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }) === day;
              if (!match) return false;
              if (def.key === 'resolved') return normStatus(t.status) === 'Resolved';
              if (def.key === 'closed') return normStatus(t.status) === 'Closed';
              if (def.key === 'escalated') return normStatus(t.status) === 'Escalated';
              return true;
            }
          });
        },
        scales: {
          x: { grid: { display: false }, border: { color: gridColor() }, ticks: { color: textColor(), font: { family: 'Manrope', size: 10.5 }, maxTicksLimit: 8, maxRotation: 0 } },
          y: { beginAtZero: true, grid: { color: isDark() ? 'rgba(148,163,184,.09)' : 'rgba(148,163,184,.11)' }, border: { display: false }, ticks: { precision: 0, color: textColor(), font: { family: 'JetBrains Mono', size: 11 } } }
        },
        layout: { padding: { top: 4, right: 18, bottom: 0, left: 12 } },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'center',
            labels: {
              color: textColor(), padding: 14, boxWidth: 12, boxHeight: 12,
              usePointStyle: true, pointStyle: 'circle', pointStyleWidth: 8,
              font: { family: 'Manrope', size: 10, weight: '700' }
            }
          },
          tooltip: tooltipStyle()
        }
      })
    });
  }

  /* ── Status mix doughnut ─────────────────────────────────── */
  function renderStatusMix(tickets) {
    destroyChart('statusmix');
    var counts = {};
    tickets.forEach(function (t) { var s = normStatus(t.status); counts[s] = (counts[s] || 0) + 1; });
    var labels = STATUS_ORDER.filter(function (s) { return counts[s]; });
    var empty = labels.length === 0;
    setChartData('statusmix', !empty);
    subText('statusmix', empty ? '—' : labels.length + ' statuses · ' + tickets.length + ' tickets');
    if (empty) return;
    state.chartInstances.statusmix = new Chart(chartCanvas('statusmix'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: labels.map(function (s) { return counts[s]; }),
          backgroundColor: labels.map(function (s) { return STATUS_COLORS[s]; }),
          borderColor: isDark() ? '#1A1D24' : '#ffffff',
          borderWidth: 3, hoverOffset: 8, borderRadius: 4, spacing: 3
        }]
      },
      options: baseOptions({
        cutout: '64%',
        layout: { padding: { top: 26, right: 2, bottom: 22, left: 16 } },
        onClick: function (evt, els) {
          if (!els || !els.length) return;
          var s = labels[els[0].index];
          setDrill({ label: 'Status · ' + s, test: function (t) { return normStatus(t.status) === s; } });
        },
        plugins: {
          legend: {
            position: 'right',
            align: 'center',
            labels: {
              color: textColor(), padding: 8, boxWidth: 10, boxHeight: 10,
              usePointStyle: true, pointStyle: 'rectRounded', pointStyleWidth: 8,
              font: { family: 'Manrope', size: 10, weight: '700' },
              generateLabels: function (chart) {
                var ds = chart.data.datasets[0];
                return chart.data.labels.map(function (label, i) {
                  return { text: label + '  ' + ds.data[i], fillStyle: ds.backgroundColor[i], strokeStyle: ds.backgroundColor[i], pointStyle: 'rectRounded', hidden: false, index: i };
                });
              }
            }
          },
          tooltip: Object.assign(tooltipStyle(), {
            callbacks: { label: function (ctx) { var tot = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0); return ' ' + ctx.label + ': ' + ctx.parsed + ' (' + (tot ? Math.round(ctx.parsed / tot * 100) : 0) + '%)'; } }
          })
        }
      })
    });
  }

  /* ── Funnel ──────────────────────────────────────────────── */
  function renderFunnel(tickets) {
    var el = qs('[data-funnel]');
    if (!el) return;
    var total = tickets.length;
    var assigned = tickets.filter(function (t) { return normEngineer(t); }).length;
    var working = tickets.filter(function (t) { var s = normStatus(t.status); return s === 'In Progress' || s === 'Waiting User' || s === 'Escalated'; }).length;
    var resolved = tickets.filter(function (t) { return normStatus(t.status) === 'Resolved'; }).length;
    var closed = tickets.filter(function (t) { return normStatus(t.status) === 'Closed'; }).length;
    var base = total || 1;

    var stages = [
      { key: 'open', name: 'Open', count: total },
      { key: 'assigned', name: 'Assigned', count: assigned },
      { key: 'working', name: 'Working', count: working },
      { key: 'resolved', name: 'Resolved', count: resolved },
      { key: 'closed', name: 'Closed', count: closed }
    ];

    subText('funnel', total + ' in funnel');
    var meta = qs('[data-band-meta="flow"]');
    if (meta) meta.textContent = total + ' tickets · ' + (total ? Math.round(resolved / total * 100) : 0) + '% resolved';

    if (!total) {
      el.innerHTML = '<div class="cc-funnel-note">Create tickets to see the lifecycle funnel.</div>';
      return;
    }
    var activeKey = (state.drill && state.drill.scope === 'funnel') ? state.drill.funnelKey : null;
    el.innerHTML = stages.map(function (s, i) {
      var conv = i === 0 ? '100%' : (stages[i - 1].count ? Math.round(s.count / stages[i - 1].count * 100) + '%' : '0%');
      var cls = 'cc-funnel-stage';
      if (activeKey) cls += s.key === activeKey ? ' is-active' : ' is-dim';
      if (!s.count) cls += ' is-zero';
      return '<button type="button" class="' + cls + '" data-stage="' + s.key + '" style="--w:0%">' +
        '<span class="cc-funnel-label"><span class="cc-funnel-dot"></span>' + s.name + '</span>' +
        '<span class="cc-funnel-track"><span class="cc-funnel-bar"></span><span class="cc-funnel-count">' + s.count + '</span></span>' +
        '<span class="cc-funnel-conv">' + conv + '</span>' +
        '</button>';
    }).join('') + '<div class="cc-funnel-note">Click a stage to drill in · click again to clear</div>';
    requestAnimationFrame(function () {
      qsa('[data-funnel] [data-stage]').forEach(function (st) {
        var bar = st.querySelector('.cc-funnel-bar');
        var stage = stages.filter(function (x) { return x.key === st.getAttribute('data-stage'); })[0];
        if (bar && stage) {
          var pct = Math.max(Math.round(stage.count / base * 100), stage.count ? 8 : 0);
          bar.style.width = pct + '%';
          st.style.setProperty('--w', pct + '%');
        }
      });
    });
  }
  function bindFunnel() {
    var el = qs('[data-funnel]');
    if (!el) return;
    el.addEventListener('click', function (e) {
      var st = e.target.closest('[data-stage]');
      if (!st) return;
      var key = st.getAttribute('data-stage');
      if (state.drill && state.drill.scope === 'funnel' && state.drill.funnelKey === key) { clearDrill(); return; }
      var defs = {
        open: { label: 'Stage: Open', test: function () { return true; } },
        assigned: { label: 'Stage: Assigned', test: function (t) { return !!normEngineer(t); } },
        working: { label: 'Stage: Working', test: function (t) { var s = normStatus(t.status); return s === 'In Progress' || s === 'Waiting User' || s === 'Escalated'; } },
        resolved: { label: 'Stage: Resolved', test: function (t) { return normStatus(t.status) === 'Resolved'; } },
        closed: { label: 'Stage: Closed', test: function (t) { return normStatus(t.status) === 'Closed'; } }
      };
      var d = defs[key];
      if (d) setDrill({ scope: 'funnel', funnelKey: key, label: d.label, test: d.test });
    });
  }

  /* ── Priority urgency chart ──────────────────────────────── */
  function renderPriority(tickets) {
    destroyChart('priority');
    var levels = ['high', 'medium', 'low'];
    var labelMap = { high: 'High', medium: 'Medium', low: 'Low' };
    var colorMap = { high: '#DC2626', medium: '#F97316', low: '#10B981' };
    var counts = [0, 0, 0];
    tickets.forEach(function (t) {
      var idx = levels.indexOf(normPriority(t.priority));
      if (idx !== -1) counts[idx]++;
    });
    var total = counts.reduce(function (a, b) { return a + b; }, 0);
    setChartData('priority', total > 0);
    subText('priority', total + ' tickets · ' + levels.map(function (l, i) { return labelMap[l] + ' ' + counts[i]; }).join(' · '));
    var meta = qs('[data-band-meta="volume"]');
    if (meta) meta.textContent = tickets.length + ' tickets in view';
    if (!total) return;

    state.chartInstances.priority = new Chart(chartCanvas('priority'), {
      type: 'bar',
      data: {
        labels: levels.map(function (l) { return labelMap[l]; }),
        datasets: [{
          label: 'Tickets',
          data: counts,
          backgroundColor: levels.map(function (l) { return colorMap[l]; }),
          borderRadius: 6, borderSkipped: false, barThickness: 'flex', maxBarThickness: 24
        }]
      },
      plugins: [valueLabelsPlugin],
      options: baseOptions({
        indexAxis: 'y',
        layout: { padding: { top: 6, right: 30, bottom: 2 } },
        onClick: function (evt, els) {
          if (!els || !els.length) return;
          var pri = levels[els[0].index];
          setDrill({ label: 'Priority · ' + labelMap[pri], test: function (t) { return normPriority(t.priority) === pri; } });
        },
        scales: {
          x: { beginAtZero: true, grid: { color: gridColor() }, border: { display: false }, ticks: { precision: 0, color: textColor(), font: { family: 'JetBrains Mono', size: 12.5 } } },
          y: { grid: { display: false }, border: { color: gridColor() }, categoryPercentage: 0.5, barPercentage: 0.9, ticks: { color: isDark() ? '#F1F5F9' : '#111827', font: { family: 'Manrope', size: 12, weight: '700' }, padding: 24 } }
        },
        plugins: {
          legend: { display: false },
          tooltip: tooltipStyle()
        }
      })
    });
  }

  /* ── Category mix doughnut ──────────────────────────────── */
  function renderCategory(tickets) {
    destroyChart('category');
    var counts = {};
    tickets.forEach(function (t) { var c = normCategory(t); counts[c] = (counts[c] || 0) + 1; });
    var labels = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var empty = labels.length === 0;
    setChartData('category', !empty);
    subText('category', empty ? '—' : plural(labels.length, 'category', 'categories') + ' · ' + tickets.length + ' tickets');
    var meta = qs('[data-band-meta="worktype"]');
    if (meta) meta.textContent = plural(labels.length, 'category', 'categories') + ' · ' + tickets.length + ' tickets';
    if (empty) return;
    state.chartInstances.category = new Chart(chartCanvas('category'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: labels.map(function (l) { return counts[l]; }),
          backgroundColor: labels.map(function (l, i) { return CAT_COLORS[i % CAT_COLORS.length]; }),
          borderColor: isDark() ? '#1A1D24' : '#ffffff',
          borderWidth: 3, hoverOffset: 8, borderRadius: 4, spacing: 3
        }]
      },
      options: baseOptions({
        cutout: '60%',
        onClick: function (evt, els) {
          if (!els || !els.length) return;
          var c = labels[els[0].index];
          setDrill({ label: 'Category · ' + c, test: function (t) { return normCategory(t) === c; } });
        },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'center',
            labels: {
              color: textColor(), padding: 12, boxWidth: 12, boxHeight: 12,
              usePointStyle: true, pointStyle: 'rectRounded', pointStyleWidth: 10,
              font: { family: 'Manrope', size: 11, weight: '700' },
              generateLabels: function (chart) {
                var ds = chart.data.datasets[0];
                return chart.data.labels.map(function (label, i) {
                  return { text: label + '  ' + ds.data[i], fillStyle: ds.backgroundColor[i], strokeStyle: ds.backgroundColor[i], pointStyle: 'rectRounded', hidden: false, index: i };
                });
              }
            }
          },
          tooltip: Object.assign(tooltipStyle(), {
            callbacks: { label: function (ctx) { var tot = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0); return ' ' + ctx.label + ': ' + ctx.parsed + ' (' + (tot ? Math.round(ctx.parsed / tot * 100) : 0) + '%)'; } }
          })
        }
      })
    });
  }

  /* ── Arrival heatmap ────────────────────────────────────── */
  var HEAT_COLS = 12; /* two-hour buckets: 00-23h */
  var HEAT_HOURS = 24;
  function heatCellValue(h) { return Math.min(HEAT_COLS - 1, Math.floor(h / (HEAT_HOURS / HEAT_COLS))); }
  function heatCellClass(v, max) {
    if (!v) return 'heat-0';
    var r = max > 0 ? v / max : 0;
    if (r > 0.8) return 'heat-5';
    if (r > 0.6) return 'heat-4';
    if (r > 0.4) return 'heat-3';
    if (r > 0.2) return 'heat-2';
    return 'heat-1';
  }
  function renderHeatmap(tickets) {
    var el = qs('[data-heatmap]');
    var empty = qs('[data-empty="heatmap"]');
    if (!el) return;
    var grid = {};
    var max = 0;
    var dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    tickets.forEach(function (t) {
      var d = getDate(t, 'created');
      if (!d) return;
      var key = d.getDay() + '-' + heatCellValue(d.getHours());
      grid[key] = (grid[key] || 0) + 1;
      if (grid[key] > max) max = grid[key];
    });
    var hasData = tickets.some(function (t) { return getDate(t, 'created'); });
    var sub = qs('[data-sub="heatmap"]');
    if (sub) sub.textContent = hasData ? tickets.length + ' arrivals · 2h buckets' : '—';
    if (el) el.style.display = hasData ? '' : 'none';
    if (empty) empty.hidden = hasData;
    if (!hasData) return;

    var html = '<div class="cc-heat-grid">';
    html += '<span class="cc-heat-ax"></span>';
    for (var h = 0; h < HEAT_COLS; h++) {
      var hs = String(h * (HEAT_HOURS / HEAT_COLS)).padStart(2, '0') + ':00';
      html += '<span class="cc-heat-ax">' + hs + '</span>';
    }
    for (var d = 0; d < 7; d++) {
      html += '<span class="cc-heat-day">' + dayOrder[d] + '</span>';
      for (var c = 0; c < HEAT_COLS; c++) {
        var v = grid[d + '-' + c] || 0;
        var cls = heatCellClass(v, max);
        html += '<button type="button" class="cc-heat-cell ' + cls + '" data-heat-day="' + d + '" data-heat-col="' + c + '" ' +
          (v ? 'title="' + dayOrder[d] + ' ' + String(c * (HEAT_HOURS / HEAT_COLS)).padStart(2, '0') + ':00 — ' + v + ' ticket' + (v > 1 ? 's' : '') + '"' : '') + '>' +
          (v ? v : '') + '</button>';
      }
    }
    html += '</div>';
    html += '<div class="cc-heat-leg"><span>Fewer</span><span class="cc-heat-swatches">' +
      '<span class="cc-heat-swatch" data-s="0"></span><span class="cc-heat-swatch" data-s="1"></span>' +
      '<span class="cc-heat-swatch" data-s="2"></span><span class="cc-heat-swatch" data-s="3"></span>' +
      '<span class="cc-heat-swatch" data-s="4"></span><span class="cc-heat-swatch" data-s="5"></span>' +
      '</span><span>More</span></div>';
    el.innerHTML = html;
  }
  function bindHeatmap() {
    var el = qs('[data-heatmap]');
    if (!el) return;
    el.addEventListener('click', function (e) {
      var cell = e.target.closest('[data-heat-day]');
      if (!cell) return;
      var day = parseInt(cell.getAttribute('data-heat-day'), 10);
      var col = parseInt(cell.getAttribute('data-heat-col'), 10);
      var fromH = col * (HEAT_HOURS / HEAT_COLS);
      var toH = fromH + (HEAT_HOURS / HEAT_COLS);
      var dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
      setDrill({
        label: 'Arrivals · ' + dayName + ' ' + String(fromH).padStart(2, '0') + ':00',
        test: function (t) {
          var d = getDate(t, 'created');
          if (!d) return false;
          var h = d.getHours();
          return d.getDay() === day && h >= fromH && h < toH;
        }
      });
    });
  }

  /* ── Engineer workload (horizontal stacked) ─────────────── */
  function renderEngineer(tickets) {
    destroyChart('engineer');
    var counts = {};
    tickets.forEach(function (t) {
      var e = normEngineer(t);
      if (!e) return;
      if (!counts[e]) counts[e] = { active: 0, done: 0 };
      if (isResolvedStatus(normStatus(t.status))) counts[e].done++;
      else counts[e].active++;
    });
    var names = Object.keys(counts).sort(function (a, b) { return (counts[b].active + counts[b].done) - (counts[a].active + counts[a].done); });
    var empty = names.length === 0;
    setChartData('engineer', !empty);
    var activeT = names.reduce(function (s, n) { return s + counts[n].active; }, 0);
    var doneT = names.reduce(function (s, n) { return s + counts[n].done; }, 0);
    subText('engineer', empty ? '—' : names.length + ' engineers · ' + activeT + ' active · ' + doneT + ' resolved');
    var meta = qs('[data-band-meta="workforce"]');
    if (meta) meta.textContent = names.length + ' engineers · ' + tickets.length + ' tickets';
    if (empty) return;
    state.chartInstances.engineer = new Chart(chartCanvas('engineer'), {
      type: 'bar',
      data: {
        labels: names,
        datasets: [
          { label: 'Active', data: names.map(function (n) { return counts[n].active; }), backgroundColor: '#3B82F6', borderRadius: 6, borderSkipped: false, stack: 'w', barThickness: 'flex', maxBarThickness: 46 },
          { label: 'Resolved', data: names.map(function (n) { return counts[n].done; }), backgroundColor: '#10B981', borderRadius: 6, borderSkipped: false, stack: 'w', barThickness: 'flex', maxBarThickness: 46 }
        ]
      },
      plugins: [valueLabelsPlugin],
      options: baseOptions({
        indexAxis: 'y',
        layout: { padding: { top: 10, right: 34, bottom: 4 } },
        onClick: function (evt, els) {
          if (!els || !els.length) return;
          var el = els[0];
          var name = names[el.index];
          var isActive = el.datasetIndex === 0;
          setDrill({
            label: name + ' · ' + (isActive ? 'Active' : 'Resolved'),
            test: function (t) {
              if (normEngineer(t) !== name) return false;
              return isActive ? !isResolvedStatus(normStatus(t.status)) : isResolvedStatus(normStatus(t.status));
            }
          });
        },
        scales: {
          x: { stacked: true, beginAtZero: true, grid: { color: gridColor() }, border: { display: false }, ticks: { precision: 0, color: textColor(), font: { family: 'JetBrains Mono', size: 12.5 } } },
          y: { stacked: true, grid: { display: false }, border: { color: gridColor() }, categoryPercentage: 0.72, barPercentage: 0.9, ticks: { color: isDark() ? '#F1F5F9' : '#111827', font: { family: 'Manrope', size: 12.5, weight: '800' }, padding: 20 } }
        }
      })
    });
  }

  /* ── Department comparison (horizontal bar) ─────────────── */
  function renderDept(tickets) {
    destroyChart('dept');
    var counts = {};
    tickets.forEach(function (t) { var d = normDepartment(t); counts[d] = (counts[d] || 0) + 1; });
    var labels = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var empty = labels.length === 0;
    setChartData('dept', !empty);
    subText('dept', empty ? '—' : plural(labels.length, 'department', 'departments') + ' · ' + tickets.length + ' tickets');
    if (empty) return;
    state.chartInstances.dept = new Chart(chartCanvas('dept'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Tickets',
          data: labels.map(function (l) { return counts[l]; }),
          backgroundColor: labels.map(function (l) { return deptColor(l); }),
          borderRadius: 6, borderSkipped: false, barThickness: 'flex', maxBarThickness: 34
        }]
      },
      options: baseOptions({
        indexAxis: 'y',
        onClick: function (evt, els) {
          if (!els || !els.length) return;
          var d = labels[els[0].index];
          setDrill({ label: 'Department · ' + d, test: function (t) { return normDepartment(t) === d; } });
        },
        scales: {
          x: { beginAtZero: true, grid: { color: gridColor() }, border: { display: false }, ticks: { precision: 0, color: textColor(), font: { family: 'JetBrains Mono', size: 12.5 } } },
          y: { grid: { display: false }, border: { color: gridColor() }, categoryPercentage: 0.72, barPercentage: 0.85, ticks: { color: isDark() ? '#F1F5F9' : '#111827', font: { family: 'Manrope', size: 12, weight: '700' }, padding: 18 } }
        }
      })
    });
  }

  /* ── Resolution distribution ────────────────────────────────────── */
  function renderResolution(tickets) {
    destroyChart('resolution');
    var buckets = [
      { k: '<4h', lo: 0, hi: 4, c: '#10B981' },
      { k: '4–24h', lo: 4, hi: 24, c: '#22C55E' },
      { k: '1–3d', lo: 24, hi: 72, c: '#F59E0B' },
      { k: '3–7d', lo: 72, hi: 168, c: '#F97316' },
      { k: '>7d', lo: 168, hi: Infinity, c: '#EF4444' }
    ];
    var counts = buckets.map(function () { return 0; });
    var resolved = 0;
    tickets.forEach(function (t) {
      if (!isResolvedStatus(normStatus(t.status))) return;
      var c = getDate(t, 'created'), u = getDate(t, 'updated');
      if (!c || !u || u < c) return;
      resolved++;
      var h = hoursBetween(c, u);
      for (var i = 0; i < buckets.length; i++) {
        if (h >= buckets[i].lo && h < buckets[i].hi) { counts[i]++; break; }
      }
    });
    var empty = resolved === 0;
    setChartData('resolution', !empty);
    subText('resolution', empty ? '—' : plural(resolved, 'resolution tracked', 'resolutions tracked'));
    if (empty) return;
    state.chartInstances.resolution = new Chart(chartCanvas('resolution'), {
      type: 'bar',
      data: {
        labels: buckets.map(function (b) { return b.k; }),
        datasets: [{
          label: 'Tickets',
          data: counts,
          backgroundColor: buckets.map(function (b) { return b.c; }),
          borderRadius: 5, borderSkipped: false, barThickness: 30
        }]
      },
      options: baseOptions({
        onClick: function (evt, els) {
          if (!els || !els.length) return;
          var b = buckets[els[0].index];
          setDrill({
            label: 'Resolved · ' + b.k,
            test: function (t) {
              if (!isResolvedStatus(normStatus(t.status))) return false;
              var c = getDate(t, 'created'), u = getDate(t, 'updated');
              if (!c || !u) return false;
              var h = hoursBetween(c, u);
              return h >= b.lo && h < b.hi;
            }
          });
        },
        scales: {
          x: { grid: { display: false }, border: { color: gridColor() }, ticks: { color: textColor(), font: { family: 'Manrope', size: 11, weight: '700' } } },
          y: { beginAtZero: true, grid: { color: gridColor() }, border: { display: false }, ticks: { precision: 0, color: textColor(), font: { family: 'JetBrains Mono', size: 12.5 } } }
        }
      })
    });
  }

  /* ── Recent activity ────────────────────────────────────────────── */
  var ACTIVITY_ACTIONS = {
    created:   { label: 'Created',      icon: 'plus' },
    inprogress:{ label: 'In Progress',  icon: 'clock' },
    waiting:   { label: 'Waiting User', icon: 'user' },
    escalated: { label: 'Escalated',    icon: 'triangle-alert' },
    resolved:  { label: 'Resolved',     icon: 'check' },
    closed:    { label: 'Closed',       icon: 'archive' },
    updated:   { label: 'Updated',      icon: 'refresh-cw' }
  };
  function renderActivity(tickets) {
    var el = qs('[data-activity]');
    if (!el) return;
    if (!tickets.length) { el.innerHTML = '<li class="cc-activity-item"><span class="cc-activity-title">No activity in this view</span></li>'; return; }
    var events = [];
    tickets.forEach(function (t) {
      var c = getDate(t, 'created');
      if (c) events.push({ time: c, kind: 'created', title: 'Ticket ' + t.id + ' created' });
      var u = getDate(t, 'updated');
      if (u && u >= c) {
        var s = normStatus(t.status);
        var ev;
        if (s === 'Resolved') ev = { kind: 'resolved', title: 'Ticket ' + t.id + ' resolved successfully' };
        else if (s === 'Closed') ev = { kind: 'closed', title: 'Ticket ' + t.id + ' closed' };
        else if (s === 'Escalated') ev = { kind: 'escalated', title: 'Ticket ' + t.id + ' escalated' };
        else if (s === 'Waiting User') ev = { kind: 'waiting', title: 'Ticket ' + t.id + ' is waiting for user response' };
        else if (s === 'In Progress') ev = { kind: 'inprogress', title: 'Ticket ' + t.id + ' moved to In Progress' };
        else { var eng = normEngineer(t); ev = { kind: 'updated', title: 'Ticket ' + t.id + ' updated' + (eng ? ' by ' + eng : '') }; }
        events.push({ time: u, kind: ev.kind, title: ev.title });
      }
    });
    events.sort(function (a, b) { return b.time - a.time; });
    events = events.slice(0, 5);
    el.innerHTML = events.map(function (e) {
      var a = ACTIVITY_ACTIONS[e.kind] || ACTIVITY_ACTIONS.updated;
      return '<li class="cc-activity-item" data-kind="' + e.kind + '">' +
        '<span class="cc-activity-icon" aria-hidden="true"><i data-lucide="' + a.icon + '" size="13"></i></span>' +
        '<span class="cc-activity-body">' +
        '<span class="cc-activity-kicker">' + a.label + '</span>' +
        '<span class="cc-activity-title">' + escapeHtml(e.title) + '</span>' +
        '</span>' +
        '<span class="cc-activity-time">' + e.time.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</span>' +
        '</li>';
    }).join('') + '<a class="cc-activity-more" href="#band-ledger">View All <span aria-hidden="true">&rarr;</span></a>';
    requestAnimationFrame(function () { try { lucide.createIcons(); } catch (e) {} });
  }

  /* ── Ledger table ──────────────────────────────────────────────── */
  function statusPill(s) { return 'cc-pill cc-pill-status-' + s.replace(/\s+/g, ''); }
  function priPill(p) { return 'cc-pill cc-pill-pri-' + p; }
  function renderTable(tickets) {
    var body = qs('[data-ledger-body]');
    var wrap = qs('[data-ledger]');
    var empty = qs('[data-empty="table"]');
    if (!body) return;
    subText('table', plural(tickets.length, 'ticket', 'tickets') + ' in view');
    var meta = qs('[data-band-meta="ledger"]');
    if (meta) meta.textContent = tickets.length + ' of ' + state.tickets.length + ' tickets';
    if (!tickets.length) {
      body.innerHTML = '';
      if (wrap) wrap.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    if (wrap) wrap.hidden = false;
    if (empty) empty.hidden = true;
    var sorted = tableSort(tickets);
    body.innerHTML = sorted.map(function (t) {
      return '<tr data-id="' + escapeHtml(t.id) + '" tabindex="0" role="row">' +
        '<td class="cc-tid">' + escapeHtml(t.id) + '</td>' +
        '<td class="cc-subj" title="' + escapeHtml(t.issue || '') + '">' + escapeHtml(t.issue || '—') + '</td>' +
        '<td>' + escapeHtml(normDepartment(t)) + '</td>' +
        '<td>' + escapeHtml(normEngineer(t) || '—') + '</td>' +
        '<td><span class="' + priPill(normPriority(t.priority)) + '">' + escapeHtml(normPriority(t.priority)) + '</span></td>' +
        '<td><span class="' + statusPill(normStatus(t.status)) + '">' + escapeHtml(normStatus(t.status)) + '</span></td>' +
        '<td class="cc-time">' + escapeHtml(fmtDateShort(getDate(t, 'created'))) + '</td>' +
        '</tr>';
    }).join('');
  }
  function fmtDateShort(d) {
    if (!d) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  var tableSortState = { key: 'created', dir: -1 };
  function tableSort(tickets) {
    var key = tableSortState.key, dir = tableSortState.dir;
    var val = function (t) {
      switch (key) {
        case 'id': return t.id;
        case 'issue': return (t.issue || '').toLowerCase();
        case 'department': return normDepartment(t).toLowerCase();
        case 'engineer': return normEngineer(t).toLowerCase();
        case 'priority': return ['high', 'medium', 'low'].indexOf(normPriority(t.priority));
        case 'status': return STATUS_ORDER.indexOf(normStatus(t.status));
        case 'created': return getDate(t, 'created') ? getDate(t, 'created').getTime() : 0;
      }
      return '';
    };
    return tickets.slice().sort(function (a, b) {
      var av = val(a), bv = val(b);
      if (av === bv) return 0;
      if (av < bv) return -1 * dir;
      return 1 * dir;
    });
  }
  function bindTable() {
    var table = qs('[data-ledger]');
    if (!table) return;
    var heads = table.querySelectorAll('th[data-sort]');
    heads.forEach(function (th) {
      th.querySelector('button').addEventListener('click', function () {
        var key = th.getAttribute('data-sort');
        if (tableSortState.key === key) tableSortState.dir *= -1;
        else { tableSortState.key = key; tableSortState.dir = 1; }
        heads.forEach(function (h) {
          h.setAttribute('aria-sort', 'none');
          var old = h.querySelector('[data-ind]');
          if (old) old.remove();
        });
        th.setAttribute('aria-sort', tableSortState.dir === 1 ? 'ascending' : 'descending');
        var ind = document.createElement('span');
        ind.className = 'cc-sort-ind';
        ind.dataset.ind = '1';
        ind.textContent = tableSortState.dir === 1 ? '▲' : '▼';
        th.querySelector('button').appendChild(ind);
        renderTable(getVisible());
      });
    });
    table.addEventListener('click', function (e) {
      var row = e.target.closest('tr[data-id]');
      if (!row) return;
      table.querySelectorAll('tbody tr.is-selected').forEach(function (r) { r.classList.remove('is-selected'); });
      row.classList.add('is-selected');
      row.focus();
    });
  }

  /* ── Master render ───────────────────────────────────────── */
  function hasChart() { return typeof window.Chart === 'function'; }
  function safeRender(fn, arg) {
    try { fn(arg); } catch (e) { try { console.error('[reports] render error:', e); } catch (err) {} }
  }
  function renderAll() {
    var base, visible;
    try { base = applyFilters(); visible = getVisible(); } catch (e) { base = state.tickets || []; visible = base; }
    safeRender(renderSignals, visible);
    safeRender(renderFunnel, base);
    safeRender(renderHeatmap, visible);
    safeRender(renderActivity, visible);
    safeRender(renderTable, visible);
    if (hasChart()) {
      safeRender(renderTrend, visible);
      safeRender(renderStatusMix, visible);
      safeRender(renderPriority, visible);
      safeRender(renderCategory, visible);
      safeRender(renderEngineer, visible);
      safeRender(renderDept, visible);
      safeRender(renderResolution, visible);
    }
  }

  /* ── Export (visible from toolbar) ───────────────────────── */
  function exportCsv() {
    var tickets = getVisible();
    var cols = ['Ticket ID', 'Subject', 'Department', 'Engineer', 'Priority', 'Status', 'Created', 'Updated'];
    var rows = [cols];
    tickets.forEach(function (t) {
      rows.push([
        t.id, t.issue, normDepartment(t), normEngineer(t), normPriority(t.priority),
        normStatus(t.status), t.created || '', t.updated || ''
      ]);
    });
    var csv = '\uFEFF' + rows.map(function (r) {
      return r.map(function (c) {
        c = String(c == null ? '' : c);
        return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(',');
    }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'resolveone-analytics.csv';
    a.click();
  }

  /* ── Events ──────────────────────────────────────────────── */
  function bindEvents() {
    var refresh = qs('[data-refresh-btn]');
    if (refresh) refresh.addEventListener('click', function () {
      refresh.classList.add('is-loading');
      refresh.disabled = true;
      loadData(function () {
        refresh.classList.remove('is-loading');
        refresh.disabled = false;
      });
    });

    var exportBtn = qs('[data-export-btn]');
    if (exportBtn) exportBtn.addEventListener('click', function () { exportCsv(); });

    var clear = qs('[data-drill-clear]');
    if (clear) clear.addEventListener('click', clearDrill);

    qsa('[data-filter]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        state.filters[sel.getAttribute('data-filter')] = sel.value;
        renderAll();
      });
    });

    bindFunnel();
    bindHeatmap();
    bindTable();
  }

  function init() {
    bindEvents();
    loadData();
  }

  window.ReportsModule = { init: init };
})();