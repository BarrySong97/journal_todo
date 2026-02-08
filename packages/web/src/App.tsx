import { useEffect, useState } from "react"
import { isTauri } from "@journal-todo/shared"
import { invoke } from "@tauri-apps/api/core"
import { Titlebar } from "@/components/Titlebar"
import { JournalApp } from "@/components/journal/JournalApp"
import { Toaster } from "@journal-todo/ui"
import { DateNavigation } from "./components/journal/DateNavigation"
import { useJournal } from "@/hooks/useJournal"


export function App() {
  const { goToToday } = useJournal()
  const [isDesktop, setIsDesktop] = useState(false)
  const [desktopPlatform, setDesktopPlatform] = useState<"windows" | "macos" | "linux" | "unknown">("unknown")

  useEffect(() => {
    setIsDesktop(isTauri())
  }, [])

  useEffect(() => {
    if (!isTauri()) return
    if (typeof navigator === "undefined") {
      setDesktopPlatform("unknown")
      return
    }

    const platformSource = `${navigator.userAgentData?.platform ?? navigator.platform ?? ""} ${navigator.userAgent ?? ""}`.toLowerCase()

    if (platformSource.includes("win")) {
      setDesktopPlatform("windows")
      return
    }
    if (platformSource.includes("mac")) {
      setDesktopPlatform("macos")
      return
    }
    if (platformSource.includes("linux")) {
      setDesktopPlatform("linux")
      return
    }

    setDesktopPlatform("unknown")
  }, [])

  useEffect(() => {
    goToToday()
  }, [goToToday])

  // F12 to open devtools in Tauri
  useEffect(() => {
    if (!isTauri()) return

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault()
        await invoke("open_devtools")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const isMac = isDesktop && desktopPlatform === "macos"
  const isWindows = isDesktop && (desktopPlatform === "windows" || desktopPlatform === "linux" || desktopPlatform === "unknown")

  return (
    <div className="h-screen overflow-hidden flex flex-col ">
      <header
        className={isMac ? "flex items-center h-9" : "flex justify-between items-center h-9"}
        data-tauri-drag-region
      >
        {isMac ? (
          <>
            <div className="w-[72px] h-full shrink-0" />
            <DateNavigation className="ml-auto mr-2" />
          </>
        ) : (
          <>
            <DateNavigation />
            {isWindows && <Titlebar />}
          </>
        )}
      </header>

      <JournalApp />
      <Toaster />

    </div>
  )
}

export default App
