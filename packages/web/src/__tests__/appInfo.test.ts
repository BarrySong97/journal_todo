import { describe, expect, it, vi } from "vitest"
import { getFileNameFromPath, resolveAppVersion, resolveSqlitePath } from "@/lib/appInfo"

describe("resolveAppVersion", () => {
  it("returns fallback version when app is not running in Tauri", async () => {
    const getVersion = vi.fn().mockResolvedValue("2.0.0")
    const version = await resolveAppVersion(getVersion, () => false, "0.1.11")

    expect(version).toBe("0.1.11")
    expect(getVersion).not.toHaveBeenCalled()
  })

  it("returns Tauri version when available", async () => {
    const getVersion = vi.fn().mockResolvedValue("2.0.0")
    const version = await resolveAppVersion(getVersion, () => true, "0.1.11")

    expect(version).toBe("2.0.0")
  })

  it("falls back when Tauri getVersion throws", async () => {
    const getVersion = vi.fn().mockRejectedValue(new Error("boom"))
    const version = await resolveAppVersion(getVersion, () => true, "0.1.11")

    expect(version).toBe("0.1.11")
  })

  it("returns null when fallback is unavailable", async () => {
    const getVersion = vi.fn().mockRejectedValue(new Error("boom"))
    const version = await resolveAppVersion(getVersion, () => true, null)

    expect(version).toBeNull()
  })
})

describe("resolveSqlitePath", () => {
  it("returns null outside Tauri", async () => {
    const getDatabasePath = vi.fn().mockResolvedValue("/tmp/app.db")
    const path = await resolveSqlitePath(getDatabasePath, () => false)

    expect(path).toBeNull()
    expect(getDatabasePath).not.toHaveBeenCalled()
  })

  it("returns sqlite path in Tauri", async () => {
    const getDatabasePath = vi.fn().mockResolvedValue("/Users/test/.journal-todo/journal.db")
    const path = await resolveSqlitePath(getDatabasePath, () => true)

    expect(path).toBe("/Users/test/.journal-todo/journal.db")
  })

  it("returns null when get path fails", async () => {
    const getDatabasePath = vi.fn().mockRejectedValue(new Error("boom"))
    const path = await resolveSqlitePath(getDatabasePath, () => true)

    expect(path).toBeNull()
  })
})

describe("getFileNameFromPath", () => {
  it("extracts filename from unix path", () => {
    expect(getFileNameFromPath("/Users/test/.journal-todo/journal.db")).toBe("journal.db")
  })

  it("extracts filename from windows path", () => {
    expect(getFileNameFromPath("C:\\Users\\test\\journal.db")).toBe("journal.db")
  })

  it("returns null for empty path", () => {
    expect(getFileNameFromPath("")).toBeNull()
    expect(getFileNameFromPath(null)).toBeNull()
  })
})
