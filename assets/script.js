
function gaEvent(name, params={}) {
  if (window.gtag) gtag('event', name, params);
}
function isExternalLink(anchor) {
  try { const url = new URL(anchor.href); return url.host !== window.location.host; } catch(e){ return false; }
}
document.addEventListener('DOMContentLoaded', () => {
  const url = new URL(window.location.href);
  if (url.searchParams.get('admin') === '1') localStorage.setItem('adminMode','1');
  if (url.searchParams.get('admin') === '0') localStorage.removeItem('adminMode');
  const adminMode = localStorage.getItem('adminMode') === '1';
  const banner = document.getElementById('adminBanner');
  if (adminMode && banner) {
    banner.classList.add('show');
    const btn = banner.querySelector('[data-ping]');
    const status = banner.querySelector('[data-status]');
    if (btn && status) {
      btn.addEventListener('click', () => {
        gaEvent('admin_ga_ping', { event_label: 'Manual Ping' });
        status.textContent = 'Ping sent ✓';
        setTimeout(() => status.textContent = 'Ready', 1500);
      });
    }
  }
  const root = document.documentElement;
  const themeBtn = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'light') root.classList.add('light');
  if (themeBtn) {
    themeBtn.textContent = root.classList.contains('light') ? 'Dark Mode' : 'Light Mode';
    themeBtn.addEventListener('click', () => {
      root.classList.toggle('light');
      const mode = root.classList.contains('light') ? 'light' : 'dark';
      localStorage.setItem('theme', mode);
      themeBtn.textContent = mode === 'light' ? 'Dark Mode' : 'Light Mode';
      gaEvent('theme_toggle', { event_label: mode === 'light' ? 'Dark→Light' : 'Light→Dark' });
    });
  }
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
  const input = document.getElementById('search');
  const cards = Array.from(document.querySelectorAll('.step'));
  if (input) {
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      cards.forEach(card => {
        const txt = card.innerText.toLowerCase();
        const match = !q || txt.includes(q);
        card.style.display = match ? 'block' : 'none';
        card.style.opacity = match ? 1 : 0.35;
      });
    });
  }
});
