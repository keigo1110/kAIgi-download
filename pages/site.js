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
})();
