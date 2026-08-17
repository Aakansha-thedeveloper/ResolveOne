(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';
  var STORAGE_KEY = 'rs_session_v2';

  function getToken() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return data.token || null;
    } catch (e) {
      return null;
    }
  }

  function getUser() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw).user || null;
    } catch (e) {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token, user: user }));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('resolveone_session');
    localStorage.removeItem('auth');
    try { sessionStorage.clear(); } catch (e) {}
  }

  function isAuthenticated() {
    return !!getToken();
  }

  function getAuthHeaders() {
    var token = getToken();
    if (!token) return {};
    return { 'Authorization': 'Bearer ' + token };
  }

  function validateSession() {
    return fetch(API_BASE + '/api/auth/validate', {
      method: 'GET',
      headers: Object.assign({}, getAuthHeaders()),
    }).then(function (r) { return r.json(); });
  }

  function login(email, password, rememberMe) {
    return fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password, remember_me: rememberMe }),
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.detail || 'Login failed'); });
      return r.json();
    }).then(function (data) {
      setSession(data.token, data.user);
      return data;
    });
  }

  function logout() {
    var token = getToken();
    clearSession();
    if (token) {
      fetch(API_BASE + '/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
      }).catch(function () {});
    }
  }

  function requireAuth(redirectTo) {
    redirectTo = redirectTo || 'login.html';
    if (!isAuthenticated()) {
      var currentPage = window.location.pathname.split('/').pop() || 'index.html';
      window.location.href = redirectTo + '?redirect=' + encodeURIComponent(currentPage);
      return false;
    }
    return true;
  }

  function requireRole(roles) {
    var user = getUser();
    if (!user) return false;
    return roles.indexOf(user.role) !== -1;
  }

  window.ResolveOneSession = {
    getToken: getToken,
    getUser: getUser,
    setSession: setSession,
    clearSession: clearSession,
    isAuthenticated: isAuthenticated,
    getAuthHeaders: getAuthHeaders,
    validateSession: validateSession,
    login: login,
    logout: logout,
    requireAuth: requireAuth,
    requireRole: requireRole,
    STORAGE_KEY: STORAGE_KEY,
    API_BASE: API_BASE,
  };
})();
