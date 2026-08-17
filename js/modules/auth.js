(function () {
  'use strict';

  if (!window.ResolveOneSession) return;

  var s = window.ResolveOneSession;
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  var redirecting = false;

  var ENGINEER_PAGES = ['engineer-dashboard.html', 'engineer-tickets.html', 'engineer-resolution.html', 'engineer-reports.html', 'engineer-profile.html'];
  var USER_PAGES = ['index.html', 'tickets.html', 'ai-assistant.html', 'knowledge-base.html', 'help-center.html', 'profile.html', 'reports.html', 'settings.html'];
  var ADMIN_PAGES = ['users.html', 'knowledge-base-admin.html'];
  var PUBLIC_PAGES = ['login.html', 'register.html'];
  var ALL_ROLE_PAGES = ['reports.html'];

  var isEngineerPage = ENGINEER_PAGES.indexOf(currentPage) !== -1;
  var isUserPage = USER_PAGES.indexOf(currentPage) !== -1;
  var isAdminPage = ADMIN_PAGES.indexOf(currentPage) !== -1;
  var isPublicPage = PUBLIC_PAGES.indexOf(currentPage) !== -1;
  var isAllRolePage = ALL_ROLE_PAGES.indexOf(currentPage) !== -1;

  function getCorrectDashboard(role) {
    if (role === 'support_engineer' || role === 'engineer') return 'engineer-dashboard.html';
    if (role === 'user') return 'index.html';
    if (role === 'admin') return 'users.html';
    return 'login.html';
  }

  function redirectToLogin() {
    if (redirecting) return;
    redirecting = true;
    window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPage);
  }

  function redirectTo(url) {
    if (redirecting) return;
    redirecting = true;
    window.location.href = url;
  }

  function hasValidRole(role, pageType) {
    if (pageType === 'engineer') return role === 'support_engineer' || role === 'engineer';
    if (pageType === 'user') return role === 'user';
    if (pageType === 'admin') return role === 'admin';
    if (pageType === 'all') return role === 'user' || role === 'admin' || role === 'support_engineer' || role === 'engineer';
    return true;
  }

  function checkAccess() {
    if (isPublicPage) return;

    if (!s.isAuthenticated()) {
      redirectToLogin();
      return;
    }

    var user = s.getUser();
    var role = user && user.role;

    if (!role) {
      s.clearSession();
      redirectToLogin();
      return;
    }

    var pageType = isEngineerPage ? 'engineer' : isAllRolePage ? 'all' : isUserPage ? 'user' : isAdminPage ? 'admin' : null;

    if (pageType && !hasValidRole(role, pageType)) {
      var correctDash = getCorrectDashboard(role);
      redirectTo(correctDash);
      return;
    }

    s.validateSession().then(function (result) {
      if (!result || !result.valid) {
        s.clearSession();
        redirectToLogin();
        return;
      }
      var serverRole = result.user && result.user.role;
      if (serverRole && serverRole !== role) {
        s.setSession(s.getToken(), result.user);
        var correctDash = getCorrectDashboard(serverRole);
        redirectTo(correctDash);
      }
    }).catch(function () {
      redirectToLogin();
    });
  }

  checkAccess();
})();