"use client"

import Link from "next/link"
import { DesktopStageLayout } from "./layouts/DesktopStageLayout"
import { HomeEmbeddedApp } from "./components/HomeEmbeddedApp"

function HomeLeftPanel() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="max-w-[600px] text-[8vh] leading-[0.9] font-medium tracking-[-0.03em]">
        Thinking is
        <br />
        the only
        <br />
        todo.
      </div>

      <div>
        <div className="mb-[30px] max-w-[300px] text-[14px] leading-[1.4]">
          A minimal list methodology. Every entry is a journal, every journal is a task. Focus on recording, not
          completing.
        </div>

        <div className="flex flex-row gap-2">
          <Link
            href="/downloads"
            className="inline-flex w-fit items-center gap-2 rounded-[4px] bg-[var(--text-black)] px-5 py-2.5 text-[14px] font-medium text-[var(--text-white)]"
          >
            <span>↓</span>
            <span>Download for Mac</span>
          </Link>
          <Link
            href="/release-notes"
            className="inline-flex w-fit items-center gap-2 rounded-[4px] bg-[var(--text-black)] px-5 py-2.5 text-[14px] font-medium text-[var(--text-white)]"
          >
            <span>→</span>
            <span>View Release Notes</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <DesktopStageLayout
      left={<HomeLeftPanel />}
      right={<HomeEmbeddedApp />}
    />
  )
}
