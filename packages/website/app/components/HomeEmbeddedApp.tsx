"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const EmbeddedApp = dynamic(() => import("@journal-todo/web/AppTSX"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-gradient-to-b from-[#f3f3f3] to-[#ececec]" />
  ),
})

export function HomeEmbeddedApp() {
  const [isAppReady, setIsAppReady] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsAppReady(true)
    }, 2500)
    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#f3f3f3] to-[#ececec]">
      <EmbeddedApp onReady={() => setIsAppReady(true)} />
      <div
        className={`absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-b from-[#f3f3f3] to-[#ececec] transition-opacity duration-300 ${isAppReady ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <div className="flex flex-col items-center gap-3 text-[#4a4a4a]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#999] border-t-transparent" />
          <p className="text-[12px] font-medium tracking-[0.04em] uppercase">Loading App</p>
        </div>
      </div>
    </div>
  )
}
