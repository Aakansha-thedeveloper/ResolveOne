/* ─── Help Center Module ─── */
(function () {
  'use strict';

  /* ─── Documentation Content ─── */
  var DOCS = {
    home: {
      icon: 'home', title: 'Home Overview',
      content: '<h3>Dashboard Overview</h3><p>The Home dashboard provides a real-time snapshot of your support environment. Key metrics, recent tickets, and AI activity summaries are displayed at a glance so you can quickly assess the current state of your operations.</p><h3>Quick Actions</h3><p>Use the Quick Actions panel to create tickets, access the AI Assistant, or navigate to any module with one click. Actions are context-sensitive and adapt to your role and recent activity.</p><h3>Navigation</h3><p>The top navbar provides persistent access to all six platform modules: Home, AI Assistant, My Tickets, Knowledge Base, Analytics, and Help Center. The user profile menu in the top-right shows your name, role, and level.</p><h3>Status Bar</h3><p>The global status bar displays platform health, your current SLA compliance rate, and any active notifications. Critical alerts are highlighted for immediate attention.</p>'
    },
    ai: {
      icon: 'ai', title: 'AI Assistant Guide',
      content: '<h3>AI Diagnosis Engine</h3><p>The AI Assistant uses a multi-step diagnostic pipeline to analyze support tickets. It processes natural language descriptions, identifies the core issue, and cross-references resolved cases in the Knowledge Base to determine the most likely resolution.</p><h3>Confidence Scoring</h3><p>Each diagnosis includes a confidence score (0—100%). Scores above 85% trigger automatic resolution suggestions with detailed explanations. Mid-range scores prompt the agent to review before proceeding. Low scores escalate to human support.</p><h3>Automated Ticket Generation</h3><p>When a diagnosis is accepted, the AI automatically creates a formatted ticket with the issue summary, category assignment, priority level, and department routing. The ticket appears in My Tickets with full traceability.</p><h3>Workflow Integration</h3><p>The AI Assistant integrates with the full ticket lifecycle — from initial diagnosis through resolution tracking. It can suggest Knowledge Base articles, recommend priority levels, and flag tickets that require escalation.</p>'
    },
    tickets: {
      icon: 'tickets', title: 'My Tickets Guide',
      content: '<h3>Ticket Lifecycle</h3><p>Tickets progress through defined stages: Open → Assigned → In Progress → Resolved → Closed. Each transition is logged with timestamps and actor information for full auditability. Reopening is supported within 14 days of closure.</p><h3>Priority Levels</h3><p>Four priority levels determine response and resolution targets: Critical (1 hr / 4 hr), High (4 hr / 8 hr), Medium (8 hr / 24 hr), and Low (24 hr / 72 hr). SLA timers are visible on each ticket card.</p><h3>SLA Tracking</h3><p>Service Level Agreements are monitored in real-time. Each ticket displays its SLA status — On Track, At Risk, or Breached. The dashboard aggregates SLA compliance across all active tickets.</p><h3>Filtering & Search</h3><p>My Tickets supports filtering by status, priority, category, and department. The search bar allows keyword lookup across ticket IDs, titles, and descriptions. Saved filters can be reused.</p>'
    },
    kb: {
      icon: 'kb', title: 'Knowledge Base Guide',
      content: '<h3>Semantic Search</h3><p>The Knowledge Base uses AI-powered semantic search that understands intent, not just keywords. Search results are ranked by relevance, with the AI matching your query against article content, titles, categories, and metadata for the most accurate results.</p><h3>Category Framework</h3><p>Articles are organised into 8 categories: Account Management, Billing, Technical Support, Security, Integrations, Troubleshooting, FAQs, and Best Practices. Each category can be browsed independently with article counts displayed.</p><h3>AI Recommendations</h3><p>When using the AI Assistant, relevant Knowledge Base articles are suggested alongside diagnosis results. This contextual linking helps agents resolve tickets faster with verified documentation.</p><h3>Article Viewer</h3><p>Articles support rich formatting with headings, lists, code blocks, and embedded media. Each article includes metadata: author, last updated date, read time, and related article links.</p>'
    },
    analytics: {
      icon: 'analytics', title: 'Analytics Guide',
      content: '<h3>KPI Cards</h3><p>Six key performance indicators are displayed at the top: Total Tickets, Open Tickets, Resolved Today, Avg Resolution Time, SLA Compliance, and AI Resolution Rate. Each counter animates on load and updates when date ranges are changed.</p><h3>Trend Charts</h3><p>The ticket trend line chart visualises volume over time with interactive hover tooltips. Switch between Today, 7 Days, 30 Days, and 90 Days views to analyse short-term and long-term patterns.</p><h3>Distribution Charts</h3><p>Donut charts show the distribution of tickets by status, category, and priority. Hover over any segment for detailed counts and percentages. The priority chart displays the total ticket count at its centre.</p><h3>Performance Metrics</h3><p>The AI performance section tracks automation rate, suggestion accuracy, average confidence, and escalation rate. Department-level insights are displayed in a sortable table with trend indicators.</p>'
    },
    help: {
      icon: 'help', title: 'Help Center',
      content: '<h3>Welcome to the Help Center</h3><p>The Help Center is your central resource for learning about ResolveOne. Here you will find product documentation, video tutorials, frequently asked questions, and links to further reading across all six platform modules.</p><h3>Quick Links</h3><p>Use the Product Documentation cards above to read detailed guides for each module. Quick Help cards provide shortcuts to documentation for common topics. Browse the FAQ for answers to frequently asked questions.</p><h3>Video Tutorials</h3><p>Visual walkthroughs are available for key workflows including getting started, using the AI Assistant, managing tickets, and the analytics dashboard. Click any tutorial to open a preview in the video player.</p><h3>Need More Help?</h3><p>If you cannot find what you are looking for, use the Support section at the bottom of the page to launch the AI Assistant or open My Tickets to create a support request.</p>'
    },
    getting_started: {
      icon: 'rocket', title: 'Getting Started',
      content: '<h3>Welcome to ResolveOne</h3><p>ResolveOne is an enterprise AI-powered support platform designed to streamline ticket management, automate diagnosis, and provide actionable analytics. This guide covers the basics of getting up and running.</p><h3>First Steps</h3><p><strong>1. Explore the Dashboard</strong> — Start on the Home page to see your support environment at a glance. Review active tickets, AI activity, and key metrics.<br><strong>2. Try the AI Assistant</strong> — Navigate to the AI Assistant to experience automated diagnosis. Enter a test issue description and review the suggested resolution.<br><strong>3. View Your Tickets</strong> — Open My Tickets to see all support requests, their statuses, priorities, and SLA timelines.<br><strong>4. Browse the Knowledge Base</strong> — Search for articles using natural language and explore the category structure.<br><strong>5. Check Analytics</strong> — Review KPI cards, trend charts, and performance metrics to understand your support operations.</p><h3>Tips</h3><p>Use the navbar to switch between modules at any time. The Help Center (this page) is always available for reference. Each module has a dedicated documentation guide in the Product Documentation section above.</p>'
    },
    admin: {
      icon: 'settings', title: 'Administrator Manual',
      content: '<h3>Platform Configuration</h3><p>Administrators can configure global platform settings including ticket categories, priority matrices, SLA thresholds, and department structures. Configuration changes are audited and logged.</p><h3>User Roles</h3><p>Three default roles are available: Agent (ticket handling and resolution), Team Lead (workload management and escalation), and Administrator (platform configuration and user management). Custom roles can be created with granular permissions.</p><h3>Enterprise Settings</h3><p>Enterprise features include SSO integration, audit logging, data retention policies, custom branding, and API key management. These settings are available in the Administration panel accessible to admin users only.</p>'
    },
    api: {
      icon: 'code', title: 'API Documentation',
      content: '<h3>REST API Reference</h3><p>The ResolveOne API provides programmatic access to tickets, users, categories, and analytics data. All endpoints use standard REST conventions with JSON request and response bodies. Authentication is via API key in the Authorization header.</p><h3>Key Endpoints</h3><p><strong>GET /api/tickets</strong> — List tickets with optional status, priority, and department filters.<br><strong>POST /api/tickets</strong> — Create a new support ticket.<br><strong>GET /api/tickets/:id</strong> — Retrieve a specific ticket with full details and timeline.<br><strong>GET /api/analytics</strong> — Fetch aggregated metrics and performance data.</p><h3>Webhooks</h3><p>Webhooks can be configured to receive real-time notifications for ticket creation, status changes, and escalations. Payloads are delivered via POST to your configured endpoint URL with HMAC signature verification.</p>'
    }
  };

  function getDocIcon(key) {
    var map = {
      home: 'home', ai: 'bot', tickets: 'ticket', kb: 'book-open',
      analytics: 'bar-chart-3', help: 'circle-help',
      getting_started: 'rocket', admin: 'settings', api: 'code',
      settings: 'settings', code: 'code', rocket: 'rocket'
    };
    return map[key] || 'file-text';
  }

  function getDocIconColor(key) {
    var map = {
      home: '#1F7A8C', ai: '#2563EB', tickets: '#059669',
      kb: '#7C3AED', analytics: '#022B3A', help: '#6B7280',
      getting_started: '#1F7A8C', admin: '#0891B2', api: '#6B7280',
      settings: '#0891B2', code: '#6B7280', rocket: '#1F7A8C'
    };
    return map[key] || '#6B7280';
  }

  /* ─── Documentation Viewer ─── */
  function initDocViewer() {
    var modal = document.querySelector('[data-hc-doc-modal]');
    var titleEl = document.querySelector('[data-hc-doc-title]');
    var contentEl = document.querySelector('[data-hc-doc-content]');
    var iconEl = document.querySelector('[data-hc-doc-icon]');
    var closeBtns = document.querySelectorAll('[data-hc-doc-close]');

    function openDoc(key) {
      var doc = DOCS[key];
      if (!doc) return;
      if (titleEl) titleEl.textContent = doc.title;
      if (contentEl) contentEl.innerHTML = doc.content;
      if (iconEl) {
        iconEl.style.background = getDocIconColor(key);
        iconEl.innerHTML = '';
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('width', '20');
        s.setAttribute('height', '20');
        s.setAttribute('viewBox', '0 0 24 24');
        s.setAttribute('fill', 'none');
        s.setAttribute('stroke', 'currentColor');
        s.setAttribute('stroke-width', '2');
        s.setAttribute('stroke-linecap', 'round');
        s.setAttribute('stroke-linejoin', 'round');
        var iconName = getDocIcon(key);
        if (iconName === 'home') { s.innerHTML = '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'; }
        else if (iconName === 'bot') { s.innerHTML = '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/>'; }
        else if (iconName === 'ticket') { s.innerHTML = '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>'; }
        else if (iconName === 'book-open') { s.innerHTML = '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'; }
        else if (iconName === 'bar-chart-3') { s.innerHTML = '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'; }
        else if (iconName === 'circle-help') { s.innerHTML = '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'; }
        else if (iconName === 'rocket') { s.innerHTML = '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>'; }
        else if (iconName === 'settings') { s.innerHTML = '<circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'; }
        else if (iconName === 'code') { s.innerHTML = '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'; }
        else { s.innerHTML = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>'; }
        iconEl.appendChild(s);
      }
      if (modal) modal.style.display = 'flex';
    }

    function closeDoc() {
      if (modal) modal.style.display = 'none';
    }

    /* Wire guide cards */
    document.querySelectorAll('[data-hc-guide]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openDoc(el.getAttribute('data-hc-guide'));
      });
    });

    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', closeDoc);
    });

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.classList.contains('hc-doc-backdrop')) {
          closeDoc();
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
          closeDoc();
        }
      });
    }
  }

  /* ─── Search ─── */
  function initSearch() {
    var input = document.querySelector('[data-hc-search-input]');
    var btn = document.querySelector('[data-hc-search-btn]');
    var clear = document.querySelector('[data-hc-clear]');
    var guides = document.querySelectorAll('[data-hc-guide]');
    var faqs = document.querySelectorAll('[data-hc-accordion-item]');
    var tutorials = document.querySelectorAll('[data-hc-video]');
    var empty = document.querySelector('[data-hc-empty]');
    var allItems = [];

    guides.forEach(function (g) { allItems.push(g); });
    faqs.forEach(function (f) { allItems.push(f); });
    tutorials.forEach(function (t) { allItems.push(t); });

    var sections = {
      guides: document.querySelector('.hc-platform-guides'),
      accordion: document.querySelector('.hc-accordion'),
      split: document.querySelector('.hc-section-split'),
      support: document.querySelector('.hc-support'),
      footer: document.querySelector('.hc-footer'),
      tutorials: document.querySelector('.hc-tutorials')
    };

    function filterItems(query) {
      var q = query.toLowerCase().trim();
      var visible = false;

      allItems.forEach(function (el) {
        var text = (el.textContent || '').toLowerCase();
        var show = !q || text.indexOf(q) > -1;
        el.style.display = show ? '' : 'none';
        if (show) visible = true;
      });

      if (q) {
        Object.keys(sections).forEach(function (key) {
          var el = sections[key];
          if (!el) return;
          var hasVisible = Array.from(allItems).some(function (child) {
            return el.contains(child) && child.style.display !== 'none';
          });
          if (key === 'accordion' || key === 'tutorials') {
            el.style.display = hasVisible ? '' : 'none';
          }
        });
      } else {
        Object.keys(sections).forEach(function (key) {
          var el = sections[key];
          if (!el) return;
          el.style.display = '';
        });
      }

      if (empty) empty.style.display = (q && !visible) ? '' : 'none';
    }

    function doSearch() {
      filterItems(input ? input.value : '');
    }

    if (input) {
      input.addEventListener('input', doSearch);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSearch();
      });
    }

    if (btn) {
      btn.addEventListener('click', doSearch);
    }

    if (clear) {
      clear.addEventListener('click', function () {
        if (input) { input.value = ''; input.focus(); }
        filterItems('');
      });
    }
  }

  /* ─── Accordion ─── */
  function initAccordion() {
    var triggers = document.querySelectorAll('[data-hc-accordion-trigger]');
    var contents = document.querySelectorAll('[data-hc-accordion-item]');

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var item = trigger.closest('[data-hc-accordion-item]');
        var content = item.querySelector('.hc-accordion-content');
        var isOpen = trigger.getAttribute('aria-expanded') === 'true';

        contents.forEach(function (other) {
          var t = other.querySelector('[data-hc-accordion-trigger]');
          var c = other.querySelector('.hc-accordion-content');
          if (t) t.setAttribute('aria-expanded', 'false');
          if (c) c.classList.remove('open');
        });

        if (!isOpen) {
          trigger.setAttribute('aria-expanded', 'true');
          content.classList.add('open');
        }
      });
    });
  }

  /* ─── Video Modal ─── */
  function initVideoModal() {
    var modal = document.querySelector('[data-hc-modal]');
    var titleEl = document.querySelector('[data-hc-modal-title]');
    var durationEl = document.querySelector('[data-hc-modal-duration]');
    var descEl = document.querySelector('[data-hc-modal-desc]');
    var closeBtns = document.querySelectorAll('[data-hc-modal-close]');
    var videoMap = {
      'getting-started': { title: 'Getting Started', duration: '6 min', desc: 'Learn the basics of navigating and using the ResolveOne platform, from the Home dashboard to the Help Center.' },
      'using-ai': { title: 'Using AI Assistant', duration: '8 min', desc: 'Step-by-step walkthrough of the AI diagnosis engine, confidence scoring, and automated ticket creation.' },
      'managing-tickets': { title: 'Managing Tickets', duration: '5 min', desc: 'How to track, filter, and manage support tickets across the full lifecycle with SLA monitoring.' },
      'analytics-overview': { title: 'Analytics Overview', duration: '7 min', desc: 'Explore KPI cards, trend charts, distribution donuts, and performance metrics in depth.' }
    };

    document.querySelectorAll('[data-hc-video]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-hc-video');
        var info = videoMap[key] || { title: 'Tutorial', duration: '—', desc: '' };
        if (titleEl) titleEl.textContent = info.title;
        if (durationEl) durationEl.textContent = info.duration;
        if (descEl) descEl.textContent = info.desc;
        if (modal) modal.style.display = 'flex';
      });
    });

    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (modal) modal.style.display = 'none';
      });
    });

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.classList.contains('hc-modal-backdrop')) {
          modal.style.display = 'none';
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
          modal.style.display = 'none';
        }
      });
    }
  }

  /* ─── Init ─── */
  function init() {
    initSearch();
    initAccordion();
    initVideoModal();
    initDocViewer();
  }

  window.HelpCenter = { init: init };
})();
