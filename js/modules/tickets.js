window.TicketsModule = (() => {
  let tableBody = null;
  var API_BASE = 'http://localhost:8000';
  var pollTimer = null;
  var cachedHtml = '';

  function init() {
    tableBody = document.querySelector('[data-tickets-body]');
    if (!tableBody) return;
    loadTickets();
    startPolling();
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(function () { loadTickets(true); }, 30000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function loadTickets(silent) {
    fetch(API_BASE + '/api/tickets')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var html = buildTableHtml(data || []);
        if (html !== cachedHtml) {
          cachedHtml = html;
          tableBody.innerHTML = html;
        }
      })
      .catch(function () {
        if (!silent) {
          tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--color-text);font-size:0.875rem;">Could not load tickets. Is the backend running?</td></tr>';
        }
      });
  }

  function buildTableHtml(tickets) {
    if (!tickets || tickets.length === 0) {
      return '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--color-text);font-size:0.875rem;">No tickets yet.</td></tr>';
    }
    return tickets.slice(0, 5).map(function (t) {
      var pClass = t.priority === 'high' ? 'ticket-priority high' : 'ticket-priority medium';
      var sClass = t.status === 'Resolved' || t.status === 'Closed' ? 'badge badge-resolved' : t.status === 'In Progress' ? 'badge badge-progress' : 'badge badge-open';
      var slaText = t.status === 'Resolved' || t.status === 'Closed' ? 'Resolved' : '—';
      var slaStatus = t.status === 'Resolved' || t.status === 'Closed' ? 'normal' : '';
      return (
        '<tr>' +
          '<td class="ticket-id-cell">' + escapeHtml(t.id) + '</td>' +
          '<td class="ticket-title-cell">' + escapeHtml(t.issue) + '</td>' +
          '<td><span class="' + pClass + '">' + t.priority + '</span></td>' +
          '<td><span class="' + sClass + '">' + t.status + '</span></td>' +
          '<td>' + escapeHtml(t.assignedTeam || 'Unassigned') + '</td>' +
          '<td><span class="ticket-sla ' + slaStatus + '">' + slaText + '</span></td>' +
        '</tr>'
      );
    }).join('');
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  function refresh() {
    loadTickets();
  }

  return { init: init, refresh: refresh };
})();
