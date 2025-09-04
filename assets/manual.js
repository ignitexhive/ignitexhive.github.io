
function gaEvent(name, params={}) { if (window.gtag) gtag('event', name, params); }
document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'light') root.classList.add('light');
  toggle.textContent = root.classList.contains('light') ? 'Dark Mode' : 'Light Mode';
  toggle.addEventListener('click', () => {
    root.classList.toggle('light');
    const mode = root.classList.contains('light') ? 'light' : 'dark';
    localStorage.setItem('theme', mode);
    toggle.textContent = mode === 'light' ? 'Dark Mode' : 'Light Mode';
    gaEvent('theme_toggle', { event_label: mode === 'light' ? 'Dark→Light' : 'Light→Dark' });
  });

  // Nav link events
  document.querySelectorAll('a[data-nav]').forEach(a => {
    a.addEventListener('click', () => gaEvent('nav_link_click', { event_label: a.dataset.nav }));
  });

  // Search filter
  const input = document.getElementById('search');
  const cards = Array.from(document.querySelectorAll('.card.step'));
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    cards.forEach(c => {
      const match = !q || c.innerText.toLowerCase().includes(q);
      c.style.display = match ? 'block' : 'none';
      c.style.opacity = match ? 1 : 0.35;
    });
  });
});
