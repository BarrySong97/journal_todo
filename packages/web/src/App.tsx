import { useEffect, useState } from "react"
import { isTauri } from "@journal-todo/shared"
import { invoke } from "@tauri-apps/api/core"
import { Titlebar } from "@/components/Titlebar"
import { JournalApp } from "@/components/journal/JournalApp"
import { Agentation } from "agentation";
import { DateNavigation } from "./components/journal/DateNavigation"


export function App() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [isManageOpen, setIsManageOpen] = useState(false)

  useEffect(() => {
    setIsDesktop(isTauri())
  }, [])

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

  const handleManageWorkspace = () => {
    setIsManageOpen(true)
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col ">
      <header className="flex justify-between items-center h-9  " data-tauri-drag-region>

        <DateNavigation />
        {isDesktop && <Titlebar onManageWorkspace={handleManageWorkspace} />}
      </header>

      <JournalApp
        isManageOpen={isManageOpen}
        onManageOpenChange={setIsManageOpen}
      />
      {/* {import.meta.env.DEV && <Agentation />} */}

    </div>
  )
}

export default App
