
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


  const cta = document.getElementById('startHere');
  const step1 = document.getElementById('s1');
  if (cta && step1) {
    cta.addEventListener('click', (e) => {
      e.preventDefault();
      step1.scrollIntoView({ behavior: 'smooth', block: 'start' });
      gaEvent('cta_start_here_click', { event_label: 'Hero Start Here' });
    });
  }
  document.querySelectorAll('a[data-nav]').forEach(a => {
    a.addEventListener('click', () => gaEvent('nav_link_click', { event_label: a.dataset.nav }));
  });
  document.querySelectorAll('a[data-manual]').forEach(a => {
    a.addEventListener('click', () => gaEvent('manual_page_click', { event_label: 'Open Manual' }));
  });
  document.querySelectorAll('a[href]').forEach(a => {
    if (isExternalLink(a)) {
      a.addEventListener('click', () => gaEvent('outbound_link_click', { event_label: a.href }));
    }
  });
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copied ✓';
        gaEvent('copy_to_clipboard', { event_label: btn.dataset.label || 'Copy' });
        setTimeout(() => (btn.textContent = btn.dataset.reset || 'Copy'), 1400);
      } catch(e) {
        btn.textContent = 'Copy failed';
        setTimeout(() => (btn.textContent = btn.dataset.reset || 'Copy'), 1400);
      }
    });
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
