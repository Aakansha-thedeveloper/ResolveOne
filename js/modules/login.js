(function () {
  'use strict';

  function qs(s) { return document.querySelector(s); }

  var SESSION_KEY = 'rs_session_v2';

  function getRedirect() {
    var m = window.location.search.match(/[?&]redirect=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function showError(msg, inputEl) {
    var el = qs('[data-login-error]');
    var txt = qs('[data-login-error-text]');
    var serverErr = qs('[data-login-server-error]');
    if (serverErr) serverErr.style.display = 'none';
    if (!el || !txt) return;
    txt.textContent = msg;
    el.style.display = 'flex';
    el.style.animation = 'none';
    requestAnimationFrame(function () {
      el.style.animation = 'login-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both';
    });
    if (inputEl) {
      inputEl.classList.add('field-error');
      inputEl.addEventListener('input', function onInput() {
        inputEl.classList.remove('field-error');
        inputEl.removeEventListener('input', onInput);
      }, { once: true });
    }
  }

  function showServerError(msg) {
    var el = qs('[data-login-error]');
    var serverErr = qs('[data-login-server-error]');
    var serverTxt = qs('[data-login-server-error-text]');
    if (el) el.style.display = 'none';
    if (!serverErr || !serverTxt) return;
    serverTxt.textContent = msg || 'Server is not responding. Please try again later.';
    serverErr.style.display = 'flex';
  }

  function clearFieldErrors() {
    var els = document.querySelectorAll('.field-error');
    for (var i = 0; i < els.length; i++) { els[i].classList.remove('field-error'); }
  }

  function hideErrors() {
    var el = qs('[data-login-error]');
    var serverErr = qs('[data-login-server-error]');
    if (el) el.style.display = 'none';
    if (serverErr) serverErr.style.display = 'none';
    clearFieldErrors();
  }

  function setLoading(loading) {
    var btn = qs('[data-login-btn]');
    if (!btn) return;
    if (loading) {
      btn.classList.add('is-loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  }

  function handleLoginError(err) {
    var msg = err.message || 'Authentication failed';
    if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('Network request failed') !== -1) {
      showServerError('Cannot reach the server. Check your connection or try again.');
    } else if (msg.indexOf('401') !== -1 || msg.indexOf('Incorrect password') !== -1 || msg.indexOf('No account found') !== -1) {
      showError(msg);
    } else if (msg.indexOf('403') !== -1) {
      showError(msg);
    } else {
      showError(msg);
    }
  }

  function getRoleRedirect(role) {
    var map = { admin: 'users.html', engineer: 'engineer-dashboard.html', 'support_engineer': 'engineer-dashboard.html', user: 'index.html' };
    return map[role] || 'index.html';
  }

  function getSafeRedirect(role) {
    var target = getRedirect();
    if (!target) return getRoleRedirect(role);
    var engineerPages = ['engineer-dashboard.html','engineer-tickets.html','engineer-resolution.html','engineer-reports.html','reports.html'];
    var userPages = ['index.html','tickets.html','ai-assistant.html','knowledge-base.html','help-center.html','profile.html','reports.html','settings.html'];
    var isEngineer = engineerPages.indexOf(target) !== -1;
    var isUserPage = userPages.indexOf(target) !== -1;
    var isEngineerRole = role === 'support_engineer' || role === 'engineer';
    if (isEngineer && isEngineerRole) return target;
    if (isUserPage && role === 'user') return target;
    return getRoleRedirect(role);
  }

  function performLogin(email, password, rememberMe) {
    hideErrors();
    setLoading(true);

    if (!window.ResolveOneSession) {
      setLoading(false);
      showServerError('Authentication module not loaded. Please refresh the page.');
      return;
    }

    window.ResolveOneSession.login(email, password, rememberMe)
      .then(function (data) {
        setLoading(false);
        var role = data.user && data.user.role;
        var redirect = getSafeRedirect(role);
        window.location.href = redirect;
      })
      .catch(function (err) {
        setLoading(false);
        handleLoginError(err);
      });
  }

  function init() {
    var form = qs('[data-login-form]');
    if (!form) return;

    var emailInput = qs('[data-login-email]');
    var passwordInput = qs('[data-login-password]');
    var rememberCheck = qs('[data-login-remember]');
    var forgotLink = qs('[data-login-forgot]');
    var toggleBtn = qs('[data-password-toggle]');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        var eye = toggleBtn.querySelector('[data-eye-icon]');
        var eyeOff = toggleBtn.querySelector('[data-eye-off-icon]');
        if (eye) eye.style.display = isPassword ? 'none' : '';
        if (eyeOff) eyeOff.style.display = isPassword ? '' : 'none';
      });
    }

    if (forgotLink) {
      forgotLink.addEventListener('click', function (e) {
        e.preventDefault();
        var email = emailInput ? emailInput.value.trim() : '';
        var msg = email
          ? 'A password reset link will be sent to ' + email + ' if it exists in our system.'
          : 'Please enter your email address and click "Forgot Password" again to receive a reset link.';
        showError(msg);
      });
      forgotLink.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          forgotLink.click();
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var email = emailInput ? emailInput.value.trim() : '';
      var password = passwordInput ? passwordInput.value : '';
      var rememberMe = rememberCheck ? rememberCheck.checked : false;

      var hasError = false;

      if (!email) {
        showError('Please enter your email address.', emailInput);
        if (emailInput) emailInput.focus();
        hasError = true;
        return;
      }

      if (email.indexOf('@') === -1 || email.indexOf('.') === -1) {
        showError('Please enter a valid email address.', emailInput);
        if (emailInput) emailInput.focus();
        hasError = true;
        return;
      }

      if (!password) {
        showError('Please enter your password.', passwordInput);
        if (passwordInput) passwordInput.focus();
        hasError = true;
        return;
      }

      if (password.length < 6) {
        showError('Password must be at least 6 characters.', passwordInput);
        if (passwordInput) passwordInput.focus();
        hasError = true;
        return;
      }

      clearFieldErrors();

      if (hasError) return;

      performLogin(email, password, rememberMe);
    });
  }

  var session = null;
  try {
    var raw = localStorage.getItem(SESSION_KEY);
    if (raw) session = JSON.parse(raw);
  } catch (e) {}

  if (session && session.token && session.user) {
    var role = session.user.role;
    var validRoles = ['user', 'support_engineer', 'engineer', 'admin'];
    if (validRoles.indexOf(role) === -1) { session = null; }
    else {
      var redirect = getSafeRedirect(role);
      window.location.href = redirect;
      return;
    }
  }

  window.LoginModule = { init: init };
})();
