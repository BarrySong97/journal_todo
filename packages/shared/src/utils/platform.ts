/**
 * Check if the app is running in Tauri environment (Tauri 2.x)
 */
export const isTauri = (): boolean => {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
};

/**
 * Check if the app is running in browser environment
 */
export const isBrowser = (): boolean => {
  if (typeof window === "undefined") return false;
  return !("__TAURI_INTERNALS__" in window);
};

/**
 * Get current platform
 */
export const getPlatform = (): "tauri" | "browser" | "server" => {
  if (typeof window === "undefined") {
    return "server";
  }
  return isTauri() ? "tauri" : "browser";
};
