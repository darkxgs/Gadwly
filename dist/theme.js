(function () {
  const key = 'jadwaly-public:theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['light', 'dark', 'system'].includes(value) ? value : 'system';
  let preference = 'system';
  try { preference = valid(localStorage.getItem(key)); } catch {}
  function apply() {
    const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#101713' : '#f7f8f4');
    document.dispatchEvent(new CustomEvent('jadwaly-theme-change'));
  }
  window.JadwalyTheme = Object.freeze({
    getPreference: () => preference,
    setPreference(value) {
      preference = valid(value);
      try { localStorage.setItem(key, preference); } catch {}
      apply();
    }
  });
  media.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { preference = valid(event.key === null ? null : event.newValue); apply(); }
  });
  apply();
})();
