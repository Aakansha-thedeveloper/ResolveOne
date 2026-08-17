(function () {
  'use strict';

  var SettingsModule = {
    init: function () {
      initPasswordToggles();
      initPasswordStrength();
      initCustomSelects();
      initThemePicker();
      initFormSubmit();
      initCancel();
      initEditPhoto();
    }
  };

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  /* ─── Password Show/Hide Toggle ─── */
  function initPasswordToggles() {
    qsa('[data-pw-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.getAttribute('data-pw-toggle'));
        if (!input) return;
        var isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        var icon = btn.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
          lucide.createIcons({ nodes: [icon] });
        }
      });
    });
  }

  /* ─── Password Strength ─── */
  function initPasswordStrength() {
    var input = document.getElementById('set-new-password');
    var wrap = qs('[data-pw-strength]');
    var bar = qs('[data-pw-bar]');
    if (!input || !wrap || !bar) return;

    var rules = [
      { attr: 'length', test: function (v) { return v.length >= 12; } },
      { attr: 'upper',  test: function (v) { return /[A-Z]/.test(v); } },
      { attr: 'number', test: function (v) { return /\d/.test(v); } },
      { attr: 'symbol', test: function (v) { return /[^A-Za-z0-9]/.test(v); } }
    ];

    function evaluate(val) {
      var met = 0;
      rules.forEach(function (rule) {
        var passed = rule.test(val);
        var el = wrap.querySelector('[data-rule="' + rule.attr + '"]');
        if (el) {
          el.classList.toggle('met', passed);
          var icon = el.querySelector('i');
          if (icon) {
            icon.setAttribute('data-lucide', passed ? 'check-circle' : 'check');
            lucide.createIcons({ nodes: [icon] });
          }
        }
        if (passed) met++;
      });
      return met;
    }

    function updateBar(met) {
      var pct = (met / rules.length) * 100;
      bar.style.width = pct + '%';
      var colors = ['var(--color-border)', '#EF4444', '#F97316', '#EAB308', '#22C55E'];
      bar.style.background = colors[met] || colors[0];
    }

    input.addEventListener('input', function () {
      var val = input.value;
      if (val.length === 0) {
        wrap.classList.remove('visible');
        bar.style.width = '0%';
        rules.forEach(function (rule) {
          var el = wrap.querySelector('[data-rule="' + rule.attr + '"]');
          if (el) el.classList.remove('met');
        });
        return;
      }
      wrap.classList.add('visible');
      var met = evaluate(val);
      updateBar(met);
    });
  }

  /* ─── Custom Select ─── */
  function initCustomSelects() {
    qsa('[data-custom-select]').forEach(function (container) {
      var trigger = container.querySelector('.settings-select-trigger');
      var dropdown = container.querySelector('[data-select-options]');
      var valueEl = container.querySelector('[data-select-value]');
      var native = container.querySelector('[data-select-native]');
      if (!trigger || !dropdown || !valueEl || !native) return;

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = dropdown.classList.contains('open');
        closeAllCustomSelects();
        if (!isOpen) {
          dropdown.classList.add('open');
          trigger.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });

      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger.click();
        }
        if (e.key === 'Escape') {
          dropdown.classList.remove('open');
          trigger.classList.remove('open');
        }
      });

      dropdown.querySelectorAll('.settings-select-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          var val = opt.getAttribute('data-value');
          var text = opt.textContent;
          dropdown.querySelectorAll('.settings-select-option').forEach(function (o) {
            o.classList.remove('selected');
          });
          opt.classList.add('selected');
          valueEl.textContent = text;
          if (native) {
            native.value = val;
          }
          dropdown.classList.remove('open');
          trigger.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
          trigger.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });

    document.addEventListener('click', function () {
      closeAllCustomSelects();
    });
  }

  function closeAllCustomSelects() {
    qsa('[data-custom-select]').forEach(function (container) {
      var dropdown = container.querySelector('[data-select-options]');
      var trigger = container.querySelector('.settings-select-trigger');
      if (dropdown) dropdown.classList.remove('open');
      if (trigger) {
        trigger.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ─── Edit Photo ─── */
  function initEditPhoto() {
    var btn = qs('[data-photo-btn]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp';
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) {
          var reader = new FileReader();
          reader.addEventListener('load', function (e) {
            var avatar = qs('.settings-avatar');
            if (avatar) {
              avatar.style.backgroundImage = 'url(' + e.target.result + ')';
              avatar.style.backgroundSize = 'cover';
              avatar.style.backgroundPosition = 'center';
              avatar.textContent = '';
            }
          });
          reader.readAsDataURL(input.files[0]);
        }
      });
      input.click();
    });
  }

  /* ─── Form Submit ─── */
  function initFormSubmit() {
    var form = qs('[data-settings-form]');
    var submit = qs('[data-settings-submit]');
    var toast = qs('[data-settings-toast]');
    if (!form || !submit || !toast) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      submit.classList.add('loading');
      submit.disabled = true;
      submit.innerHTML = '<i data-lucide="loader-2" size="16"></i> Saving...';
      lucide.createIcons({ nodes: [submit.querySelector('i')] });

      var statusEl = qs('[data-save-status]');
      if (statusEl) {
        statusEl.innerHTML = '<span style="color:var(--color-text);opacity:0.5;">Saving changes...</span>';
      }

      setTimeout(function () {
        submit.classList.remove('loading');
        submit.classList.add('success');
        submit.disabled = false;
        submit.innerHTML = '<i data-lucide="check" size="16"></i> Saved';
        lucide.createIcons({ nodes: [submit.querySelector('i')] });

        if (statusEl) {
          statusEl.innerHTML = '<span style="color:#22C55E;font-weight:600;">\u2713 All changes saved</span>';
        }

        toast.classList.add('show');
        setTimeout(function () {
          toast.classList.remove('show');
        }, 3000);

        setTimeout(function () {
          submit.classList.remove('success');
          submit.innerHTML = '<i data-lucide="check" size="16"></i> Save Changes';
          lucide.createIcons({ nodes: [submit.querySelector('i')] });
          if (statusEl) {
            statusEl.innerHTML = '<span class="settings-save-dot"></span><span>Unsaved changes</span>';
          }
        }, 2500);
      }, 1200);
    });
  }

  /* ─── Cancel Button ─── */
  function initCancel() {
    var cancel = qs('[data-settings-cancel]');
    if (!cancel) return;
    cancel.addEventListener('click', function () {
      var form = qs('[data-settings-form]');
      if (form) form.reset();
      var bar = qs('[data-pw-bar]');
      if (bar) bar.style.width = '0%';
      var wrap = qs('[data-pw-strength]');
      if (wrap) wrap.classList.remove('visible');
    });
  }

  window.SettingsModule = SettingsModule;
})();
