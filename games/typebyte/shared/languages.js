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

