/* Gallerie del concorso Tourneurs, 2014-2025 */
(() => {
  'use strict';

  const dialog = document.getElementById('lightbox');
  const image = document.getElementById('lightboxImage');
  const counter = document.getElementById('lightboxCounter');

  const links = Array.from(document.querySelectorAll(
    '.contest-photo a, .classification-card a'
  ));

  // Pulsanti di scorrimento dell'album 2025
  const album = document.getElementById('album2025');
  const albumPrev = document.getElementById('albumPrev');
  const albumNext = document.getElementById('albumNext');

  if (album && albumPrev && albumNext) {
    const scrollAlbum = direction => album.scrollBy({
      left: direction * album.clientWidth * 0.8,
      behavior: window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches ? 'auto' : 'smooth'
    });

    albumPrev.addEventListener('click', () => scrollAlbum(-1));
    albumNext.addEventListener('click', () => scrollAlbum(1));
  }

  if (!dialog || !image || !counter || !links.length) return;

  const closeButton = dialog.querySelector('.lightbox-close');
  const prevButton = dialog.querySelector('.lightbox-prev');
  const nextButton = dialog.querySelector('.lightbox-next');

  let current = 0;
  let touchStartX = null;

  function show(index) {
    current = (index + links.length) % links.length;

    const link = links[current];
    const thumbnail = link.querySelector('img');

    image.src = link.href;
    image.alt = thumbnail?.alt ||
      link.getAttribute('aria-label') || '';

    counter.textContent =
      `${current + 1} / ${links.length}`;
  }

  links.forEach((link, index) => {
    link.addEventListener('click', event => {
      event.preventDefault();
      show(index);

      if (!dialog.open) dialog.showModal();
    });
  });

  closeButton?.addEventListener('click', () => dialog.close());
  prevButton?.addEventListener('click', () => show(current - 1));
  nextButton?.addEventListener('click', () => show(current + 1));

  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(current - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + 1);
    }
  });

  image.addEventListener('touchstart', event => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  image.addEventListener('touchend', event => {
    if (touchStartX === null) return;

    const distance =
      event.changedTouches[0].clientX - touchStartX;

    touchStartX = null;

    if (Math.abs(distance) > 45) {
      show(current + (distance < 0 ? 1 : -1));
    }
  }, { passive: true });
})();