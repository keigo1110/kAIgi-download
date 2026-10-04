(() => {
  const supportedLanguages = new Set(["ja", "en"]);
  const buttons = document.querySelectorAll("[data-language-option]");

  function readStoredLanguage() {
    try {
      return window.localStorage.getItem("kaigi-language");
    } catch {
      return null;
    }
  }

  function storeLanguage(language) {
    try {
      window.localStorage.setItem("kaigi-language", language);
    } catch {
      // Language switching remains usable when storage is unavailable.
    }
  }

  function setLanguage(requestedLanguage, persist) {
    const language = supportedLanguages.has(requestedLanguage)
      ? requestedLanguage
      : "ja";

    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    document.body.dataset.language = language;

    const localizedTitle = language === "ja"
      ? document.body.dataset.titleJa
      : document.body.dataset.titleEn;
    if (localizedTitle) {
      document.title = localizedTitle;
    }

    buttons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.languageOption === language)
      );
    });

    if (persist) {
      storeLanguage(language);
    }
  }

  const preloadedLanguage = document.documentElement.dataset.language;
  const storedLanguage = readStoredLanguage();
  const prefersJapanese = (navigator.language || "")
    .toLowerCase()
    .startsWith("ja");
  const initialLanguage = supportedLanguages.has(preloadedLanguage)
    ? preloadedLanguage
    : supportedLanguages.has(storedLanguage)
    ? storedLanguage
    : prefersJapanese
      ? "ja"
      : "en";

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.languageOption, true);
    });
  });

  setLanguage(initialLanguage, false);

  // A direct reference link opens its containing disclosure before scrolling.
  let pendingScroll = null;
  function openLinkedReference() {
    if (pendingScroll !== null) cancelAnimationFrame(pendingScroll);
    pendingScroll = null;
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    const disclosure = target?.closest('details');
    if (!disclosure) return;
    disclosure.open = true;
    pendingScroll = requestAnimationFrame(() => {
      pendingScroll = null;
      target.scrollIntoView({ block: 'start' });
    });
  }
  window.addEventListener('hashchange', openLinkedReference);
  window.addEventListener('pagehide', () => {
    if (pendingScroll !== null) cancelAnimationFrame(pendingScroll);
    pendingScroll = null;
  });
  openLinkedReference();

  // Only the two invocation examples have copy actions. No command executes.
  document.querySelectorAll('#invoke pre').forEach((example) => {
    const button = document.createElement('button');
    button.className = 'copy-example';
    button.type = 'button';
    button.innerHTML = '<span data-copy="ja">コピー</span><span data-copy="en">Copy</span>';
    const region = document.createElement('div');
    region.className = 'copy-region';
    example.before(region);
    region.append(example, button);
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await navigator.clipboard.writeText(example.querySelector('code').textContent);
        button.innerHTML = '<span data-copy="ja">コピー済み</span><span data-copy="en">Copied</span>';
      } catch {
        button.innerHTML = '<span data-copy="ja">コピーできませんでした</span><span data-copy="en">Could not copy</span>';
      } finally {
        button.disabled = false;
      }
    });
  });
})();
