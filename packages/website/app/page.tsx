"use client"

import Link from "next/link"
import { DesktopStageLayout } from "./layouts/DesktopStageLayout"

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

        <div className="flex flex-col gap-3">
          <Link
            href="/downloads"
            className="inline-flex w-fit items-center gap-[10px] rounded-[4px] bg-[var(--text-black)] px-8 py-4 text-[16px] font-medium text-[var(--text-white)]"
          >
            <span>↓</span>
            <span>Download for Mac</span>
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
      right={
        <iframe
          title="Journal Todo App"
          src="https://todo.4real.ltd/"
          className="h-full w-full border-0 bg-white"
          loading="lazy"
        />
      }
    />
  )
}
