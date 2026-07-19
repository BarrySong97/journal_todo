"use client"

import Link from "next/link"
import { HomeEmbeddedApp } from "./components/HomeEmbeddedApp"
import { stageThemeVars } from "./layouts/DesktopStageLayout"

export default function Home() {
  return (
    <div
      style={stageThemeVars}
      className="m-0 h-dvh w-screen overflow-hidden bg-[#E0E0E0] p-0 font-['Helvetica_Neue','Helvetica','Arial',sans-serif] antialiased md:h-screen"
    >
      <div className="grid h-full w-full grid-cols-1 overflow-y-auto md:absolute md:inset-0 md:grid-cols-2 md:overflow-hidden">
        <section className="contents text-[var(--text-black)] md:flex md:min-h-0 md:flex-col md:overflow-hidden md:bg-[var(--bg-white)] md:p-[60px]">
          <Link
            href="/"
            className="order-1 w-full bg-[var(--bg-white)] px-6 pt-6 text-[14px] leading-[1.4] font-medium md:order-none md:w-fit md:bg-transparent md:px-0 md:pt-0"
          >
            Journal todo <span className="text-[#666]">v.1.0.4</span>
          </Link>

          <div className="contents md:mt-10 md:flex md:flex-1 md:flex-col md:justify-between">
            <h1 className="order-2 m-0 bg-[var(--bg-white)] px-6 pt-16 pb-10 text-[clamp(48px,16vw,72px)] leading-[0.9] font-medium tracking-[-0.03em] md:order-none md:max-w-[600px] md:bg-transparent md:p-0 md:text-[8vh]">
              Thinking is
              <br />
              the only
              <br />
              todo.
            </h1>

            <div className="order-4 bg-[var(--bg-white)] px-6 py-10 md:order-none md:bg-transparent md:p-0">
              <div className="mb-[30px] max-w-[300px] text-[14px] leading-[1.4]">
                A minimal list methodology. Every entry is a journal, every journal is a task. Focus on recording, not
                completing.
              </div>

              <Link
                href="/downloads"
                className="inline-flex w-fit items-center rounded-[4px] bg-[var(--text-black)] px-5 py-2.5 text-[14px] font-medium text-[var(--text-white)]"
              >
                Download on your computer
              </Link>
            </div>
          </div>
        </section>

        <section className="order-3 flex items-center justify-center bg-[#DEDEDE] px-6 py-10 md:order-none md:min-h-0 md:p-0">
          <div className="relative z-10 flex aspect-[320/620] w-full max-w-[320px] flex-col overflow-hidden rounded-[4px] bg-[var(--bg-white)] shadow-[0_40px_80px_rgba(0,0,0,0.15)] md:h-[620px] md:w-[320px] min-[1512px]:h-[710px] min-[1512px]:w-[360px]">
            <HomeEmbeddedApp />
          </div>
        </section>
      </div>
    </div>
  )
}
