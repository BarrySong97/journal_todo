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
  const [hoveredButton, setHoveredButton] = useState(false);

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

        <Link
          href="/release-notes"
          onMouseEnter={() => setHoveredButton(true)}
          onMouseLeave={() => setHoveredButton(false)}
          className={`inline-block w-fit rounded-[4px] bg-[var(--text-black)] px-8 py-4 text-[16px] font-medium text-[var(--text-white)] transition-opacity duration-200 ${hoveredButton ? "opacity-90" : "opacity-100"}`}
        >
          View Release Notes
        </Link>
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
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--bg-white)]">
      <div className="bg-[var(--bg-white)] px-[30px] pt-[30px] pb-[10px]">
        <div className="mb-10 flex justify-between text-[12px] font-medium opacity-80">
          <span>Journal To Do</span>
          <span>v.1.0.4</span>
        </div>
        <div className="mb-10 text-[36px] leading-[1] font-medium tracking-[-0.03em]">
          Download
        </div>
      </div>

      <WebsiteScrollArea className="flex-1" contentClassName="px-[30px] pb-[100px]">
        {downloadLinks.map((group, groupIndex) => (
          <div key={group.category} className="mb-12 last:mb-0">
            <div className="mb-5 text-[11px] font-semibold tracking-[0.05em] text-[#888] uppercase">
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
                  className={`flex w-full items-center justify-between border-b border-[rgba(0,0,0,0.05)] px-0 py-4 text-left transition-colors duration-200 ${hoveredItem === itemKey ? "bg-[rgba(0,0,0,0.02)]" : "bg-transparent"}`}
                >
                  <span className="text-[16px] font-normal">{item.name}</span>
                  <span className="text-[14px] text-[#888]">{item.value}</span>
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
    />
  );
}
