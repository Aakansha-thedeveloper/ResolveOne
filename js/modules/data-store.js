(function () {
  'use strict';

  var STORAGE_KEY = 'resolveone_data';
  var store = {};
  var listeners = {};

  // ─── Default Mock Data ───

  function buildDefaultData() {
    var agents = [
      { name: 'Neha Kapoor', initials: 'NK', color: '#1F7A8C' },
      { name: 'Mike Roberts', initials: 'MR', color: '#2563EB' },
      { name: 'Emily Park', initials: 'EP', color: '#7C3AED' },
      { name: 'James Wilson', initials: 'JW', color: '#0D9488' },
      { name: 'Priya Sharma', initials: 'PS', color: '#022B3A' }
    ];

    var requesters = [
      { name: 'Sarah Chen', email: 'sarah.chen@resolveone.com', initials: 'SC', color: '#1F7A8C', dept: 'Engineering' },
      { name: 'Mike Roberts', email: 'mike.roberts@resolveone.com', initials: 'MR', color: '#2563EB', dept: 'Marketing' },
      { name: 'Emily Park', email: 'emily.park@resolveone.com', initials: 'EP', color: '#7C3AED', dept: 'Finance' },
      { name: 'David Kim', email: 'david.kim@resolveone.com', initials: 'DK', color: '#0D9488', dept: 'Engineering' },
      { name: 'Lisa Anderson', email: 'lisa.anderson@resolveone.com', initials: 'LA', color: '#022B3A', dept: 'Marketing' },
      { name: 'Tom Bradley', email: 'tom.bradley@resolveone.com', initials: 'TB', color: '#B91C1C', dept: 'Finance' },
      { name: 'Rachel Green', email: 'rachel.green@resolveone.com', initials: 'RG', color: '#15803D', dept: 'HR' },
      { name: 'Alex Turner', email: 'alex.turner@resolveone.com', initials: 'AT', color: '#9333EA', dept: 'Operations' }
    ];

    var issues = [
      { issue: 'VPN not connecting after Windows Update', cat: 'Network & Connectivity', desc: 'After the latest Windows update, my VPN client fails to connect with error 691. I have tried restarting the service and reinstalling the client.' },
      { issue: 'Slow Wi-Fi in office — troubleshooting', cat: 'Network & Connectivity', desc: 'The Wi-Fi in the east wing of the office has been extremely slow for the past two days. Other wings are working fine.' },
      { issue: 'Outlook keeps asking for password', cat: 'Email & Collaboration', desc: 'Microsoft Outlook prompts for my password every time I open it, even after entering the correct credentials.' },
      { issue: 'Teams microphone not working', cat: 'Email & Collaboration', desc: 'My microphone is not detected in Microsoft Teams meetings. Works fine in other applications.' },
      { issue: 'Laptop battery draining fast', cat: 'Hardware', desc: 'My laptop battery drains from 100% to 20% within 2 hours of normal usage. It used to last 6+ hours.' },
      { issue: 'External monitor not detected', cat: 'Hardware', desc: 'My Dell laptop does not detect the external monitor when connected via HDMI. The monitor works with other laptops.' },
      { issue: 'Password reset request', cat: 'Account & Access', desc: 'I need to reset my password as I have forgotten it. I cannot access the self-service portal.' },
      { issue: 'Application not responding', cat: 'Software / Applications', desc: 'The SAP GUI application freezes 5 minutes after launch. I have reinstalled but the issue persists.' },
      { issue: 'Printer not responding', cat: 'Printer', desc: 'The network printer on the third floor is showing offline status. Print jobs are stuck in the queue.' },
      { issue: 'OneDrive sync stuck', cat: 'Cloud & SaaS', desc: 'OneDrive sync has been stuck on "Processing changes" for over 24 hours. Files are not syncing.' },
      { issue: 'Website blocked by proxy', cat: 'Security & Access', desc: 'A legitimate business website is being blocked by the corporate proxy. I need it unblocked for my work.' },
      { issue: 'Windows Blue Screen after update', cat: 'Windows & OS', desc: 'Getting BSOD with error PAGE_FAULT_IN_NONPAGED_AREA after installing the latest Windows cumulative update.' },
      { issue: 'SAP GUI crashes on launch', cat: 'ERP / SAP', desc: 'SAP GUI crashes immediately after launch with error "Runtime Errors". Have tried compatibility mode.' },
      { issue: 'Calendar sharing permissions issue', cat: 'Email & Collaboration', desc: 'I cannot share my Outlook calendar with my team. The sharing permissions option is grayed out.' },
      { issue: 'Account locked after multiple attempts', cat: 'Account & Access', desc: 'My account has been locked after multiple failed login attempts. I need an administrator to unlock it.' }
    ];

    var priorities = ['critical', 'high', 'medium', 'low'];
    var statuses = ['open', 'open', 'open', 'in-progress', 'in-progress', 'waiting', 'resolved', 'closed'];
    var categories = ['Network & Connectivity', 'Email & Collaboration', 'Hardware', 'Account & Access', 'Software / Applications', 'ERP / SAP', 'Cloud & SaaS', 'Security & Access', 'Windows & OS', 'Printer'];

    // ─── Tickets ───
    var tickets = [];
    var idCounter = 2485;
    // Seed deterministic tickets
    for (var i = 0; i < 35; i++) {
      var issueData = issues[i % issues.length];
      var req = requesters[i % requesters.length];
      var agentIdx = i < 25 ? i % agents.length : -1;
      var priority = priorities[i % priorities.length];
      var status = statuses[i % statuses.length];
      var slaChoices = ['ok', 'ok', 'ok', 'ok', 'warning', 'at-risk'];
      var sla = (status === 'open' || status === 'in-progress') ? slaChoices[i % slaChoices.length] : 'ok';
      var hoursAgo = Math.floor(i * 4.7) + 1;
      var created = new Date(Date.now() - hoursAgo * 3600000);
      var updated = new Date(created.getTime() + Math.floor(Math.random() * 24) * 3600000);
      var aiConf = Math.floor(Math.random() * 25) + 70;

      tickets.push({
        id: 'RSV-' + idCounter,
        issue: issueData.issue,
        description: issueData.desc,
        priority: priority,
        status: status,
        category: issueData.cat,
        department: req.dept,
        requester: req,
        agent: agentIdx >= 0 ? agents[agentIdx] : null,
        created: created.toISOString(),
        updated: updated.toISOString(),
        sla: sla,
        aiConfidence: aiConf,
        tags: [],
        conversation: [
          { from: 'user', name: req.name, text: issueData.desc, time: created.toISOString() }
        ]
      });
      idCounter--;
    }

    // ─── Users ───
    var users = [];
    var allUsers = [
      { name: 'Neha Kapoor', email: 'neha.kapoor@resolveone.com', initials: 'NK', color: '#1F7A8C', role: 'agent', dept: 'Engineering', status: 'active', online: true, joined: 'Jan 2024' },
      { name: 'Mike Roberts', email: 'mike.roberts@resolveone.com', initials: 'MR', color: '#2563EB', role: 'agent', dept: 'Marketing', status: 'active', online: false, joined: 'Mar 2024' },
      { name: 'Emily Park', email: 'emily.park@resolveone.com', initials: 'EP', color: '#7C3AED', role: 'agent', dept: 'Finance', status: 'active', online: true, joined: 'Jun 2024' },
      { name: 'James Wilson', email: 'james.wilson@resolveone.com', initials: 'JW', color: '#0D9488', role: 'agent', dept: 'IT Support', status: 'active', online: true, joined: 'Feb 2024' },
      { name: 'Priya Sharma', email: 'priya.sharma@resolveone.com', initials: 'PS', color: '#022B3A', role: 'agent', dept: 'Operations', status: 'active', online: false, joined: 'Apr 2024' },
      { name: 'Sarah Chen', email: 'sarah.chen@resolveone.com', initials: 'SC', color: '#1F7A8C', role: 'user', dept: 'Engineering', status: 'active', online: true, joined: 'Jan 2024' },
      { name: 'David Kim', email: 'david.kim@resolveone.com', initials: 'DK', color: '#0D9488', role: 'user', dept: 'Engineering', status: 'active', online: true, joined: 'Aug 2024' },
      { name: 'Lisa Anderson', email: 'lisa.anderson@resolveone.com', initials: 'LA', color: '#022B3A', role: 'user', dept: 'Marketing', status: 'active', online: false, joined: 'Sep 2024' },
      { name: 'Tom Bradley', email: 'tom.bradley@resolveone.com', initials: 'TB', color: '#B91C1C', role: 'user', dept: 'Finance', status: 'active', online: false, joined: 'Oct 2024' },
      { name: 'Rachel Green', email: 'rachel.green@resolveone.com', initials: 'RG', color: '#15803D', role: 'agent', dept: 'HR', status: 'active', online: true, joined: 'Nov 2024' },
      { name: 'Alex Turner', email: 'alex.turner@resolveone.com', initials: 'AT', color: '#9333EA', role: 'admin', dept: 'Operations', status: 'active', online: true, joined: 'Dec 2024' },
      { name: 'Admin User', email: 'admin@resolveone.com', initials: 'AU', color: '#1F7A8C', role: 'admin', dept: 'IT Support', status: 'active', online: true, joined: 'Jan 2024' }
    ];
    allUsers.forEach(function (u) {
      var userTickets = tickets.filter(function (t) {
        return t.requester.name === u.name || (t.agent && t.agent.name === u.name);
      });
      users.push({
        id: 'USR-' + u.name.split(' ')[0].toLowerCase(),
        name: u.name,
        email: u.email,
        initials: u.initials,
        color: u.color,
        role: u.role,
        department: u.dept,
        status: u.status,
        online: u.online,
        tickets: userTickets.length,
        joined: u.joined
      });
    });

    // ─── Departments ───
    var departments = [
      { id: 1, name: 'Engineering', agents: 2, ticketCount: 112, sla: 97 },
      { id: 2, name: 'Marketing', agents: 2, ticketCount: 78, sla: 95 },
      { id: 3, name: 'Finance', agents: 2, ticketCount: 54, sla: 96 },
      { id: 4, name: 'HR', agents: 1, ticketCount: 48, sla: 98 },
      { id: 5, name: 'Operations', agents: 2, ticketCount: 50, sla: 94 },
      { id: 6, name: 'IT Support', agents: 2, ticketCount: 156, sla: 98 }
    ];

    // ─── KB Articles ───
    var kbArticles = [
      { id: 1, title: 'VPN Connection Troubleshooting Guide', category: 'Network & Connectivity', status: 'published', views: 2847, helpful: 94, content: 'Step-by-step guide to troubleshoot VPN connection issues...', lastUpdated: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: 2, title: 'How to Reset Your Password', category: 'Account & Access', status: 'published', views: 5421, helpful: 97, content: 'Follow these steps to reset your password...', lastUpdated: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: 3, title: 'Outlook Email Sync Issues – Fixes', category: 'Email & Collaboration', status: 'published', views: 1932, helpful: 89, content: 'Common fixes for Outlook sync problems...', lastUpdated: new Date(Date.now() - 7 * 86400000).toISOString() },
      { id: 4, title: 'Teams Meeting Troubleshooting', category: 'Email & Collaboration', status: 'published', views: 3214, helpful: 78, content: 'Audio and video troubleshooting for Microsoft Teams...', lastUpdated: new Date(Date.now() - 10 * 86400000).toISOString() },
      { id: 5, title: 'SAP GUI Installation Guide', category: 'ERP / SAP', status: 'draft', views: 0, helpful: 0, content: 'Installation guide for SAP GUI v7.8...', lastUpdated: new Date(Date.now() - 0.1 * 86400000).toISOString() },
      { id: 6, title: 'Printer Setup & Driver Installation', category: 'Printer', status: 'published', views: 1576, helpful: 91, content: 'Guide to installing network printers...', lastUpdated: new Date(Date.now() - 14 * 86400000).toISOString() }
    ];

    // ─── Activities ───
    var activities = [
      { id: 1, text: '<strong>Sarah Chen</strong> opened ticket <strong>RSV-2485</strong>', time: new Date(Date.now() - 2 * 60000), type: 'ticket' },
      { id: 2, text: '<strong>Mike Roberts</strong> assigned to ticket <strong>RSV-2484</strong>', time: new Date(Date.now() - 14 * 60000), type: 'ticket' },
      { id: 3, text: 'New user <strong>Alex Turner</strong> registered', time: new Date(Date.now() - 32 * 60000), type: 'user' },
      { id: 4, text: 'AI Copilot resolved ticket <strong>RSV-2479</strong>', time: new Date(Date.now() - 60 * 60000), type: 'system' },
      { id: 5, text: '<strong>Emily Park</strong> updated ticket <strong>RSV-2483</strong>', time: new Date(Date.now() - 120 * 60000), type: 'ticket' },
      { id: 6, text: 'KB article updated: <strong>VPN Setup Guide</strong>', time: new Date(Date.now() - 180 * 60000), type: 'kb' },
      { id: 7, text: 'Ticket <strong>RSV-2476</strong> escalated to Critical', time: new Date(Date.now() - 240 * 60000), type: 'ticket' },
      { id: 8, text: 'System backup completed successfully', time: new Date(Date.now() - 300 * 60000), type: 'system' }
    ];

    // ─── AI Suggestions ───
    var aiSuggestions = [
      { id: 1, ticketId: 'RSV-2485', issue: 'VPN not connecting after Windows Update', suggestion: 'Restart VPN service and clear cached credentials. Run: ipconfig /flushdns', confidence: 96, status: 'accepted', time: new Date(Date.now() - 2 * 60000).toISOString() },
      { id: 2, ticketId: 'RSV-2483', issue: 'Teams microphone not working', suggestion: 'Check microphone permissions in OS and Teams privacy settings. Verify default device.', confidence: 92, status: 'accepted', time: new Date(Date.now() - 15 * 60000).toISOString() },
      { id: 3, ticketId: 'RSV-2480', issue: 'Laptop battery draining fast', suggestion: 'Run power efficiency report: powercfg /energy. Check for background processes.', confidence: 78, status: 'pending', time: new Date(Date.now() - 42 * 60000).toISOString() },
      { id: 4, ticketId: 'RSV-2476', issue: 'SAP Login Error 691', suggestion: 'Verify SAP credentials and reset password via self-service portal. Check network connectivity to SAP server.', confidence: 95, status: 'accepted', time: new Date(Date.now() - 60 * 60000).toISOString() },
      { id: 5, ticketId: 'RSV-2472', issue: 'Outlook email sync stuck', suggestion: 'Repair Outlook profile via Control Panel > Mail. Reduce OST file size by archiving old emails.', confidence: 91, status: 'rejected', time: new Date(Date.now() - 120 * 60000).toISOString() }
    ];

    // ─── Settings ───
    var settings = {
      platformName: 'ResolveOne',
      supportEmail: 'support@resolveone.com',
      defaultLanguage: 'English (US)',
      timezone: 'UTC',
      autoCloseDays: 7,
      defaultPriority: 'medium',
      allowAttachments: true,
      aiSuggestions: true,
      requireAssignment: true,
      modelVersion: 'ResolveOne AI v3.2',
      minConfidence: 75,
      autoResolve: true,
      learnFromTickets: true,
      autoGenerateKB: false,
      emailNotifications: true,
      slaAlerts: true,
      dailyDigest: true,
      weeklyReport: false,
      systemAlerts: true
    };

    return {
      tickets: tickets,
      users: users,
      departments: departments,
      kbArticles: kbArticles,
      activities: activities,
      aiSuggestions: aiSuggestions,
      settings: settings,
      nextTicketNum: idCounter,
      nextActivityId: 9,
      nextSuggestionId: 6,
      nextUserId: allUsers.length + 1,
      nextDepartmentId: 7,
      nextKBId: 7
    };
  }

  // ─── Load / Save ───

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        store = JSON.parse(raw);
        // Ensure all required fields exist
        var defaults = buildDefaultData();
        for (var key in defaults) {
          if (!(key in store)) store[key] = defaults[key];
        }
        return;
      }
    } catch (e) {}
    store = buildDefaultData();
    save();
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) {}
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(function (fn) { try { fn(data); } catch (e) {} });
  }

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function (f) { return f !== fn; });
  }

  // ─── Tickets CRUD ───

  function getTickets(filters) {
    var f = filters || {};
    return store.tickets.filter(function (t) {
      if (f.priority && f.priority !== 'all' && t.priority !== f.priority) return false;
      if (f.status && f.status !== 'all' && t.status !== f.status) return false;
      if (f.category && f.category !== 'all' && t.category !== f.category) return false;
      if (f.department && f.department !== 'all' && t.department !== f.department) return false;
      if (f.agent) {
        if (f.agent === 'Unassigned') { if (t.agent) return false; }
        else if (f.agent !== 'all' && (!t.agent || t.agent.name !== f.agent)) return false;
      }
      if (f.search) {
        var q = f.search.toLowerCase();
        var haystack = (t.id + ' ' + t.issue + ' ' + t.requester.name + ' ' + t.category).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      if (f.requester && t.requester.name !== f.requester) return false;
      return true;
    });
  }

  function getTicket(id) {
    return store.tickets.filter(function (t) { return t.id === id; })[0] || null;
  }

  function addTicket(data) {
    store.nextTicketNum--;
    var ticket = {
      id: 'RSV-' + store.nextTicketNum,
      issue: data.issue,
      description: data.description || '',
      priority: data.priority || 'medium',
      status: 'open',
      category: data.category || 'Other',
      department: data.department || '',
      requester: data.requester || { name: 'Unknown', email: '', initials: 'U', color: '#6B7280', dept: '' },
      agent: data.agent || null,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      sla: 'ok',
      aiConfidence: 0,
      tags: data.tags || [],
      conversation: data.description ? [{ from: 'user', name: data.requester ? data.requester.name : 'Unknown', text: data.description, time: new Date().toISOString() }] : []
    };
    store.tickets.unshift(ticket);
    addActivity('<strong>' + ticket.requester.name + '</strong> opened ticket <strong>' + ticket.id + '</strong>', 'ticket');
    save();
    emit('ticket:added', ticket);
    return ticket;
  }

  function updateTicket(id, changes) {
    for (var i = 0; i < store.tickets.length; i++) {
      if (store.tickets[i].id === id) {
        for (var key in changes) {
          if (changes.hasOwnProperty(key)) store.tickets[i][key] = changes[key];
        }
        store.tickets[i].updated = new Date().toISOString();
        save();
        emit('ticket:updated', { id: id, ticket: store.tickets[i], changes: changes });
        return store.tickets[i];
      }
    }
    return null;
  }

  function deleteTicket(id) {
    for (var i = 0; i < store.tickets.length; i++) {
      if (store.tickets[i].id === id) {
        var removed = store.tickets.splice(i, 1)[0];
        addActivity('Ticket <strong>' + id + '</strong> was deleted', 'system');
        save();
        emit('ticket:deleted', { id: id, ticket: removed });
        return true;
      }
    }
    return false;
  }

  function addConversation(ticketId, message) {
    for (var i = 0; i < store.tickets.length; i++) {
      if (store.tickets[i].id === ticketId) {
        if (!store.tickets[i].conversation) store.tickets[i].conversation = [];
        store.tickets[i].conversation.push({
          from: message.from,
          name: message.name,
          text: message.text,
          time: new Date().toISOString()
        });
        store.tickets[i].updated = new Date().toISOString();
        save();
        emit('ticket:updated', { id: ticketId, ticket: store.tickets[i] });
        return true;
      }
    }
    return false;
  }

  // ─── Users CRUD ───

  function getUsers(filters) {
    var f = filters || {};
    return store.users.filter(function (u) {
      if (f.role && f.role !== 'all' && u.role !== f.role) return false;
      if (f.department && f.department !== 'all' && u.department !== f.department) return false;
      if (f.status && f.status !== 'all' && u.status !== f.status) return false;
      if (f.search) {
        var q = f.search.toLowerCase();
        if ((u.name + ' ' + u.email + ' ' + u.role).toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function getUser(id) {
    return store.users.filter(function (u) { return u.id === id; })[0] || null;
  }

  function updateUser(id, changes) {
    for (var i = 0; i < store.users.length; i++) {
      if (store.users[i].id === id) {
        for (var key in changes) {
          if (changes.hasOwnProperty(key)) store.users[i][key] = changes[key];
        }
        save();
        emit('user:updated', { id: id, user: store.users[i] });
        return store.users[i];
      }
    }
    return null;
  }

  function deleteUser(id) {
    for (var i = 0; i < store.users.length; i++) {
      if (store.users[i].id === id) {
        var removed = store.users.splice(i, 1)[0];
        addActivity('User <strong>' + removed.name + '</strong> was deleted', 'user');
        save();
        emit('user:deleted', { id: id, user: removed });
        return true;
      }
    }
    return false;
  }

  function addUser(data) {
    var user = {
      id: 'USR-' + data.name.split(' ')[0].toLowerCase(),
      name: data.name,
      email: data.email,
      initials: data.initials || (data.name ? data.name.split(' ').map(function (s) { return s[0]; }).join('').toUpperCase().slice(0, 2) : 'U'),
      color: data.color || '#6B7280',
      role: data.role || 'user',
      department: data.department || '',
      status: 'active',
      online: false,
      tickets: 0,
      joined: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })
    };
    user.id = 'USR-' + (store.nextUserId++);
    store.users.push(user);
    addActivity('New user <strong>' + user.name + '</strong> registered', 'user');
    save();
    emit('user:added', user);
    return user;
  }

  // ─── Departments CRUD ───

  function getDepartments() { return store.departments.slice(); }

  function addDepartment(data) {
    var dept = {
      id: store.nextDepartmentId++,
      name: data.name,
      agents: data.agents || 0,
      ticketCount: data.ticketCount || 0,
      sla: data.sla || 100
    };
    store.departments.push(dept);
    addActivity('Department <strong>' + dept.name + '</strong> created', 'system');
    save();
    emit('department:added', dept);
    return dept;
  }

  function updateDepartment(id, changes) {
    for (var i = 0; i < store.departments.length; i++) {
      if (store.departments[i].id === id) {
        for (var key in changes) {
          if (changes.hasOwnProperty(key)) store.departments[i][key] = changes[key];
        }
        save();
        emit('department:updated', { id: id, department: store.departments[i] });
        return store.departments[i];
      }
    }
    return null;
  }

  function deleteDepartment(id) {
    for (var i = 0; i < store.departments.length; i++) {
      if (store.departments[i].id === id) {
        var removed = store.departments.splice(i, 1)[0];
        save();
        emit('department:deleted', { id: id, department: removed });
        return true;
      }
    }
    return false;
  }

  // ─── KB Articles CRUD ───

  function getKBArticles() { return store.kbArticles.slice(); }

  function addKBArticle(data) {
    var article = {
      id: store.nextKBId++,
      title: data.title,
      category: data.category || 'General',
      status: data.status || 'draft',
      views: 0,
      helpful: 0,
      content: data.content || '',
      lastUpdated: new Date().toISOString()
    };
    store.kbArticles.unshift(article);
    addActivity('KB article created: <strong>' + article.title + '</strong>', 'kb');
    save();
    emit('kb:added', article);
    return article;
  }

  function updateKBArticle(id, changes) {
    for (var i = 0; i < store.kbArticles.length; i++) {
      if (store.kbArticles[i].id === id) {
        for (var key in changes) {
          if (changes.hasOwnProperty(key)) store.kbArticles[i][key] = changes[key];
        }
        store.kbArticles[i].lastUpdated = new Date().toISOString();
        save();
        emit('kb:updated', { id: id, article: store.kbArticles[i] });
        return store.kbArticles[i];
      }
    }
    return null;
  }

  function deleteKBArticle(id) {
    for (var i = 0; i < store.kbArticles.length; i++) {
      if (store.kbArticles[i].id === id) {
        var removed = store.kbArticles.splice(i, 1)[0];
        save();
        emit('kb:deleted', { id: id, article: removed });
        return true;
      }
    }
    return false;
  }

  // ─── Activities ───

  function getActivities(limit) {
    var sorted = store.activities.slice().sort(function (a, b) {
      return new Date(b.time) - new Date(a.time);
    });
    return limit ? sorted.slice(0, limit) : sorted;
  }

  function addActivity(text, type) {
    var activity = {
      id: store.nextActivityId++,
      text: text,
      time: new Date().toISOString(),
      type: type || 'system'
    };
    store.activities.unshift(activity);
    if (store.activities.length > 100) store.activities.length = 100;
    save();
    emit('activity:added', activity);
  }

  // ─── AI Suggestions ───

  function getAISuggestions() { return store.aiSuggestions.slice(); }

  function addAISuggestion(data) {
    var sug = {
      id: store.nextSuggestionId++,
      ticketId: data.ticketId,
      issue: data.issue,
      suggestion: data.suggestion,
      confidence: data.confidence || 85,
      status: 'pending',
      time: new Date().toISOString()
    };
    store.aiSuggestions.unshift(sug);
    save();
    emit('ai:suggestion', sug);
    return sug;
  }

  // ─── Settings ───

  function getSettings() {
    return JSON.parse(JSON.stringify(store.settings));
  }

  function updateSettings(changes) {
    for (var key in changes) {
      if (changes.hasOwnProperty(key)) store.settings[key] = changes[key];
    }
    save();
    emit('settings:updated', store.settings);
    return getSettings();
  }

  // ─── Stats ───

  function getStats() {
    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var total = store.tickets.length;
    var open = store.tickets.filter(function (t) { return t.status === 'open' || t.status === 'in-progress' || t.status === 'waiting'; }).length;
    var resolved = store.tickets.filter(function (t) { return t.status === 'resolved'; }).length;
    var critical = store.tickets.filter(function (t) { return t.priority === 'critical'; }).length;
    var resolvedToday = store.tickets.filter(function (t) {
      return t.status === 'resolved' && new Date(t.updated) >= todayStart;
    }).length;
    var activeUsers = store.users.filter(function (u) { return u.status === 'active'; }).length;
    var avgResolution = '4.2h';
    var slaCompliance = 97.4;
    var aiSuccess = 94.2;

    return {
      totalTickets: total,
      openTickets: open,
      resolvedTickets: resolved,
      criticalTickets: critical,
      resolvedToday: resolvedToday,
      activeUsers: activeUsers,
      avgResolution: avgResolution,
      slaCompliance: slaCompliance,
      aiSuccess: aiSuccess
    };
  }

  // ─── Init ───

  function init() {
    load();
  }

  // ─── Public API ───

  window.ResolveOneData = {
    // Lifecycle
    init: init,
    on: on,
    off: off,

    // Tickets
    getTickets: getTickets,
    getTicket: getTicket,
    addTicket: addTicket,
    updateTicket: updateTicket,
    deleteTicket: deleteTicket,
    addConversation: addConversation,

    // Users
    getUsers: getUsers,
    getUser: getUser,
    addUser: addUser,
    updateUser: updateUser,
    deleteUser: deleteUser,

    // Departments
    getDepartments: getDepartments,
    addDepartment: addDepartment,
    updateDepartment: updateDepartment,
    deleteDepartment: deleteDepartment,

    // KB
    getKBArticles: getKBArticles,
    addKBArticle: addKBArticle,
    updateKBArticle: updateKBArticle,
    deleteKBArticle: deleteKBArticle,

    // Activities
    getActivities: getActivities,
    addActivity: addActivity,

    // AI
    getAISuggestions: getAISuggestions,
    addAISuggestion: addAISuggestion,

    // Settings
    getSettings: getSettings,
    updateSettings: updateSettings,

    // Stats
    getStats: getStats,

    // Internal (for debugging)
    _store: store
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
