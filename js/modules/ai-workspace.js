window.WorkspacePreview = (() => {
  function init() {
    const preview = document.querySelector('[data-workspace-preview]');
    if (!preview) return;

    const cta = preview.querySelector('[data-workspace-preview-cta]');
    if (cta) {
      cta.addEventListener('click', (e) => {
        e.preventDefault();
        const url = cta.getAttribute('data-href') || '/ai-assistant.html';
        window.location.href = url;
      });
    }
  }

  return { init };
})();
