"use client";

import { ScrollArea } from "@journal-todo/ui";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

interface WebsiteScrollAreaProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function WebsiteScrollArea({
  children,
  className,
  contentClassName,
}: WebsiteScrollAreaProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (!viewport) return;

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 420);
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const rootClassName = [
    "website-scroll-area",
    isScrolling ? "website-scroll-area--active" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className={rootClassName}>
      <ScrollArea className="h-full">
        <div className={contentClassName}>{children}</div>
      </ScrollArea>
    </div>
  );
}
