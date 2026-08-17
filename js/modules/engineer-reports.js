(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';

  function qs(s) { return document.querySelector(s); }

  function init() {
    fetch(API_BASE + '/api/tickets')
      .then(function (r) { return r.json(); })
      .then(function (tickets) {
        renderKPI(tickets);
        renderCategoryChart(tickets);
        renderPriorityChart(tickets);
        renderEngineerMetrics(tickets);
      })
      .catch(function () {
        qs('[data-report-total]').textContent = '--';
      });
  }

  function renderKPI(tickets) {
    var total = tickets.length;
    var resolved = tickets.filter(function (t) { return t.status === 'Resolved' || t.status === 'Closed'; }).length;
    var open = tickets.filter(function (t) { return t.status === 'Open' || t.status === 'In Progress' || t.status === 'In-Progress'; }).length;
    var high = tickets.filter(function (t) { return (t.priority || '').toLowerCase() === 'high'; }).length;
    qs('[data-report-total]').textContent = total;
    qs('[data-report-resolved]').textContent = resolved;
    qs('[data-report-open]').textContent = open;
    qs('[data-report-high]').textContent = high;
  }

  function renderCategoryChart(tickets) {
    var map = {};
    tickets.forEach(function (t) {
      var cat = t.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + 1;
    });
    var sorted = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
    var max = sorted.length ? Math.max.apply(null, sorted.map(function (k) { return map[k]; })) : 1;
    var colors = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#14b8a6','#a855f7'];
    var html = '';
    sorted.forEach(function (cat, i) {
      var pct = (map[cat] / max * 100).toFixed(0);
      html +=
        '<div class="chart-bar-row">' +
          '<span class="chart-bar-label" title="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</span>' +
          '<div class="chart-bar-track"><div class="chart-bar-fill" style="width:' + pct + '%;background:' + colors[i % colors.length] + '"></div></div>' +
          '<span class="chart-bar-count">' + map[cat] + '</span>' +
        '</div>';
    });
    if (!sorted.length) html = '<div style="padding:16px;text-align:center;color:var(--color-text);font-size:0.8125rem;">No data.</div>';
    qs('[data-category-chart]').innerHTML = html;
  }

  function renderPriorityChart(tickets) {
    var counts = { high: 0, medium: 0, low: 0 };
    tickets.forEach(function (t) {
      var p = (t.priority || 'medium').toLowerCase();
      counts[p] = (counts[p] || 0) + 1;
    });
    var colors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
    var labels = { high: 'High', medium: 'Medium', low: 'Low' };
    var max = Math.max(counts.high, counts.medium, counts.low, 1);
    var html = '';
    ['high', 'medium', 'low'].forEach(function (p) {
      var pct = (counts[p] / max * 100).toFixed(0);
      html +=
        '<div class="chart-bar-row">' +
          '<span class="chart-bar-label">' + labels[p] + '</span>' +
          '<div class="chart-bar-track"><div class="chart-bar-fill" style="width:' + pct + '%;background:' + colors[p] + '"></div></div>' +
          '<span class="chart-bar-count">' + counts[p] + '</span>' +
        '</div>';
    });
    qs('[data-priority-chart]').innerHTML = html;
  }

  function renderEngineerMetrics(tickets) {
    var engineers = {};
    tickets.forEach(function (t) {
      var eng = t.assigned_engineer || t.assignedEngineer || 'Unassigned';
      if (!engineers[eng]) engineers[eng] = { assigned: 0, resolved: 0, open: 0 };
      engineers[eng].assigned++;
      if (t.status === 'Resolved' || t.status === 'Closed') engineers[eng].resolved++;
      else if (t.status === 'Open' || t.status === 'In Progress' || t.status === 'In-Progress') engineers[eng].open++;
    });
    var tbody = qs('[data-engineer-body]');
    var keys = Object.keys(engineers);
    if (!keys.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--color-text);">No data.</td></tr>';
      return;
    }
    var html = '';
    keys.sort(function (a, b) { return engineers[b].assigned - engineers[a].assigned; });
    keys.forEach(function (eng) {
      var e = engineers[eng];
      var rate = e.assigned > 0 ? ((e.resolved / e.assigned) * 100).toFixed(1) : '0.0';
      html +=
        '<tr>' +
          '<td><strong>' + escapeHtml(eng) + '</strong></td>' +
          '<td>' + e.assigned + '</td>' +
          '<td>' + e.resolved + '</td>' +
          '<td>' + e.open + '</td>' +
          '<td>' + rate + '%</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  window.EngineerReports = { init: init };
})();