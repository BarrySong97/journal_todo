"use client";

import Link from "next/link";
import type { KeyboardEvent, ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import releaseNotesDataJson from "../data/release-notes.json";
import { WebsiteScrollArea } from "../components/WebsiteScrollArea";
import { DesktopStageLayout } from "../layouts/DesktopStageLayout";

type ReleaseItemType = "new" | "fix" | "other";

interface ReleaseItem {
  type: ReleaseItemType;
  text: string;
}

interface ReleaseEntry {
  version: string;
  date: string;
  items: ReleaseItem[];
}

interface ReleaseNotesData {
  generatedAt: string;
  releases: ReleaseEntry[];
}

interface ReleaseNotesItemProps {
  release: ReleaseEntry;
  isLatest: boolean;
  isLast?: boolean;
}

const releaseNotesData = releaseNotesDataJson as ReleaseNotesData;

function formatReleaseDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function Tag({ type, children }: { type: ReleaseItemType; children: ReactNode }) {
  return (
    <span
      className={
        type === "new"
          ? "mr-1.5 inline-block rounded-[2px] bg-[var(--bg-green)] px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase text-black"
          : type === "fix"
            ? "mr-1.5 inline-block rounded-[2px] bg-[#EEE] px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase text-[#666]"
            : "mr-1.5 inline-block rounded-[2px] bg-[#DDE7F3] px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase text-[#30455E]"
      }
    >
      {children}
    </span>
  );
}

function ChangelogItem({ children }: { children: ReactNode }) {
  return (
    <li className="relative mb-2 pl-3.5 text-[14px] leading-[1.5] text-foreground last:mb-0">
      <span className="absolute top-[8px] left-0 h-1 w-1 rounded-full bg-foreground" />
      {children}
    </li>
  );
}

function ReleaseNoteItem({
  release,
  isLatest,
  isLast = false,
}: ReleaseNotesItemProps) {
  const [isExpanded, setIsExpanded] = useState(isLatest);
  const formattedDate = formatReleaseDate(release.date);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer border-b border-border py-4 ${isLast ? "border-b-0" : ""}`}
    >
      <div className="flex w-full items-center justify-between text-left text-[18px] font-medium">
        <span>{release.version}</span>
        <span
          className={`text-[12px] text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </div>

      <div className="mt-[-4px] mb-3 text-[12px] text-muted-foreground">{formattedDate}</div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          {release.items.length > 0 ? (
            <ul className="mt-3 list-none">
              {release.items.map((item, index) => (
                <ChangelogItem key={`${release.version}-${index}`}>
                  <Tag type={item.type}>
                    {item.type === "new" ? "New" : item.type === "fix" ? "Fix" : "Other"}
                  </Tag>
                  {item.text}
                </ChangelogItem>
              ))}
            </ul>
          ) : (
            <div className="mt-3 text-[14px] text-muted-foreground">No notes.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReleaseNotesLeftPanel() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="max-w-[600px] text-[8vh] leading-[0.9] font-medium tracking-[-0.03em]">
        Notes of
        <br />
        what changed
        <br />
        today.
      </div>

      <div>
        <div className="mb-[30px] max-w-[300px] text-[14px] leading-[1.4]">
          Product updates, quality improvements, and small details that shape
          your daily writing flow.
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
            href="/downloads"
            className="inline-flex w-fit items-center gap-2 rounded-[4px] bg-[var(--text-black)] px-5 py-2.5 text-[14px] font-medium text-[var(--text-white)]"
          >
            <span>←</span>
            <span>Back to Downloads</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReleaseNotesRightPanel() {
  const [latestRelease, ...previousReleases] = releaseNotesData.releases;

  useLayoutEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden bg-[#FCFEFC] text-foreground">
      <div className="bg-[#FCFEFC] px-[30px] pt-[30px] pb-[10px]">
        <div className="mb-10 flex justify-between text-[12px] font-medium opacity-80">
          <span>Journal To Do</span>
          <span>History</span>
        </div>
        <div className="mb-10 text-[36px] leading-[1] font-medium tracking-[-0.03em]">
          Updates
        </div>
      </div>

      <WebsiteScrollArea className="flex-1 min-h-0" contentClassName="px-[30px] pb-[100px]">
        {latestRelease ? (
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
              <span>Latest Release</span>
            </div>
            <ReleaseNoteItem release={latestRelease} isLatest={true} />
          </div>
        ) : (
          <div className="mb-10 text-[14px] text-muted-foreground">No release notes available.</div>
        )}

        {previousReleases.length > 0 ? (
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
              <span>Previous Versions</span>
            </div>
            {previousReleases.map((release, index) => (
              <ReleaseNoteItem
                key={release.version}
                release={release}
                isLatest={false}
                isLast={index === previousReleases.length - 1}
              />
            ))}
          </div>
        ) : null}
      </WebsiteScrollArea>

    </div>
  );
}

export default function ReleaseNotesPage() {
  return (
    <DesktopStageLayout
      left={<ReleaseNotesLeftPanel />}
      right={<ReleaseNotesRightPanel />}
      rightMode="full"
    />
  );
}
