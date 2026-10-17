(function () {
  const SESSION_KEY = "offer-helper-miniapp-session-v1";
  const ANALYSIS_KEY = "offer-helper-miniapp-analysis-v1";
  const AI_CONFIG_KEY = "offer-helper-miniapp-ai-config-v1";

  function readJson(key, fallbackValue) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallbackValue;
      }
      return JSON.parse(raw);
    } catch (error) {
      return fallbackValue;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  window.OfferHelperStorage = {
    SESSION_KEY,
    ANALYSIS_KEY,
    AI_CONFIG_KEY,
    readJson,
    writeJson,
    remove,
    loadSessionRaw() {
      return readJson(SESSION_KEY, null);
    },
    saveSessionRaw(session) {
      writeJson(SESSION_KEY, session);
    },
    loadAnalysis() {
      return readJson(ANALYSIS_KEY, null);
    },
    saveAnalysis(analysis) {
      writeJson(ANALYSIS_KEY, analysis);
    },
    loadAiConfig() {
      return readJson(AI_CONFIG_KEY, null);
    },
    saveAiConfig(config) {
      writeJson(AI_CONFIG_KEY, config);
    },
    clearAiConfig() {
      remove(AI_CONFIG_KEY);
    },
    clearAnalysis() {
      remove(ANALYSIS_KEY);
    },
    clearAll() {
      remove(SESSION_KEY);
      remove(ANALYSIS_KEY);
      remove(AI_CONFIG_KEY);
    }
  };
})();
