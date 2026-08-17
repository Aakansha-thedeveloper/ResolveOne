(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  function showError(msg, inputEl) {
    var el = qs('[data-reg-error]');
    var txt = qs('[data-reg-error-text]');
    var serverErr = qs('[data-reg-server-error]');
    if (serverErr) serverErr.style.display = 'none';
    if (!el || !txt) return;
    txt.textContent = msg;
    el.style.display = 'flex';
    el.style.animation = 'none';
    requestAnimationFrame(function () {
      el.style.animation = 'register-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both';
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
    var el = qs('[data-reg-error]');
    var serverErr = qs('[data-reg-server-error]');
    var serverTxt = qs('[data-reg-server-error-text]');
    if (el) el.style.display = 'none';
    if (!serverErr || !serverTxt) return;
    serverTxt.textContent = msg || 'Server is not responding. Please try again later.';
    serverErr.style.display = 'flex';
  }

  function hideErrors() {
    var el = qs('[data-reg-error]');
    var serverErr = qs('[data-reg-server-error]');
    if (el) el.style.display = 'none';
    if (serverErr) serverErr.style.display = 'none';
    var errs = document.querySelectorAll('.field-error');
    for (var i = 0; i < errs.length; i++) { errs[i].classList.remove('field-error'); }
  }

  function setLoading(loading) {
    var btn = qs('[data-reg-btn]');
    if (!btn) return;
    if (loading) {
      btn.classList.add('is-loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  }

  function showSuccess(msg) {
    var form = qs('[data-register-form]');
    var error = qs('[data-reg-error]');
    var serverErr = qs('[data-reg-server-error]');
    var success = qs('[data-reg-success]');
    var successText = qs('[data-reg-success-text]');
    if (error) error.style.display = 'none';
    if (serverErr) serverErr.style.display = 'none';
    if (form) form.style.display = 'none';
    if (success) success.style.display = 'block';
    if (successText && msg) successText.textContent = msg;
  }

  function performRegistration(data) {
    hideErrors();
    setLoading(true);

    fetch(API_BASE + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw new Error(e.detail || 'Registration failed'); });
        return r.json();
      })
      .then(function () {
        setLoading(false);
        showSuccess('Your account has been created successfully. Redirecting to sign in...');
        setTimeout(function () {
          window.location.href = 'login.html';
        }, 2000);
      })
      .catch(function (err) {
        setLoading(false);
        var msg = err.message || 'Registration failed';
        if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1) {
          showServerError('Cannot reach the server. Check your connection and try again.');
        } else {
          showError(msg);
        }
      });
  }

  function init() {
    var form = qs('[data-register-form]');
    if (!form) return;

    var nameInput = qs('[data-reg-name]');
    var emailInput = qs('[data-reg-email]');
    var phoneInput = qs('[data-reg-phone]');
    var deptInput = qs('[data-reg-dept]');
    var passwordInput = qs('[data-reg-password]');
    var confirmInput = qs('[data-reg-confirm]');
    var inviteInput = qs('[data-reg-invite-code]');
    var invitationBox = qs('[data-reg-invitation]');
    var roleOptions = qsa('[data-reg-role]');

    /* ── Strip disallowed roles (only user + support_engineer allowed) ── */
    roleOptions.forEach(function (opt) {
      var radio = opt.querySelector('input[type="radio"]');
      var val = radio && radio.value;
      if (val !== 'user' && val !== 'support_engineer') {
        opt.style.display = 'none';
      }
    });

    /* ── Password toggle ── */
    function setupToggle(btnSelector, inputEl, eyeIcon, eyeOffIcon) {
      var btn = qs(btnSelector);
      if (!btn) return;
      btn.addEventListener('click', function () {
        var isPassword = inputEl.type === 'password';
        inputEl.type = isPassword ? 'text' : 'password';
        var eye = btn.querySelector(eyeIcon);
        var eyeOff = btn.querySelector(eyeOffIcon);
        if (eye) eye.style.display = isPassword ? 'none' : '';
        if (eyeOff) eyeOff.style.display = isPassword ? '' : 'none';
      });
    }

    setupToggle('[data-reg-password-toggle]', passwordInput, '[data-reg-eye-icon]', '[data-reg-eye-off-icon]');
    setupToggle('[data-reg-confirm-toggle]', confirmInput, '[data-reg-confirm-eye-icon]', '[data-reg-confirm-eye-off-icon]');

    /* ── Account type selector ── */
    roleOptions.forEach(function (opt) {
      opt.addEventListener('click', function () {
        roleOptions.forEach(function (o) { o.classList.remove('is-selected'); });
        opt.classList.add('is-selected');
        var radio = opt.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        if (invitationBox) {
          if (radio && radio.value === 'admin') {
            invitationBox.classList.add('is-visible');
          } else {
            invitationBox.classList.remove('is-visible');
          }
        }
      });
    });

    /* ── Form submit ── */
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var fullName = nameInput ? nameInput.value.trim() : '';
      var email = emailInput ? emailInput.value.trim() : '';
      var phone = phoneInput ? phoneInput.value.trim() : '';
      var department = deptInput ? deptInput.value.trim() : '';
      var password = passwordInput ? passwordInput.value : '';
      var confirmPassword = confirmInput ? confirmInput.value : '';
      var accountType = (qs('input[name="account_type"]:checked') || {}).value || 'user';
      if (accountType !== 'user' && accountType !== 'support_engineer') accountType = 'user';
      var invitationCode = '';

      /* ── Client-side validation ── */
      if (!fullName) {
        showError('Please enter your full name.', nameInput);
        if (nameInput) nameInput.focus();
        return;
      }

      if (!email || email.indexOf('@') === -1 || email.indexOf('.') === -1) {
        showError('Please enter a valid email address.', emailInput);
        if (emailInput) emailInput.focus();
        return;
      }

      if (!password) {
        showError('Please enter a password.', passwordInput);
        if (passwordInput) passwordInput.focus();
        return;
      }

      if (password.length < 8) {
        showError('Password must be at least 8 characters.', passwordInput);
        if (passwordInput) passwordInput.focus();
        return;
      }

      if (!/[A-Z]/.test(password)) {
        showError('Password must contain at least one uppercase letter.', passwordInput);
        if (passwordInput) passwordInput.focus();
        return;
      }

      if (!/[0-9]/.test(password)) {
        showError('Password must contain at least one number.', passwordInput);
        if (passwordInput) passwordInput.focus();
        return;
      }

      if (password !== confirmPassword) {
        showError('Passwords do not match.', confirmInput);
        if (confirmInput) confirmInput.focus();
        return;
      }

      performRegistration({
        full_name: fullName,
        email: email,
        phone: phone,
        department: department,
        password: password,
        confirm_password: confirmPassword,
        account_type: accountType,
        invitation_code: invitationCode,
      });
    });
  }

  window.RegisterModule = { init: init };
})();
