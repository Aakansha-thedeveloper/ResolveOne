(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';
  var chartInstances = {};
  var engineerName = '';

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  function init() {
    var user = window.ResolveOneSession && window.ResolveOneSession.getUser();
    engineerName = (user && (user.name || user.full_name)) || 'Engineer';
    updateGreeting();
    setInterval(updateGreeting, 30000);
    renderDate();
    fetchData();
    bindEvents();
  }

  function bindEvents() {
    var btn = qs('[data-refresh-btn]');
    if (btn) btn.addEventListener('click', function () {
      btn.classList.add('is-loading');
      btn.disabled = true;
      fetchData().then(function () {
        btn.classList.remove('is-loading');
        btn.disabled = false;
      });
    });
  }

  function updateGreeting() {
    var h = new Date().getHours();
    var g = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    var el = qs('[data-greeting]');
    if (el) el.textContent = g + ', ' + engineerName;
  }

  function renderDate() {
    var el = qs('[data-date]');
    if (!el) return;
    var opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    el.textContent = new Date().toLocaleDateString('en-US', opts);
  }

  function fetchData() {
    return fetch(API_BASE + '/api/tickets')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var tickets = res.value || res || [];
        renderAll(tickets);
        showContent();
      })
      .catch(function (err) {
        showContent();
        renderEmptyState();
      });
  }

  function showContent() {
    var skel = qs('#ed-skeleton');
    var content = qs('#ed-content');
    if (skel) skel.style.display = 'none';
    if (content) content.style.display = 'block';
    var lu = qs('[data-last-updated]');
    if (lu) lu.textContent = 'Updated ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function renderAll(tickets) {
    renderKPI(tickets);
    renderPriorityChart(tickets);
    renderCategoryChart(tickets);
    renderStatusChart(tickets);
    renderWorkQueue(tickets);
    renderTimeline(tickets);
    renderPerformance(tickets);
    renderAIWidget(tickets);
  }

  function renderEmptyState() {
    qs('[data-kpi-assigned]').textContent = '--';
    qs('[data-kpi-open]').textContent = '--';
    qs('[data-kpi-resolved-today]').textContent = '--';
    qs('[data-kpi-pending]').textContent = '--';
    qs('[data-kpi-high]').textContent = '--';
    qs('[data-kpi-avg-time]').textContent = '--';
    var queue = qs('[data-work-queue]');
    if (queue) queue.innerHTML = '';
    var eq = qs('[data-empty-queue]');
    if (eq) { eq.style.display = 'block'; eq.textContent = 'Unable to load ticket data. Please try again.'; }
    var tl = qs('[data-timeline]');
    if (tl) tl.innerHTML = '<li style="padding:24px;text-align:center;color:var(--color-text);font-size:0.8125rem;list-style:none;">Could not load activity.</li>';
  }

  /* ──────────────── KPI ──────────────── */
  function renderKPI(tickets) {
    var today = new Date();
    var todayStr = today.toISOString().slice(0, 10);

    var assigned = tickets.length;
    var openTickets = tickets.filter(function (t) {
      var s = (t.status || '').toLowerCase();
      return s === 'open' || s === 'in progress' || s === 'in-progress';
    });
    var resolvedToday = tickets.filter(function (t) {
      var s = (t.status || '').toLowerCase();
      return (s === 'resolved' || s === 'closed') && (t.updated || '').slice(0, 10) === todayStr;
    });
    var pending = tickets.filter(function (t) {
      var s = (t.status || '').toLowerCase();
      return s === 'open' || s === 'in progress' || s === 'in-progress';
    });
    var highPriority = tickets.filter(function (t) {
      return (t.priority || '').toLowerCase() === 'high';
    });

    var resolvedTickets = tickets.filter(function (t) {
      var s = (t.status || '').toLowerCase();
      return s === 'resolved' || s === 'closed';
    });
    var avgTime = '--';
    if (resolvedTickets.length > 0) {
      var totalHours = 0;
      var count = 0;
      resolvedTickets.forEach(function (t) {
        var created = t.created || t.created_at;
        var updated = t.updated || t.updated_at;
        if (created && updated) {
          var diff = (new Date(updated) - new Date(created)) / (1000 * 60 * 60);
          if (diff >= 0) { totalHours += diff; count++; }
        }
      });
      if (count > 0) {
        var avg = totalHours / count;
        avgTime = avg < 1 ? Math.round(avg * 60) + 'm' : avg < 24 ? avg.toFixed(1) + 'h' : (avg / 24).toFixed(1) + 'd';
      }
    }

    qs('[data-kpi-assigned]').textContent = assigned;
    qs('[data-kpi-open]').textContent = openTickets.length;
    qs('[data-kpi-resolved-today]').textContent = resolvedToday.length;
    qs('[data-kpi-pending]').textContent = pending.length;
    qs('[data-kpi-high]').textContent = highPriority.length;
    qs('[data-kpi-avg-time]').textContent = avgTime;

    var ol = openTickets.length;
    var hl = highPriority.length;
    if (ol > 0) {
      qs('[data-kpi-open-trend]').textContent = ol + ' needs action';
      qs('[data-kpi-open-trend]').className = 'ed-kpi-trend ' + (ol > 5 ? 'down' : 'neutral');
    }
    if (hl > 0) {
      qs('[data-kpi-high-trend]').textContent = hl + ' urgent';
      qs('[data-kpi-high-trend]').className = 'ed-kpi-trend down';
    }
    var rl = resolvedToday.length;
    if (rl > 0) {
      qs('[data-kpi-resolved-trend]').textContent = rl + ' today';
      qs('[data-kpi-resolved-trend]').className = 'ed-kpi-trend up';
    }
    if (resolvedTickets.length > 0) {
      var rate = ((resolvedTickets.length / assigned) * 100).toFixed(0);
      qs('[data-kpi-assigned-trend]').textContent = rate + '% resolved';
      qs('[data-kpi-assigned-trend]').className = 'ed-kpi-trend ' + (parseInt(rate) > 50 ? 'up' : 'neutral');
    }
  }

  /* ──────────────── CHARTS ──────────────── */
  function destroyChart(key) {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      delete chartInstances[key];
    }
  }

  function isDark() {
    return document.body.classList.contains('dark-theme');
  }
  function textColor() {
    return isDark() ? '#e2e8f0' : '#475569';
  }
  function borderColor() {
    return isDark() ? '#334155' : '#e2e8f0';
  }

  function renderPriorityChart(tickets) {
    destroyChart('priority');
    var ctx = document.getElementById('chart-priority');
    if (!ctx) return;
    var counts = { high: 0, medium: 0, low: 0 };
    tickets.forEach(function (t) {
      var p = (t.priority || 'medium').toLowerCase();
      counts[p] = (counts[p] || 0) + 1;
    });
    var labels = { high: 'High', medium: 'Medium', low: 'Low' };
    var data = Object.keys(counts).map(function (k) { return counts[k]; });
    if (data.every(function (v) { return v === 0; })) { data = [0, 0, 0]; }
    chartInstances.priority = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(counts).map(function (k) { return labels[k]; }),
        datasets: [{
          data: data,
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor(), padding: 12, font: { size: 10, family: 'Manrope' }, usePointStyle: true, pointStyle: 'circle' }
          },
          tooltip: {
            backgroundColor: isDark() ? '#1e293b' : '#fff',
            titleColor: isDark() ? '#f1f5f9' : '#1e293b',
            bodyColor: isDark() ? '#cbd5e1' : '#475569',
            borderColor: isDark() ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10
          }
        },
        cutout: '60%'
      }
    });
  }

  function renderCategoryChart(tickets) {
    destroyChart('category');
    var ctx = document.getElementById('chart-category');
    if (!ctx) return;
    var map = {};
    tickets.forEach(function (t) {
      var cat = t.department || t.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + 1;
    });
    var sorted = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
    var labels = sorted;
    var data = sorted.map(function (k) { return map[k]; });
    var colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#8b5cf6'];
    if (!labels.length) { labels = ['No Data']; data = [0]; }
    chartInstances.category = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Tickets',
          data: data,
          backgroundColor: data.map(function (_, i) { return colors[i % colors.length] + 'CC'; }),
          borderColor: data.map(function (_, i) { return colors[i % colors.length]; }),
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark() ? '#1e293b' : '#fff',
            titleColor: isDark() ? '#f1f5f9' : '#1e293b',
            bodyColor: isDark() ? '#cbd5e1' : '#475569',
            borderColor: isDark() ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { color: borderColor(), drawBorder: false },
            ticks: { color: textColor(), font: { size: 10, family: 'Manrope' } }
          },
          y: {
            grid: { display: false },
            ticks: { color: textColor(), font: { size: 10, family: 'Manrope' } }
          }
        }
      }
    });
  }

  function renderStatusChart(tickets) {
    destroyChart('status');
    var ctx = document.getElementById('chart-status');
    if (!ctx) return;
    var counts = { 'Open': 0, 'In Progress': 0, 'Resolved': 0, 'Closed': 0 };
    tickets.forEach(function (t) {
      var s = t.status || 'Open';
      if (s === 'In-Progress') s = 'In Progress';
      if (counts.hasOwnProperty(s)) counts[s]++; else counts['Open']++;
    });
    var labels = Object.keys(counts);
    var data = labels.map(function (k) { return counts[k]; });
    var colors = { 'Open': '#3b82f6', 'In Progress': '#f59e0b', 'Resolved': '#10b981', 'Closed': '#6b7280' };
    var bgColors = labels.map(function (k) { return colors[k] || '#94a3b8'; });
    if (data.every(function (v) { return v === 0; })) { data = [0, 0, 0, 0]; }
    chartInstances.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: bgColors,
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor(), padding: 10, font: { size: 9, family: 'Manrope' }, usePointStyle: true, pointStyle: 'circle' }
          },
          tooltip: {
            backgroundColor: isDark() ? '#1e293b' : '#fff',
            titleColor: isDark() ? '#f1f5f9' : '#1e293b',
            bodyColor: isDark() ? '#cbd5e1' : '#475569',
            borderColor: isDark() ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10
          }
        },
        cutout: '60%'
      }
    });
  }

  /* ──────────────── WORK QUEUE ──────────────── */
  function renderWorkQueue(tickets) {
    var tbody = qs('[data-work-queue]');
    var empty = qs('[data-empty-queue]');
    if (!tbody) return;

    var active = tickets.filter(function (t) {
      var s = (t.status || '').toLowerCase();
      return s === 'open' || s === 'in progress' || s === 'in-progress';
    });
    var sorted = active.slice().sort(function (a, b) {
      var order = { high: 0, medium: 1, low: 2 };
      var pa = order[(a.priority || 'medium').toLowerCase()] || 1;
      var pb = order[(b.priority || 'medium').toLowerCase()] || 1;
      return pa - pb;
    }).slice(0, 10);

    if (sorted.length === 0) {
      tbody.innerHTML = '';
      if (empty) { empty.style.display = 'block'; empty.textContent = 'No open tickets in your work queue. All caught up!'; }
      return;
    }
    if (empty) empty.style.display = 'none';

    var html = '';
    sorted.forEach(function (t) {
      var p = (t.priority || 'medium').toLowerCase();
      var s = (t.status || 'Open').toLowerCase();
      if (s === 'in-progress') s = 'in progress';
      html += '<tr>' +
        '<td><span class="ed-id-mono">' + esc(t.id) + '</span></td>' +
        '<td>' + esc(t.issue) + '</td>' +
        '<td><span class="ed-badge ' + p + '">' + esc(t.priority || 'Medium') + '</span></td>' +
        '<td><span class="ed-badge ' + s.replace(' ', '-') + '">' + esc(t.status || 'Open') + '</span></td>' +
        '<td>' + esc(t.department || t.category || '-') + '</td>' +
        '<td><a href="engineer-resolution.html?ticket=' + encodeURIComponent(t.id) + '" class="ed-table-action">View</a></td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  /* ──────────────── TIMELINE ──────────────── */
  function renderTimeline(tickets) {
    var el = qs('[data-timeline]');
    if (!el) return;

    var sorted = tickets.slice().sort(function (a, b) {
      var da = a.updated || a.created || '';
      var db = b.updated || b.created || '';
      return da < db ? 1 : da > db ? -1 : 0;
    }).slice(0, 8);

    if (!sorted.length) {
      el.innerHTML = '<li style="padding:24px;text-align:center;color:var(--color-text);font-size:0.8125rem;list-style:none;">No recent ticket activity.</li>';
      return;
    }

    var html = '';
    sorted.forEach(function (t) {
      var s = (t.status || 'Open').toLowerCase();
      var dotClass = s === 'resolved' || s === 'closed' ? 'resolved' : s === 'in progress' || s === 'in-progress' ? 'progress' : 'open';
      var time = t.updated || t.created || '';
      var displayTime = time ? time.replace('T', ' ').slice(0, 16) : '';
      if (time) {
        var d = new Date(time);
        var now = new Date();
        var diffMs = now - d;
        var diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) displayTime = 'Just now';
        else if (diffMin < 60) displayTime = diffMin + 'm ago';
        else if (diffMin < 1440) displayTime = Math.floor(diffMin / 60) + 'h ago';
        else displayTime = Math.floor(diffMin / 1440) + 'd ago';
      }
      html +=
        '<li class="ed-tl-item">' +
          '<div class="ed-tl-dot ' + dotClass + '"><i data-lucide="' + (dotClass === 'resolved' ? 'check' : dotClass === 'progress' ? 'clock' : 'alert-circle') + '" size="14"></i></div>' +
          '<div class="ed-tl-content">' +
            '<p><span class="ed-tl-title">' + esc(t.issue) + '</span></p>' +
            '<p>' + esc(t.status || 'Open') + ' &middot; <span class="ed-tl-ticket">' + esc(t.id) + '</span></p>' +
            '<p class="ed-tl-time">' + displayTime + '</p>' +
          '</div>' +
        '</li>';
    });
    el.innerHTML = html;
    if (typeof lucide !== 'undefined') requestAnimationFrame(function () { try { lucide.createIcons(); } catch (e) {} });
  }

  /* ──────────────── PERFORMANCE ──────────────── */
  function renderPerformance(tickets) {
    var today = new Date();
    var todayStr = today.toISOString().slice(0, 10);
    var weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    var weekStartStr = weekStart.toISOString().slice(0, 10);

    var resolvedToday = tickets.filter(function (t) {
      return (t.status || '').toLowerCase() === 'resolved' && (t.updated || '').slice(0, 10) === todayStr;
    });
    var resolvedWeek = tickets.filter(function (t) {
      return (t.status || '').toLowerCase() === 'resolved' && (t.updated || '').slice(0, 10) >= weekStartStr;
    });
    var totalAssigned = tickets.length;

    var todayPct = totalAssigned > 0 ? ((resolvedToday.length / totalAssigned) * 100).toFixed(0) : 0;
    var weekPct = totalAssigned > 0 ? ((resolvedWeek.length / totalAssigned) * 100).toFixed(0) : 0;

    qs('[data-perf-today]').textContent = resolvedToday.length + ' / ' + totalAssigned;
    qs('[data-perf-today-sub]').textContent = todayPct + '% of assigned tickets';
    qs('[data-perf-weekly]').textContent = resolvedWeek.length + ' / ' + totalAssigned;
    qs('[data-perf-weekly-sub]').textContent = weekPct + '% this week';

    var responseTime = '--';
    var slaRate = '--';
    var resolvedCount = tickets.filter(function (t) {
      return (t.status || '').toLowerCase() === 'resolved';
    });
    if (resolvedCount.length > 0) {
      var totalHours = 0;
      var count = 0;
      resolvedCount.forEach(function (t) {
        var created = t.created || t.created_at;
        var updated = t.updated || t.updated_at;
        if (created && updated) {
          var diff = (new Date(updated) - new Date(created)) / (1000 * 60 * 60);
          if (diff >= 0) { totalHours += diff; count++; }
        }
      });
      if (count > 0) {
        var avg = totalHours / count;
        responseTime = avg < 1 ? Math.round(avg * 60) + 'm' : avg < 24 ? avg.toFixed(1) + 'h' : (avg / 24).toFixed(1) + 'd';
      }
      var slaTarget = 4;
      var withinSLA = resolvedCount.filter(function (t) {
        var created = t.created || t.created_at;
        var updated = t.updated || t.updated_at;
        if (created && updated) {
          var diff = (new Date(updated) - new Date(created)) / (1000 * 60 * 60);
          return diff >= 0 && diff <= slaTarget;
        }
        return false;
      });
      if (resolvedCount.length > 0) {
        slaRate = ((withinSLA.length / resolvedCount.length) * 100).toFixed(0) + '%';
      }
    }

    qs('[data-perf-response]').textContent = responseTime;
    qs('[data-perf-sla]').textContent = slaRate;
  }

  /* ──────────────── AI WIDGET ──────────────── */
  function renderAIWidget(tickets) {
    var el = qs('[data-ai-list]');
    if (!el) return;

    var highCount = tickets.filter(function (t) {
      return (t.priority || '').toLowerCase() === 'high';
    }).length;
    var openCount = tickets.filter(function (t) {
      return (t.status || '').toLowerCase() === 'open';
    }).length;
    var resolvedCount = tickets.filter(function (t) {
      return (t.status || '').toLowerCase() === 'resolved';
    }).length;
    var pendingReview = tickets.filter(function (t) {
      return (t.status || '').toLowerCase() === 'in progress' || (t.status || '').toLowerCase() === 'in-progress';
    }).length;
    var oldTickets = tickets.filter(function (t) {
      var s = (t.status || '').toLowerCase();
      var created = t.created || t.created_at;
      if ((s === 'open' || s === 'in progress' || s === 'in-progress') && created) {
        var age = (new Date() - new Date(created)) / (1000 * 60 * 60 * 24);
        return age > 3;
      }
      return false;
    });

    var items = [];
    if (highCount > 0) items.push({ icon: 'warn', text: '<strong>' + highCount + ' high-priority ticket' + (highCount > 1 ? 's' : '') + '</strong> require immediate attention.' });
    if (openCount > 2) items.push({ icon: 'info', text: '<strong>' + openCount + ' open tickets</strong> in the queue. Consider reviewing the oldest first.' });
    if (oldTickets.length > 0) items.push({ icon: 'warn', text: '<strong>' + oldTickets.length + ' ticket' + (oldTickets.length > 1 ? 's have' : ' has') + ' been open over 3 days</strong> — prioritize resolution.' });
    if (pendingReview > 0) items.push({ icon: 'info', text: '<strong>' + pendingReview + ' ticket' + (pendingReview > 1 ? 's' : '') + ' in progress</strong> awaiting your review.' });
    if (resolvedCount > 0) items.push({ icon: 'ok', text: 'Great work! <strong>' + resolvedCount + ' ticket' + (resolvedCount > 1 ? 's' : '') + ' resolved</strong> in total.' });
    if (tickets.length === 0) items.push({ icon: 'ok', text: 'No tickets found. The system is quiet.' });
    if (items.length === 0) items.push({ icon: 'info', text: 'All tickets are progressing normally.' });

    var html = '';
    items.forEach(function (item) {
      html +=
        '<li class="ed-ai-item">' +
          '<div class="ed-ai-icon ' + item.icon + '"><i data-lucide="' + (item.icon === 'warn' ? 'alert-triangle' : item.icon === 'ok' ? 'check' : 'info') + '" size="12"></i></div>' +
          '<p>' + item.text + '</p>' +
        '</li>';
    });
    el.innerHTML = html;
    if (typeof lucide !== 'undefined') requestAnimationFrame(function () { try { lucide.createIcons(); } catch (e) {} });
  }

  function esc(str) {
    if (str == null) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  window.EngineerDashboard = { init: init };
})();