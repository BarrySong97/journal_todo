"use client";

import Link from "next/link";
import { useState } from "react";
import { WebsiteScrollArea } from "../components/WebsiteScrollArea";
import { DesktopStageLayout } from "../layouts/DesktopStageLayout";

interface DownloadItem {
  name: string;
  value: string;
}

interface DownloadGroup {
  category: string;
  items: DownloadItem[];
}

const downloadLinks: DownloadGroup[] = [
  {
    category: "macOS",
    items: [
      { name: "Apple Silicon", value: "→" },
      { name: "Intel", value: "→" },
    ],
  },
  {
    category: "Windows",
    items: [{ name: "Windows 10/11 (64-bit)", value: "→" }],
  },
  {
    category: "Linux",
    items: [
      { name: "AppImage (Ubuntu 20.04+)", value: "→" },
      { name: ".deb Package", value: "→" },
      { name: ".rpm Package", value: "→" },
    ],
  },
];

function DownloadsLeftPanel() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="max-w-[600px] text-[8vh] leading-[0.9] font-medium tracking-[-0.03em]">
        The space
        <br />
        between
        <br />
        thoughts.
      </div>

      <div>
        <div className="mb-[30px] max-w-[300px] text-[14px] leading-[1.4]">
          Choose your platform. Every download includes automatic updates and
          cloud sync.
        </div>

        <div className="flex flex-row gap-2">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-[4px] bg-[var(--text-black)] px-5 py-2.5 text-[14px] font-medium text-[var(--text-white)]"
          >
            <span>←</span>
            <span>Back to Home</span>
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
  );
}

function DownloadsRightPanel() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleDownloadClick = (platform: string, item: string) => {
    console.log(`Downloading: ${platform} - ${item}`);
  };

  return (
    <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden bg-[#FCFEFC] text-foreground">
      <div className="bg-[#FCFEFC] px-[30px] pt-[30px] pb-[10px]">
        <div className="mb-10 flex justify-between text-[12px] font-medium opacity-80">
          <span>Journal To Do</span>
          <span>v.1.0.4</span>
        </div>
        <div className="mb-10 text-[36px] leading-[1] font-medium tracking-[-0.03em]">
          Download
        </div>
      </div>

      <WebsiteScrollArea className="flex-1 min-h-0" contentClassName="px-[30px] pb-[100px]">
        {downloadLinks.map((group, groupIndex) => (
          <div key={group.category} className="mb-12 last:mb-0">
            <div className="mb-5 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
              {group.category}
            </div>
            {group.items.map((item, itemIndex) => {
              const itemKey = `${groupIndex}-${itemIndex}`;
              return (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => handleDownloadClick(group.category, item.name)}
                  onMouseEnter={() => setHoveredItem(itemKey)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`flex w-full items-center justify-between border-b border-border px-0 py-4 text-left transition-colors duration-200 ${hoveredItem === itemKey ? "bg-accent/40" : "bg-transparent"}`}
                >
                  <span className="text-[16px] font-normal">{item.name}</span>
                  <span className="text-[14px] text-muted-foreground">{item.value}</span>
                </button>
              );
            })}
          </div>
        ))}
      </WebsiteScrollArea>
    </div>
  );
}

export default function DownloadsPage() {
  return (
    <DesktopStageLayout
      left={<DownloadsLeftPanel />}
      right={<DownloadsRightPanel />}
      rightMode="full"
    />
  );
}
