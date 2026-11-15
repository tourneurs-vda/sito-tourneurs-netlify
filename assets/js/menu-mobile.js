/* TOURNEURS - Menu mobile condiviso.
   Intercetta il pulsante senza eliminare gli script
   originali delle gallerie e delle altre pagine. */
(() => {
  const button = document.getElementById('menuToggle');
  const panel = document.getElementById('mobilePanel');

  if (!button || !panel) return;

  function setOpen(open) {
    panel.classList.toggle('show', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute(
      'aria-label',
      open ? 'Chiudi menu' : 'Apri menu'
    );
  }

  button.setAttribute('type', 'button');
  button.setAttribute('aria-controls', 'mobilePanel');
  setOpen(false);

  /* La cattura evita di eseguire anche i vecchi
     gestori del click presenti nei singoli HTML. */
  document.addEventListener('click', event => {
    if (button.contains(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!panel.classList.contains('show'));
      return;
    }

    if (
      panel.classList.contains('show') &&
      !panel.contains(event.target)
    ) {
      setOpen(false);
    }
  }, true);

  panel.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) setOpen(false);
  });

  const path = location.pathname.split('/').pop() || 'index.html';
  let section = path;

  if (path.startsWith('concorso-')) section = 'concorso.html';
  if (path === 'news-articolo.html') section = 'news.html';
  if (path === 'galleria-generale.html') section = 'galleria.html';
  if (path === 'archivio-storico.html') section = 'galleria.html';

  panel.querySelectorAll('a').forEach(link => {
    if (link.getAttribute('href') === section) {
      link.setAttribute('aria-current', 'page');
    }
  });
})();