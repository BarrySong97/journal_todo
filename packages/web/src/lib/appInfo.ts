export const APP_NAME = "Journal Todo"
export const APP_AUTHOR = "BarrySong97"
export const APP_FALLBACK_VERSION = typeof __APP_VERSION__ === "string" && __APP_VERSION__.trim().length > 0
  ? __APP_VERSION__
  : null

export type GetVersionFn = () => Promise<string>
export type IsTauriFn = () => boolean
export type GetDatabasePathFn = () => Promise<string>

export const resolveAppVersion = async (
  getVersionFn: GetVersionFn,
  isTauriFn: IsTauriFn,
  fallbackVersion: string | null = APP_FALLBACK_VERSION
) => {
  if (!isTauriFn()) {
    return fallbackVersion
  }

  try {
    const tauriVersion = await getVersionFn()
    if (tauriVersion.trim().length > 0) {
      return tauriVersion
    }
  } catch {
    // Ignore and fall back to injected web package version.
  }

  return fallbackVersion
}

export const resolveSqlitePath = async (
  getDatabasePathFn: GetDatabasePathFn,
  isTauriFn: IsTauriFn
) => {
  if (!isTauriFn()) return null

  try {
    const dbPath = await getDatabasePathFn()
    return dbPath.trim().length > 0 ? dbPath : null
  } catch {
    return null
  }
}

export const getFileNameFromPath = (path: string | null) => {
  if (!path) return null
  const normalized = path.trim()
  if (normalized.length === 0) return null

  const parts = normalized.split(/[\\/]/).filter(Boolean)
  if (parts.length === 0) return normalized
  return parts[parts.length - 1]
}
