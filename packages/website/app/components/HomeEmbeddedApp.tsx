"use client"

import dynamic from "next/dynamic"

const EmbeddedApp = dynamic(() => import("@journal-todo/web/AppTSX"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-gradient-to-b from-[#f3f3f3] to-[#ececec]" />
  ),
})

export function HomeEmbeddedApp() {
  return (
    <div className="h-full w-full">
      <EmbeddedApp />
    </div>
  )
}
