(() => {
  'use strict';
  const key = 'swe-theme';
  const root = document.documentElement;
  const getStoredTheme = () => {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  };
  const preferredTheme = () => getStoredTheme() || 'light';
  const applyTheme = (theme) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    root.dataset.sweTheme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#09111f' : '#071b12');
    const button = document.getElementById('sweThemeToggle');
    if (button) {
      const dark = next === 'dark';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Passer au mode clair' : 'Passer au mode sombre');
      button.title = dark ? 'Mode clair' : 'Mode sombre';
      button.querySelector('[data-theme-icon]').textContent = dark ? '☀️' : '🌙';
      button.querySelector('[data-theme-label]').textContent = dark ? 'Clair' : 'Sombre';
    }
  };
  const install = () => {
    if (document.getElementById('sweThemeToggle')) return;
    const button = document.createElement('button');
    button.id = 'sweThemeToggle';
    button.type = 'button';
    button.className = 'swe-theme-toggle';
    button.innerHTML = '<span data-theme-icon aria-hidden="true"></span><span data-theme-label></span>';
    button.addEventListener('click', () => {
      const next = root.dataset.sweTheme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, next); } catch (_) {}
      applyTheme(next);
    });
    document.body.append(button);
    applyTheme(preferredTheme());
  };
  applyTheme(preferredTheme());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
