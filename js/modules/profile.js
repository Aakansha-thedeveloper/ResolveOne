(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';

  var ProfileModule = {
    init: function () {
      cacheEls();
      loadProfile();
      createErrorContainers();
      bindEvents();
      syncTheme();
      initPasswordStrength();
      initPasswordToggles();
      interceptLinks();
    }
  };

  var els = {};
  var editing = false;
  var dirty = false;
  var pendingAvatar = null;
  var pendingTheme = null;
  var confirmLeaveUrl = null;
  var unsavedContext = null;
  var defaultProfile = {
    name: '',
    email: '',
    phone: ''
  };
  function getSessionIdentity() {
    try {
      var raw = localStorage.getItem('rs_session_v2');
      if (raw) {
        var data = JSON.parse(raw);
        var u = data.user || {};
        var name = u.full_name || u.name || u.email || '';
        var email = u.email || data.email || '';
        return { name: name, email: email, phone: '', avatar: u.avatar || '' };
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem('resolveone_session');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }
  var PROFILE_KEY = 'resolveone_profile';
  var THEME_KEY = 'rs-theme';
  var toastTimer = null;
  var MAX_FILE_SIZE = 5 * 1024 * 1024;
  var ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

  /* ─── Crop State ─── */
  var cropState = null;
  var dragData = null;

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  function cacheEls() {
    els.editBtn = qs('[data-edit-btn]');
    els.saveBtn = qs('[data-save-btn]');
    els.nameInput = qs('[data-field-name]');
    els.emailInput = qs('[data-field-email]');
    els.phoneInput = qs('[data-field-phone]');
    els.avatar = qs('[data-profile-avatar]');
    els.photoBtns = qsa('[data-photo-btn]');
    els.removePhotoBtn = qs('[data-remove-photo-btn]');
    els.page = qs('.profile-page');
    els.nameDisplay = qs('[data-profile-name]');
    els.emailDisplay = qs('[data-profile-email]');

    els.themeBtns = qsa('.profile-theme-btn[data-theme-option]');
    els.pwChangeBtn = qs('[data-pw-change-btn]');
    els.pwOverlay = qs('[data-pw-modal-overlay]');
    els.pwClose = qs('[data-pw-modal-close]');
    els.pwCancel = qs('[data-pw-cancel]');
    els.pwSubmit = qs('[data-pw-submit]');
    els.pwCurrent = qs('[data-pw-current]');
    els.pwNew = qs('[data-pw-new]');
    els.pwConfirm = qs('[data-pw-confirm]');
    els.pwMatchError = qs('[data-pw-match-error]');

    /* Crop modal */
    els.cropOverlay = qs('[data-crop-overlay]');
    els.cropViewport = qs('[data-crop-viewport]');
    els.cropWrap = qs('[data-crop-wrap]');
    els.cropImage = qs('[data-crop-image]');
    els.cropCircle = qs('[data-crop-circle]');
    els.cropZoomIn = qs('[data-crop-zoom-in]');
    els.cropZoomOut = qs('[data-crop-zoom-out]');
    els.cropRotate = qs('[data-crop-rotate-btn]');
    els.cropApply = qs('[data-crop-apply]');
    els.cropCancel = qs('[data-crop-cancel]');
    els.cropClose = qs('[data-crop-close]');
    els.cropZoomLabel = qs('[data-crop-zoom-label]');

    /* Unsaved changes modal */
    els.unsavedOverlay = qs('[data-unsaved-overlay]');
    els.unsavedCancel = qs('[data-unsaved-cancel]');
    els.unsavedDiscard = qs('[data-unsaved-discard]');
    els.unsavedSave = qs('[data-unsaved-save]');
  }

  /* ─── Profile Load / Save ─── */
  function getProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function saveProfile(data) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); } catch (e) {}
    fetch(API_BASE + '/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(function () {});
  }

  function loadProfile() {
    var data = getProfile() || getSessionIdentity() || Object.assign({}, defaultProfile);
    applyProfile(data);

    fetch(API_BASE + '/api/user')
      .then(function (r) { return r.json(); })
      .then(function (user) {
        if (user) {
          var newData = {
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            avatar: user.avatar || ''
          };
          saveProfile(newData);
          applyProfile(newData);
        }
      })
      .catch(function () {});
  }

  function applyProfile(data) {
    if (els.nameInput) els.nameInput.value = data.name || '';
    if (els.emailInput) els.emailInput.value = data.email || '';
    if (els.phoneInput) els.phoneInput.value = data.phone || '';
    if (els.nameDisplay) els.nameDisplay.textContent = data.name || '';
    if (els.emailDisplay) els.emailDisplay.textContent = data.email || '';
    applyAvatarToUI(data.avatar || '');
  }

  function collectForm() {
    return {
      name: els.nameInput ? els.nameInput.value.trim() : '',
      email: els.emailInput ? els.emailInput.value.trim() : '',
      phone: els.phoneInput ? els.phoneInput.value.trim() : '',
      avatar: getAvatarData()
    };
  }

  function getAvatarData() {
    if (pendingAvatar !== null) return pendingAvatar;
    if (!els.avatar) return '';
    if (els.avatar.style.backgroundImage) {
      var m = els.avatar.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
      if (m) return m[1];
    }
    return '';
  }

  /* ─── Avatar Display ─── */
  function applyAvatarToUI(url) {
    if (!els.avatar) return;
    if (url) {
      els.avatar.style.backgroundImage = 'url(' + url + ')';
      els.avatar.style.backgroundSize = 'cover';
      els.avatar.style.backgroundPosition = 'center';
      els.avatar.textContent = '';
    } else {
      els.avatar.style.backgroundImage = '';
      var name = els.nameInput ? els.nameInput.value : '';
      els.avatar.textContent = getInitials(name) || 'NK';
    }
    updateRemoveBtn(url);
  }

  function updateRemoveBtn(hasPhoto) {
    if (els.removePhotoBtn) {
      els.removePhotoBtn.style.display = hasPhoto ? '' : 'none';
    }
  }

  function getInitials(name) {
    if (!name) return 'NK';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  /* ─── Photo Upload & Crop ─── */
  function triggerPhotoUpload() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.webp';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      document.body.removeChild(input);
      if (!input.files || !input.files[0]) return;
      var file = input.files[0];

      var ext = '.' + file.name.split('.').pop().toLowerCase();
      if (ALLOWED_TYPES.indexOf(file.type) === -1 && ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
        showToast('Unsupported file format. Please use JPG, PNG, or WEBP.', 'error');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        showToast('File is too large. Maximum size is 5 MB.', 'error');
        return;
      }

      var reader = new FileReader();
      reader.addEventListener('load', function (e) {
        openCropModal(e.target.result);
      });
      reader.readAsDataURL(file);
    });
    input.click();
  }

  function openCropModal(src) {
    var img = new Image();
    img.onload = function () {
      cropState = {
        scale: 1,
        tx: 0,
        ty: 0,
        rotation: 0,
        natW: img.naturalWidth,
        natH: img.naturalHeight,
        originalImage: img
      };
      initCropper(img);
      if (els.cropOverlay) els.cropOverlay.classList.add('open');
    };
    img.src = src;
  }

  function initCropper(img) {
    var viewport = els.cropViewport;
    var wrap = els.cropWrap;
    if (!viewport || !wrap) return;

    wrap.innerHTML = '';
    img.className = 'crop-image';
    img.setAttribute('data-crop-image', '');
    img.draggable = false;
    wrap.appendChild(img);
    els.cropImage = img;

    var vw = viewport.clientWidth;
    var vh = viewport.clientHeight;
    var fitScale = Math.min(vw / cropState.natW, vh / cropState.natH);

    img.style.width = Math.round(cropState.natW * fitScale) + 'px';
    img.style.height = Math.round(cropState.natH * fitScale) + 'px';

    cropState.viewW = vw;
    cropState.viewH = vh;
    cropState.fitScale = fitScale;

    updateCropTransform();
    updateZoomLabel();
  }

  function updateCropTransform() {
    var img = els.cropImage;
    if (!img || !cropState) return;
    img.style.transform = 'translate(calc(-50% + ' + cropState.tx + 'px), calc(-50% + ' + cropState.ty + 'px)) scale(' + cropState.scale + ') rotate(' + cropState.rotation + 'deg)';
  }

  function updateZoomLabel() {
    if (els.cropZoomLabel && cropState) {
      els.cropZoomLabel.textContent = Math.round(cropState.scale * 100) + '%';
    }
  }

  function cropZoomIn() {
    if (!cropState) return;
    cropState.scale = Math.min(cropState.scale + 0.1, 5);
    updateCropTransform();
    updateZoomLabel();
  }

  function cropZoomOut() {
    if (!cropState) return;
    cropState.scale = Math.max(cropState.scale - 0.1, 0.5);
    updateCropTransform();
    updateZoomLabel();
  }

  function cropRotate() {
    if (!cropState) return;
    cropState.rotation = (cropState.rotation + 90) % 360;
    updateCropTransform();
  }

  /* ─── Crop Drag ─── */
  function startDrag(e) {
    if (!cropState) return;
    if (e.type === 'mousedown') {
      if (e.button !== 0) return;
      dragData = { sx: e.clientX, sy: e.clientY, tx: cropState.tx, ty: cropState.ty };
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', endDrag);
    } else if (e.type === 'touchstart') {
      var t = e.touches[0];
      dragData = { sx: t.clientX, sy: t.clientY, tx: cropState.tx, ty: cropState.ty };
      document.addEventListener('touchmove', onDragTouch);
      document.addEventListener('touchend', endDragTouch);
    }
  }

  function onDrag(e) {
    if (!dragData || !cropState) return;
    cropState.tx = dragData.tx + (e.clientX - dragData.sx);
    cropState.ty = dragData.ty + (e.clientY - dragData.sy);
    updateCropTransform();
  }

  function endDrag() {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    dragData = null;
  }

  function onDragTouch(e) {
    e.preventDefault();
    if (!dragData || !cropState || !e.touches[0]) return;
    cropState.tx = dragData.tx + (e.touches[0].clientX - dragData.sx);
    cropState.ty = dragData.ty + (e.touches[0].clientY - dragData.sy);
    updateCropTransform();
  }

  function endDragTouch() {
    document.removeEventListener('touchmove', onDragTouch);
    document.removeEventListener('touchend', endDragTouch);
    dragData = null;
  }

  function onWheel(e) {
    e.preventDefault();
    if (!cropState) return;
    if (e.deltaY < 0) {
      cropState.scale = Math.min(cropState.scale + 0.05, 5);
    } else {
      cropState.scale = Math.max(cropState.scale - 0.05, 0.5);
    }
    updateCropTransform();
    updateZoomLabel();
  }

  /* ─── Crop Apply / Cancel ─── */
  function cropApply() {
    if (!cropState) return;

    var img = els.cropImage;
    var origImg = cropState.originalImage;
    if (!img || !origImg) return;

    var vpRect = els.cropViewport.getBoundingClientRect();
    var circleRect = els.cropCircle.getBoundingClientRect();
    var imgRect = img.getBoundingClientRect();

    var NW = cropState.natW;
    var NH = cropState.natH;
    var rad = cropState.rotation * Math.PI / 180;
    var S = cropState.fitScale * cropState.scale;

    /* Image center in viewport-relative coordinates */
    var imgCX_vp = (imgRect.left + imgRect.width / 2) - vpRect.left;
    var imgCY_vp = (imgRect.top + imgRect.height / 2) - vpRect.top;

    /* Crop circle center and radius in viewport-relative coordinates */
    var circCX_vp = (circleRect.left + circleRect.width / 2) - vpRect.left;
    var circCY_vp = (circleRect.top + circleRect.height / 2) - vpRect.top;
    var circR_vp = circleRect.width / 2;

    /* Offset from image center to crop center (viewport coords) */
    var relX = circCX_vp - imgCX_vp;
    var relY = circCY_vp - imgCY_vp;

    /* Inverse transform: viewport offset → image pixel offset */
    var cosR = Math.cos(rad);
    var sinR = Math.sin(rad);
    var imgCX = NW / 2 + (relX * cosR + relY * sinR) / S;
    var imgCY = NH / 2 + (-relX * sinR + relY * cosR) / S;
    var imgR = circR_vp / S;

    /* Render cropped circle to canvas */
    var outSize = 400;
    var canvas = document.createElement('canvas');
    canvas.width = outSize;
    canvas.height = outSize;
    var ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(origImg, imgCX - imgR, imgCY - imgR, imgR * 2, imgR * 2, 0, 0, outSize, outSize);

    var cropped = canvas.toDataURL('image/png');

    if (editing) {
      pendingAvatar = cropped;
      applyAvatarToUI(pendingAvatar);
      setDirty(true);
    } else {
      var data = getProfile() || getSessionIdentity() || JSON.parse(JSON.stringify(defaultProfile));
      data.avatar = cropped;
      saveProfile(data);
      applyAvatarToUI(cropped);
      if (window.NavbarModule && NavbarModule.syncProfile) {
        NavbarModule.syncProfile(NavbarModule.getSession ? NavbarModule.getSession() : undefined);
      }
      showToastTop('Profile photo updated.', 'success');
    }

    closeCropModal();
  }

  function closeCropModal() {
    if (els.cropOverlay) els.cropOverlay.classList.remove('open');
    if (els.cropWrap) els.cropWrap.innerHTML = '';
    cropState = null;
    dragData = null;
  }

  function removePhoto() {
    if (editing) {
      pendingAvatar = '';
      applyAvatarToUI('');
      setDirty(true);
    } else {
      var data = getProfile() || getSessionIdentity() || JSON.parse(JSON.stringify(defaultProfile));
      data.avatar = '';
      saveProfile(data);
      applyAvatarToUI('');
      if (window.NavbarModule && NavbarModule.syncProfile) {
        NavbarModule.syncProfile(NavbarModule.getSession ? NavbarModule.getSession() : undefined);
      }
      showToastTop('Profile photo removed.', 'success');
    }
  }

  /* ─── Dirty / Unsaved Changes ─── */
  function setDirty(val) {
    dirty = val;
  }

  function interceptLinks() {
    document.addEventListener('click', function (e) {
      if (!dirty) return;
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href || href === '#' || href.indexOf('javascript:') === 0 || href.indexOf('://') !== -1) return;
      if (link.pathname === window.location.pathname) return;
      e.preventDefault();
      confirmLeaveUrl = link.href;
      unsavedContext = 'leave';
      if (els.unsavedOverlay) els.unsavedOverlay.classList.add('open');
    });
  }

  /* ─── Inline Validation Errors ─── */
  function createErrorContainers() {
    qsa('.settings-field').forEach(function (field) {
      if (!field.querySelector('.settings-field-error')) {
        var err = document.createElement('div');
        err.className = 'settings-field-error';
        field.appendChild(err);
      }
    });
  }

  function clearInlineErrors() {
    qsa('.settings-field.has-error').forEach(function (f) { f.classList.remove('has-error'); });
    qsa('.settings-field-error').forEach(function (e) { e.textContent = ''; });
  }

  function showInlineErrors(errors) {
    clearInlineErrors();
    Object.keys(errors).forEach(function (field) {
      var input = qs('[data-field-' + field + ']');
      if (!input) return;
      var wrap = input.closest('.settings-field');
      if (!wrap) return;
      wrap.classList.add('has-error');
      var errEl = wrap.querySelector('.settings-field-error');
      if (errEl) errEl.textContent = errors[field];
    });
  }

  /* ─── Edit Mode ─── */
  function enterEditMode() {
    editing = true;
    pendingAvatar = null;
    pendingTheme = null;
    dirty = false;
    els.page.classList.add('editing');
    els.nameInput.readOnly = false;
    els.emailInput.readOnly = false;
    els.phoneInput.readOnly = false;
    clearInlineErrors();
    els.editBtn.innerHTML = '<i data-lucide="x" size="14"></i> Cancel';
    els.saveBtn.disabled = false;
    els.nameInput.focus();
    lucide.createIcons({ nodes: [els.editBtn.querySelector('i')] });
  }

  function exitEditModeCancel() {
    editing = false;
    dirty = false;
    els.page.classList.remove('editing');
    els.nameInput.readOnly = true;
    els.emailInput.readOnly = true;
    els.phoneInput.readOnly = true;
    pendingAvatar = null;
    pendingTheme = null;
    loadProfile();
    els.editBtn.innerHTML = '<i data-lucide="edit" size="14"></i> Edit Profile';
    els.saveBtn.disabled = true;
    els.saveBtn.classList.remove('loading');
    els.saveBtn.innerHTML = '<i data-lucide="check" size="14"></i> Save';
    applyStoredTheme();
    clearInlineErrors();
    lucide.createIcons({ nodes: [els.editBtn.querySelector('i'), els.saveBtn.querySelector('i')] });
  }

  function exitEditModeSave() {
    editing = false;
    dirty = false;
    els.page.classList.remove('editing');
    els.nameInput.readOnly = true;
    els.emailInput.readOnly = true;
    els.phoneInput.readOnly = true;
    pendingAvatar = null;
    els.editBtn.innerHTML = '<i data-lucide="edit" size="14"></i> Edit Profile';
    els.saveBtn.classList.remove('loading');
    els.saveBtn.innerHTML = '<i data-lucide="check" size="14"></i> Save';
    els.saveBtn.disabled = true;
    clearInlineErrors();
    lucide.createIcons({ nodes: [els.editBtn.querySelector('i'), els.saveBtn.querySelector('i')] });
  }

  function toggleEdit() {
    if (editing) {
      if (dirty) {
        unsavedContext = 'cancel';
        if (els.unsavedOverlay) els.unsavedOverlay.classList.add('open');
      } else {
        exitEditModeCancel();
      }
    } else {
      enterEditMode();
    }
  }

  function validate() {
    var data = collectForm();
    var errors = {};

    if (!data.name) errors.name = 'Full Name is required.';
    else if (data.name.length < 3) errors.name = 'Full Name must be at least 3 characters.';

    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email) errors.email = 'Email is required.';
    else if (!emailRe.test(data.email)) errors.email = 'Please enter a valid email address.';

    if (!data.phone) errors.phone = 'Phone number is required.';
    else {
      var phoneClean = data.phone.replace(/[\s\-\(\)\.]/g, '');
      if (phoneClean.length < 7) errors.phone = 'Please enter a valid phone number.';
      else if (!/^[\d+\s()\-\.]+$/.test(data.phone)) errors.phone = 'Phone can only contain numbers, +, spaces, (), and -.';
    }

    return errors;
  }

  function saveChanges() {
    var errors = validate();
    if (Object.keys(errors).length > 0) {
      showInlineErrors(errors);
      return;
    }

    clearInlineErrors();
    els.saveBtn.disabled = true;
    els.saveBtn.classList.add('loading');
    els.saveBtn.innerHTML = '<i data-lucide="loader-2" size="14"></i> Saving...';
    lucide.createIcons({ nodes: [els.saveBtn.querySelector('i')] });

    setTimeout(function () {
      var data = collectForm();
      saveProfile(data);

      if (pendingTheme !== null) {
        try { localStorage.setItem(THEME_KEY, pendingTheme); } catch (e) {}
        pendingTheme = null;
      }

      exitEditModeSave();

      if (window.NavbarModule && NavbarModule.syncProfile) {
        NavbarModule.syncProfile(NavbarModule.getSession ? NavbarModule.getSession() : undefined);
      }

      showToastTop('Profile updated successfully.', 'success');
    }, 800);
  }

  /* ─── Toast (bottom-center for errors) ─── */
  function showToast(message, type) {
    removeToast();
    var toast = document.createElement('div');
    toast.className = 'profile-toast profile-toast--' + type;
    var icon = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = '<i data-lucide="' + icon + '" size="16"></i> ' + escapeHtml(message);
    document.body.appendChild(toast);
    lucide.createIcons({ nodes: [toast.querySelector('i')] });
    requestAnimationFrame(function () {
      toast.classList.add('show');
    });
    toastTimer = setTimeout(function () {
      removeToast();
    }, 3000);
  }

  /* ─── Toast (top-right for success saves) ─── */
  function showToastTop(message, type) {
    var existing = document.querySelector('.profile-toast-top');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'profile-toast-top';
    var icon = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = '<i data-lucide="' + icon + '" size="16" style="flex-shrink:0"></i> ' + escapeHtml(message);
    document.body.appendChild(toast);
    lucide.createIcons({ nodes: [toast.querySelector('i')] });
    requestAnimationFrame(function () {
      toast.classList.add('show');
    });
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
    }, 3000);
  }

  function removeToast() {
    var existing = document.querySelector('.profile-toast');
    if (existing) {
      existing.classList.remove('show');
      setTimeout(function () { if (existing.parentNode) existing.parentNode.removeChild(existing); }, 300);
    }
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  /* ─── Theme ─── */
  function applyStoredTheme() {
    var stored = 'light';
    try { stored = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
    var resolved = stored === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : stored;
    document.body.classList.toggle('dark-theme', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
    syncTheme();
    syncNavTheme();
  }

  function setTheme(theme) {
    if (editing) {
      pendingTheme = theme;
      setDirty(true);
    } else {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.body.classList.toggle('dark-theme', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
    syncTheme();
    syncNavTheme();
  }

  function syncTheme() {
    var stored = 'light';
    try { stored = pendingTheme || localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
    els.themeBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme-option') === stored);
    });
  }

  function syncNavTheme() {
    if (window.NavbarModule && NavbarModule.syncThemeButtons) {
      NavbarModule.syncThemeButtons();
    }
  }

  /* ─── Password Modal ─── */
  function openPwModal() {
    if (els.pwOverlay) els.pwOverlay.classList.add('open');
    if (els.pwCurrent) setTimeout(function () { els.pwCurrent.focus(); }, 100);
  }

  function closePwModal(updated) {
    if (els.pwOverlay) els.pwOverlay.classList.remove('open');
    resetPwModal();
    if (updated) showToastTop('Password updated successfully.', 'success');
  }

  function resetPwModal() {
    if (els.pwCurrent) els.pwCurrent.value = '';
    if (els.pwNew) els.pwNew.value = '';
    if (els.pwConfirm) els.pwConfirm.value = '';
    if (els.pwMatchError) els.pwMatchError.textContent = '';
    if (els.pwSubmit) els.pwSubmit.disabled = true;
    var bar = qs('[data-pw-bar]');
    if (bar) bar.style.width = '0%';
    var wrap = qs('[data-pw-strength]');
    if (wrap) wrap.classList.remove('visible');
    var rules = qsa('[data-rule]');
    rules.forEach(function (r) { r.classList.remove('met'); });
  }

  function checkPwMatch() {
    var newPw = els.pwNew ? els.pwNew.value : '';
    var confirmPw = els.pwConfirm ? els.pwConfirm.value : '';
    var match = confirmPw.length === 0 || newPw === confirmPw;

    if (els.pwMatchError) {
      els.pwMatchError.textContent = confirmPw.length > 0 && !match ? 'Passwords do not match' : '';
    }

    var strengthWrap = qs('[data-pw-strength]');
    var hasStrengthMet = strengthWrap ? strengthWrap.querySelectorAll('[data-rule].met').length === 4 : false;

    if (els.pwSubmit) {
      els.pwSubmit.disabled = !(match && newPw.length > 0 && confirmPw.length > 0 && hasStrengthMet);
    }
  }

  function submitPasswordChange() {
    els.pwSubmit.classList.add('loading');
    els.pwSubmit.disabled = true;
    els.pwSubmit.innerHTML = '<i data-lucide="loader-2" size="16"></i> Updating...';
    lucide.createIcons({ nodes: [els.pwSubmit.querySelector('i')] });

    setTimeout(function () {
      els.pwSubmit.classList.remove('loading');
      closePwModal(true);
    }, 1000);
  }

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

  function initPasswordStrength() {
    var input = qs('[data-pw-new]');
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
        checkPwMatch();
        return;
      }
      wrap.classList.add('visible');
      var met = evaluate(val);
      updateBar(met);
      checkPwMatch();
    });
  }

  /* ─── Event Bindings ─── */
  function bindEvents() {
    if (els.editBtn) {
      els.editBtn.addEventListener('click', toggleEdit);
    }

    if (els.saveBtn) {
      els.saveBtn.addEventListener('click', saveChanges);
    }

    els.photoBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        triggerPhotoUpload();
      });
    });

    if (els.removePhotoBtn) {
      els.removePhotoBtn.addEventListener('click', function () {
        removePhoto();
      });
    }

    els.themeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var theme = btn.getAttribute('data-theme-option');
        setTheme(theme);
      });
    });

    /* Crop modal */
    if (els.cropZoomIn) els.cropZoomIn.addEventListener('click', cropZoomIn);
    if (els.cropZoomOut) els.cropZoomOut.addEventListener('click', cropZoomOut);
    if (els.cropRotate) els.cropRotate.addEventListener('click', cropRotate);
    if (els.cropApply) els.cropApply.addEventListener('click', cropApply);

    function cancelCrop() {
      closeCropModal();
    }

    if (els.cropCancel) els.cropCancel.addEventListener('click', cancelCrop);
    if (els.cropClose) els.cropClose.addEventListener('click', cancelCrop);

    if (els.cropOverlay) {
      els.cropOverlay.addEventListener('click', function (e) {
        if (e.target === els.cropOverlay) cancelCrop();
      });
    }

    if (els.cropViewport) {
      els.cropViewport.addEventListener('mousedown', startDrag);
      els.cropViewport.addEventListener('touchstart', startDrag, { passive: true });
      els.cropViewport.addEventListener('wheel', onWheel, { passive: false });
    }

    /* Unsaved changes modal */
    if (els.unsavedCancel) {
      els.unsavedCancel.addEventListener('click', function () {
        if (els.unsavedOverlay) els.unsavedOverlay.classList.remove('open');
        confirmLeaveUrl = null;
        unsavedContext = null;
      });
    }

    if (els.unsavedDiscard) {
      els.unsavedDiscard.addEventListener('click', function () {
        if (els.unsavedOverlay) els.unsavedOverlay.classList.remove('open');
        if (unsavedContext === 'cancel') {
          exitEditModeCancel();
        } else if (unsavedContext === 'leave' && confirmLeaveUrl) {
          dirty = false;
          editing = false;
          window.location.href = confirmLeaveUrl;
        }
        confirmLeaveUrl = null;
        unsavedContext = null;
      });
    }

    if (els.unsavedSave) {
      els.unsavedSave.addEventListener('click', function () {
        var errors = validate();
        if (Object.keys(errors).length > 0) {
          showInlineErrors(errors);
          if (els.unsavedOverlay) els.unsavedOverlay.classList.remove('open');
          unsavedContext = null;
          confirmLeaveUrl = null;
          return;
        }
        var data = collectForm();
        saveProfile(data);
        if (pendingTheme !== null) {
          try { localStorage.setItem(THEME_KEY, pendingTheme); } catch (e) {}
          pendingTheme = null;
        }
        pendingAvatar = null;
        dirty = false;
        if (window.NavbarModule && NavbarModule.syncProfile) {
          NavbarModule.syncProfile(NavbarModule.getSession ? NavbarModule.getSession() : undefined);
        }
        if (els.unsavedOverlay) els.unsavedOverlay.classList.remove('open');
        if (unsavedContext === 'cancel') {
          exitEditModeSave();
          showToastTop('Profile updated successfully.', 'success');
        } else if (unsavedContext === 'leave' && confirmLeaveUrl) {
          editing = false;
          window.location.href = confirmLeaveUrl;
        }
        confirmLeaveUrl = null;
        unsavedContext = null;
      });
    }

    if (els.unsavedOverlay) {
      els.unsavedOverlay.addEventListener('click', function (e) {
        if (e.target === els.unsavedOverlay) {
          els.unsavedOverlay.classList.remove('open');
          confirmLeaveUrl = null;
          unsavedContext = null;
        }
      });
    }

    /* Password modal */
    if (els.pwChangeBtn) {
      els.pwChangeBtn.addEventListener('click', openPwModal);
    }

    if (els.pwClose) {
      els.pwClose.addEventListener('click', closePwModal);
    }

    if (els.pwCancel) {
      els.pwCancel.addEventListener('click', closePwModal);
    }

    if (els.pwOverlay) {
      els.pwOverlay.addEventListener('click', function (e) {
        if (e.target === els.pwOverlay) closePwModal();
      });
    }

    if (els.pwSubmit) {
      els.pwSubmit.addEventListener('click', submitPasswordChange);
    }

    if (els.pwConfirm) {
      els.pwConfirm.addEventListener('input', checkPwMatch);
    }

    if (els.pwNew) {
      els.pwNew.addEventListener('input', checkPwMatch);
    }

    /* Input change detection for dirty */
    [els.nameInput, els.emailInput, els.phoneInput].forEach(function (inp) {
      if (inp) {
        inp.addEventListener('input', function () {
          if (editing) setDirty(true);
        });
      }
    });

    /* Keyboard */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (els.cropOverlay && els.cropOverlay.classList.contains('open')) {
          closeCropModal();
          return;
        }
        if (els.unsavedOverlay && els.unsavedOverlay.classList.contains('open')) {
          els.unsavedOverlay.classList.remove('open');
          confirmLeaveUrl = null;
          unsavedContext = null;
          return;
        }
        if (els.pwOverlay && els.pwOverlay.classList.contains('open')) {
          closePwModal();
        }
      }
    });

    /* beforeunload */
    window.addEventListener('beforeunload', function (e) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  window.ProfileModule = ProfileModule;
})();
