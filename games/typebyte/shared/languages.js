/** @type {Record<string, { ext: string, url: string }>} */
export const LANGUAGE_EXTENSIONS = {
  python: {
      "ext": ".py",
      "url": new URL("../assets/python.svg", import.meta.url).href
  },
  javascript: {
      "ext": ".js",
      "url": new URL("../assets/javascript.svg", import.meta.url).href
  },
  java: {
      "ext": ".java",
      "url": new URL("../assets/java.svg", import.meta.url).href
  },
  cpp: {
      "ext": ".cpp",
      "url": new URL("../assets/cpp.svg", import.meta.url).href
  },
};

/** @type {Array<{ id: string, label: string }>} */
export const LANGUAGE_OPTIONS = [
    { id: "javascript", label: "JavaScript" },
    { id: "cpp",        label: "C++"        },
    { id: "java",       label: "Java"       },
    { id: "python",     label: "Python"     },
];

/**
 * Format a player's name with the selected language file extension.
 * Returns the plain name when no language has been chosen yet.
 *
 * @param {string} playerName 
 * @param {string | null | undefined} language 
 * @returns {string}
 */
export function formatPlayerName(playerName, language) {
    if (!language) {
        return playerName;
    }

    const langData = LANGUAGE_EXTENSIONS[language.toLowerCase()];
    if (!langData) {
      return playerName;
    }

    return `${playerName}${langData.ext}`;
}
