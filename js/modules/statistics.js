window.StatisticsModule = (() => {
  let observer = null;

  function init() {
    const counters = document.querySelectorAll('[data-stat-value]');
    if (!counters.length) return;

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-stat-value'), 10);
          animateCounter(el, target);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach((el) => observer.observe(el));
  }

  function animateCounter(el, target) {
    const duration = 1200;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const tick = () => {
      step++;
      current = Math.min(Math.round(increment * step), target);
      el.textContent = formatNumber(current);
      if (current < target) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  function formatNumber(num) {
    if (num >= 1000) {
      const suffixes = ['', 'K', 'M'];
      const tier = Math.floor(Math.log10(num) / 3);
      if (tier === 0) return num.toString();
      const suffix = suffixes[tier];
      const scaled = num / Math.pow(10, tier * 3);
      return scaled.toFixed(1).replace('.0', '') + suffix;
    }
    return num.toString();
  }

  function destroy() {
    if (observer) observer.disconnect();
  }

  return { init, destroy };
})();
