"use client"

import Link from "next/link"
import type { CSSProperties, ReactNode } from "react"

interface DesktopStageLayoutProps {
  left: ReactNode
  right: ReactNode
  rightMode?: "framed" | "full"
}

const themeVars: CSSProperties = {
  "--bg-pink": "#FFC4D6",
  "--bg-red": "#E60023",
  "--bg-green": "#6CE5A8",
  "--bg-blue": "#3B75F2",
  "--bg-white": "#F2F2F2",
  "--text-black": "#050505",
  "--text-white": "#FFFFFF",
  "--font-main": "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
  "--ease-out": "cubic-bezier(0.23, 1, 0.32, 1)",
} as CSSProperties

export function DesktopStageLayout({ left, right, rightMode = "framed" }: DesktopStageLayoutProps) {
  return (
    <div
      style={themeVars}
      className="m-0 flex h-screen w-screen items-center justify-center overflow-hidden bg-[#E0E0E0] p-0 font-['Helvetica_Neue','Helvetica','Arial',sans-serif] antialiased"
    >
      <div className="absolute inset-0 grid h-full w-full grid-cols-2">
        <div className="flex min-h-0 flex-col overflow-hidden bg-[var(--bg-white)] p-[60px] text-[var(--text-black)]">
          <Link href="/" className="w-fit text-[14px] leading-[1.4] font-medium">
            Journal todo <span className="text-[#666]">v.1.0.4</span>
          </Link>
          <div className="mt-10 flex-1">{left}</div>
        </div>

        <div
          className={
            rightMode === "full"
              ? "flex min-h-0 overflow-hidden bg-[#DEDEDE]"
              : "flex items-center justify-center bg-[#DEDEDE]"
          }
        >
          {rightMode === "full" ? (
            <div className="flex h-full w-full min-h-0 overflow-hidden">{right}</div>
          ) : (
            <div className="relative z-10 flex h-[560px] w-[285px] flex-col overflow-hidden rounded-[4px] bg-[var(--bg-white)] shadow-[0_40px_80px_rgba(0,0,0,0.15)] md:h-[620px] md:w-[320px] min-[1512px]:h-[710px] min-[1512px]:w-[360px]">
              {right}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
