"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { WebsiteScrollArea } from "../components/WebsiteScrollArea";
import { DesktopStageLayout } from "../layouts/DesktopStageLayout";

interface ReleaseNotesItemProps {
  version: string;
  date: string;
  isLatest: boolean;
  isLast?: boolean;
  children?: ReactNode;
}

function Tag({ type, children }: { type: "new" | "fix"; children: ReactNode }) {
  return (
    <span
      className={
        type === "new"
          ? "mr-1.5 inline-block rounded-[2px] bg-[var(--bg-green)] px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase text-black"
          : "mr-1.5 inline-block rounded-[2px] bg-[#EEE] px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase text-[#666]"
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
  version,
  date,
  isLatest,
  isLast = false,
  children,
}: ReleaseNotesItemProps) {
  const [isExpanded, setIsExpanded] = useState(isLatest);

  const handleToggle = () => {
    if (!isLatest) {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <div
      className={`border-b border-border py-4 ${isLast ? "border-b-0" : ""}`}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between text-left text-[18px] font-medium"
      >
        <span>{version}</span>
        {isLatest ? (
          <span className="text-[12px] font-normal text-muted-foreground">{date}</span>
        ) : (
          <span
            className={`text-[12px] text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        )}
      </button>

      {!isLatest ? (
        <div className="mt-[-4px] mb-3 text-[12px] text-muted-foreground">{date}</div>
      ) : null}

      {isExpanded && children ? (
        <ul className="mt-3 list-none">{children}</ul>
      ) : null}
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
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
            <span>Latest Release</span>
          </div>

          <ReleaseNoteItem version="v.1.0.4" date="Today" isLatest={true}>
            <ChangelogItem>
              <Tag type="new">New</Tag> Focus Mode for deep writing sessions
            </ChangelogItem>
            <ChangelogItem>
              <Tag type="fix">Fix</Tag> Performance improvements for large
              journals
            </ChangelogItem>
            <ChangelogItem>
              <Tag type="fix">Fix</Tag> Resolved sync conflict on macOS Sonoma
            </ChangelogItem>
          </ReleaseNoteItem>
        </div>

        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
            <span>Previous Versions</span>
          </div>

          <ReleaseNoteItem
            version="v.1.0.3"
            date="Oct 12, 2023"
            isLatest={false}
          />
          <ReleaseNoteItem
            version="v.1.0.2"
            date="Sep 28, 2023"
            isLatest={false}
          />
          <ReleaseNoteItem
            version="v.1.0.1"
            date="Sep 15, 2023"
            isLatest={false}
          />
          <ReleaseNoteItem
            version="v.1.0.0"
            date="Aug 30, 2023"
            isLatest={false}
            isLast={true}
          />
        </div>
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
