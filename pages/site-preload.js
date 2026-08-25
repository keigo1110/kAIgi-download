(() => {
  let storedLanguage = null;
  try {
    storedLanguage = window.localStorage.getItem("kaigi-language");
  } catch {
    // The navigator preference below remains available without storage.
  }

  const prefersJapanese = (navigator.language || "")
    .toLowerCase()
    .startsWith("ja");
  const language = storedLanguage === "ja" || storedLanguage === "en"
    ? storedLanguage
    : prefersJapanese
      ? "ja"
      : "en";

  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
})();
