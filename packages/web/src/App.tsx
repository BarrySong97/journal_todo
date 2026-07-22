import { useEffect, useRef, useState } from "react"
import { isTauri } from "@journal-todo/shared"
import { invoke } from "@tauri-apps/api/core"
import { Titlebar } from "@/components/Titlebar"
import { JournalApp } from "@/components/journal/JournalApp"
import { Toaster, TooltipProvider } from "@journal-todo/ui"
import { DateNavigation } from "./components/journal/DateNavigation"
import { ImportantActions } from "./components/journal/ImportantActions"
import { useJournal } from "@/hooks/useJournal"


export function App() {
  const { goToToday } = useJournal()
  const [isDesktop, setIsDesktop] = useState(false)
  const [desktopPlatform, setDesktopPlatform] = useState<"windows" | "macos" | "linux" | "unknown">("unknown")
  const [isWide, setIsWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 725)
  const [narrowView, setNarrowView] = useState<"workspace" | "important">("workspace")
  const [splitRatio, setSplitRatio] = useState(() => {
    const stored = typeof window !== "undefined" ? Number(localStorage.getItem("journal-important-split-ratio")) : 50
    return Number.isFinite(stored) ? stored : 50
  })
  const wasWideRef = useRef(isWide)

  useEffect(() => {
    setIsDesktop(isTauri())
  }, [])

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth
      const nextWide = width >= 725
      if (wasWideRef.current && !nextWide) setNarrowView("workspace")
      wasWideRef.current = nextWide
      setIsWide(nextWide)
      if (nextWide) {
        const min = (362 / width) * 100
        setSplitRatio((current) => Math.max(min, Math.min(100 - min, current)))
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const updateSplitRatio = (ratio: number) => {
    setSplitRatio(ratio)
    localStorage.setItem("journal-important-split-ratio", String(ratio))
  }

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
    <TooltipProvider>
      <div className="h-screen overflow-hidden flex flex-col ">
      <header
        className={isMac ? "flex items-center h-9" : "flex items-center h-9"}
        data-tauri-drag-region
      >
        {isWide ? (
          <>
            <div
              className="flex h-full items-center"
              style={{ width: `${splitRatio}%` }}
              data-tauri-drag-region
            >
              {isMac && <div className="w-[72px] h-full shrink-0" data-tauri-drag-region />}
              <DateNavigation className={isMac ? "ml-auto mr-2" : undefined} />
            </div>
            <div className="h-full w-px bg-border" data-tauri-drag-region />
            <div
              className="relative flex flex-1 items-center justify-center text-xs font-medium text-muted-foreground"
              data-tauri-drag-region
            >
              Important
              <ImportantActions />
            </div>
            {isWindows && <Titlebar />}
          </>
        ) : isMac ? (
          <>
            <div className="w-[72px] h-full shrink-0" />
            {narrowView === "workspace" ? (
              <DateNavigation className="ml-auto mr-2" />
            ) : (
              <div className="relative flex h-full flex-1 items-center justify-center text-xs font-medium text-muted-foreground">
                Important
                <ImportantActions />
              </div>
            )}
          </>
        ) : (
          <>
            {narrowView === "workspace" ? (
              <DateNavigation />
            ) : (
              <div className="relative flex h-full flex-1 items-center justify-center text-xs font-medium text-muted-foreground">
                Important
                <ImportantActions />
              </div>
            )}
            {isWindows && <Titlebar />}
          </>
        )}
      </header>

      <JournalApp
        isWide={isWide}
        narrowView={narrowView}
        onNarrowViewChange={setNarrowView}
        splitRatio={splitRatio}
        onSplitRatioChange={updateSplitRatio}
      />
      <Toaster />

      </div>
    </TooltipProvider>
  )
}

export default App
