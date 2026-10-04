(() => {
  const root = document.documentElement;
  const panels = [...document.querySelectorAll('.gallery-panel')];
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panelIDs = new Set(panels.map(panel => panel.id));
  let pendingPanelScroll = null;
  function scrollToPanel(id) {
    if (pendingPanelScroll !== null) cancelAnimationFrame(pendingPanelScroll);
    pendingPanelScroll = requestAnimationFrame(() => {
      pendingPanelScroll = null;
      document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
  function selectPanel(id, focus = false) {
    if (!panelIDs.has(id)) return;
    panels.forEach(panel => {
      const selected = panel.id === id;
      panel.classList.toggle('is-active', selected);
      panel.setAttribute('aria-hidden', String(!selected));
    });
    tabs.forEach(tab => {
      const selected = tab.getAttribute('aria-controls') === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
  }
  if (tabs.length && panels.length) {
    selectPanel(panelIDs.has(location.hash.slice(1)) ? location.hash.slice(1) : 'research');
    root.classList.add('gallery-ready');
    if (panelIDs.has(location.hash.slice(1))) scrollToPanel(location.hash.slice(1));
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectPanel(tab.getAttribute('aria-controls')));
      tab.addEventListener('keydown', event => {
        let target;
        if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') target = 0;
        if (event.key === 'End') target = tabs.length - 1;
        if (target === undefined) return;
        event.preventDefault();
        selectPanel(tabs[target].getAttribute('aria-controls'), true);
      });
    });
    window.addEventListener('hashchange', () => {
      const id = location.hash.slice(1);
      if (!panelIDs.has(id)) return;
      selectPanel(id);
      scrollToPanel(id);
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let revealObserver;
  function configureMotion() {
    revealObserver?.disconnect();
    root.classList.toggle('motion-ready', !reducedMotion.matches);
    if (!('IntersectionObserver' in window) || reducedMotion.matches) return;
    // The page owns one observer over three fixed sections; no scroll loop.
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    document.querySelectorAll('[data-reveal]').forEach(section => revealObserver.observe(section));
  }
  configureMotion();
  reducedMotion.addEventListener('change', configureMotion);

  const video = document.querySelector('video');
  const filmStart = document.querySelector('.film-start');
  const captionOutput = document.querySelector('.caption-output');
  const captionToggle = document.querySelector('.caption-toggle');
  let captionsEnabled = true;
  function nativeFullscreen() {
    return document.fullscreenElement === video || video?.webkitDisplayingFullscreen || video?.webkitPresentationMode === 'fullscreen';
  }
  function renderCaption() {
    if (!video || !captionOutput) return;
    const language = root.dataset.language === 'en' ? 'en' : 'ja';
    const track = [...video.textTracks].find(track => track.language === language);
    const cues = captionsEnabled ? [...(track?.activeCues || [])] : [];
    captionOutput.classList.toggle('is-gap', cues.length === 0);
    captionOutput.textContent = cues.length
      ? cues.map(cue => cue.text).join('\n')
      : '';
  }
  function syncCaptions() {
    if (!video) return;
    const language = root.dataset.language === 'en' ? 'en' : 'ja';
    // Inline cues are read from a hidden native track and rendered below the
    // player. Fullscreen uses the movie's reserved lower caption band.
    [...video.textTracks].forEach(track => {
      track.mode = captionsEnabled && track.language === language
        ? (nativeFullscreen() ? 'showing' : 'hidden')
        : 'disabled';
    });
    filmStart?.setAttribute('aria-label', language === 'en' ? 'Play' : '再生する');
    if (captionToggle) {
      captionToggle.setAttribute('aria-pressed', String(captionsEnabled));
      captionToggle.textContent = language === 'en'
        ? (captionsEnabled ? 'Hide captions' : 'Show captions')
        : (captionsEnabled ? '字幕を隠す' : '字幕を表示');
    }
    renderCaption();
  }
  const languageObserver = new MutationObserver(syncCaptions);
  if (video && captionOutput && captionToggle) {
    root.classList.add('film-ready');
    [...video.textTracks].forEach(track => track.addEventListener('cuechange', renderCaption));
    captionToggle.addEventListener('click', () => {
      captionsEnabled = !captionsEnabled;
      syncCaptions();
    });
    filmStart?.addEventListener('click', () => {
      video.muted = false;
      video.play().catch(() => {
        filmStart.hidden = true;
        video.focus();
      });
    });
    video.addEventListener('play', () => { if (filmStart) filmStart.hidden = true; });
    video.addEventListener('loadedmetadata', syncCaptions);
    video.addEventListener('seeked', renderCaption);
    video.addEventListener('webkitbeginfullscreen', syncCaptions);
    video.addEventListener('webkitendfullscreen', syncCaptions);
    video.addEventListener('webkitpresentationmodechanged', syncCaptions);
    document.addEventListener('fullscreenchange', syncCaptions);
    languageObserver.observe(root, { attributes: true, attributeFilter: ['data-language'] });
    syncCaptions();
  }
  window.addEventListener('pagehide', () => {
    if (pendingPanelScroll !== null) cancelAnimationFrame(pendingPanelScroll);
    pendingPanelScroll = null;
    revealObserver?.disconnect();
    languageObserver.disconnect();
    video?.pause();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    configureMotion();
    if (video) languageObserver.observe(root, { attributes: true, attributeFilter: ['data-language'] });
    syncCaptions();
  });

  const dialog = document.querySelector('#screen-dialog');
  const enlargedImage = dialog?.querySelector('img');
  if (!dialog || typeof dialog.showModal !== 'function' || !enlargedImage) return;
  let opener;
  document.querySelectorAll('[data-image-open]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      enlargedImage.src = link.href;
      enlargedImage.alt = link.querySelector('img')?.alt || link.dataset.imageAlt || '';
      opener = link;
      dialog.showModal();
    });
  });
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
})();
