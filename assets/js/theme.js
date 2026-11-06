(function () {
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try { preference = localStorage.getItem('tema'); } catch (_) {}
  if (!['light', 'dark'].includes(preference)) preference = null;
  function apply(theme) {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d1628' : '#2459e0');
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const dark = theme === 'dark';
      const label = dark ? 'Activar modo claro' : 'Activar modo oscuro';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', label);
      button.title = label;
      button.querySelector('use')?.setAttribute('href', dark ? '#i-sun' : '#i-moon');
    });
  }
  const refresh = () => apply(preference || (system.matches ? 'dark' : 'light'));
  refresh();
  document.addEventListener('DOMContentLoaded', refresh, { once: true });
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-theme-toggle]')) return;
    preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('tema', preference); } catch (_) {}
    apply(preference);
  });
  system.addEventListener('change', () => { if (!preference) refresh(); });
  window.addEventListener('storage', event => {
    if (event.key !== 'tema') return;
    preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    refresh();
  });
})();
