(() => {
  const root = document.documentElement;
  const video = document.querySelector('#intro-film');
  const cover = document.querySelector('.film-start');
  const chapters = Array.from(document.querySelectorAll('[data-film-time]'));
  const localFileExample = document.querySelector('.film-companion');
  const captionOutput = document.querySelector('.caption-output');
  const captionToggle = document.querySelector('.caption-toggle');
  let captionsEnabled = true;
  let requestedTime = null;

  function renderCaption() {
    const track = Array.from(video.textTracks).find(item => item.language === root.lang);
    const lineJoin = root.lang === 'ja' ? '' : ' ';
    captionOutput.textContent = captionsEnabled
      ? Array.from(track?.activeCues || [], cue => cue.text.split('\n').join(lineJoin)).join('\n')
      : '';
  }

  function updateLabels() {
    const english = root.lang === 'en';
    const fullscreen = document.fullscreenElement === video ||
      video.webkitDisplayingFullscreen || video.webkitPresentationMode === 'fullscreen';
    for (const track of video.textTracks) {
      track.mode = captionsEnabled && track.language === root.lang
        ? (fullscreen ? 'showing' : 'hidden')
        : 'disabled';
    }
    captionToggle.setAttribute('aria-pressed', String(captionsEnabled));
    video.setAttribute('aria-label', english ? video.dataset.labelEn : video.dataset.labelJa);
    renderCaption();
  }

  function highlightChapter() {
    const active = chapters.filter(button => Number(button.dataset.filmTime) <= video.currentTime).pop();
    localFileExample.hidden = active?.dataset.filmExample !== 'local-files';
    for (const button of chapters) {
      if (button === active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
  }

  function applySeek() {
    if (requestedTime === null || !video.readyState) return;
    video.currentTime = requestedTime;
    requestedTime = null;
  }

  function revealPlayer() {
    cover.hidden = true;
    video.inert = false;
    video.parentElement.classList.add('is-playing-film');
  }

  function startFilm(seconds, focusPlayer = false) {
    revealPlayer();
    if (focusPlayer) video.focus({ preventScroll: true });
    requestedTime = seconds;
    applySeek();
    video.play().catch(error => {
      if (error.name !== 'AbortError') video.focus({ preventScroll: true });
    });
  }

  root.classList.add('film-ready');
  video.inert = true;
  video.tabIndex = 0;
  cover.addEventListener('click', () => startFilm(0, true));
  for (const button of chapters) {
    button.addEventListener('click', () => startFilm(Number(button.dataset.filmTime)));
  }
  video.addEventListener('loadedmetadata', () => { applySeek(); updateLabels(); });
  video.addEventListener('timeupdate', highlightChapter);
  video.addEventListener('seeked', renderCaption);
  video.addEventListener('play', () => {
    revealPlayer();
    highlightChapter();
  });
  for (const track of video.textTracks) track.addEventListener('cuechange', renderCaption);
  captionToggle.addEventListener('click', () => { captionsEnabled = !captionsEnabled; updateLabels(); });
  for (const event of ['webkitbeginfullscreen', 'webkitendfullscreen', 'webkitpresentationmodechanged']) {
    video.addEventListener(event, updateLabels);
  }
  document.addEventListener('fullscreenchange', updateLabels);
  const observer = new MutationObserver(updateLabels);
  const observeLanguage = () => observer.observe(root, { attributes: true, attributeFilter: ['lang'] });
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stageObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('stage-in-view');
      stageObserver.unobserve(entry.target);
    }
  }, { threshold: 0.16 }) : null;

  function observeStages() {
    stageObserver?.disconnect();
    if (!stageObserver || motion.matches) return;
    for (const stage of document.querySelectorAll('[data-stage]:not(.stage-in-view)')) {
      stage.classList.add('stage-prepared');
      stageObserver.observe(stage);
    }
  }

  motion.addEventListener('change', observeStages);
  observeStages();
  observeLanguage();
  updateLabels();
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    stageObserver?.disconnect();
    video.pause();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    observeLanguage();
    observeStages();
    updateLabels();
  });

  const dialog = document.querySelector('#screen-dialog');
  if (typeof dialog?.showModal !== 'function') return;
  const enlargedImage = dialog.querySelector('img');
  const dialogTitle = dialog.querySelector('#dialog-title');
  let opener;
  for (const link of document.querySelectorAll('[data-image-open]')) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const original = link.querySelector('img');
      enlargedImage.width = Number(original.getAttribute('width'));
      enlargedImage.height = Number(original.getAttribute('height'));
      enlargedImage.alt = original.alt;
      enlargedImage.src = link.href;
      dialogTitle.textContent = original.alt;
      opener = link;
      dialog.showModal();
    });
  }
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      dialog.close();
    }
  });
})();
