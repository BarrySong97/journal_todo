// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { JournalSettingsPopover } from "@/components/journal/JournalSettingsPopover"

describe("JournalSettingsPopover", () => {
  it("renders settings trigger", () => {
    render(
      <JournalSettingsPopover
        appName="Journal Todo"
        authorName="BarrySong97"
        version="0.1.11"
        sqlitePath="/Users/test/.journal-todo/journal.db"
      />
    )

    expect(screen.getByTitle("Settings")).toBeTruthy()
  })

  it("shows shortcuts and app info when opened", () => {
    const onRevealSqlitePath = vi.fn()

    render(
      <JournalSettingsPopover
        appName="Journal Todo"
        authorName="BarrySong97"
        version="0.1.11"
        sqlitePath="/Users/test/.journal-todo/journal.db"
        onRevealSqlitePath={onRevealSqlitePath}
      />
    )

    fireEvent.click(screen.getByTitle("Settings"))

    expect(screen.getByText("Settings")).toBeTruthy()
    expect(screen.getByText("App")).toBeTruthy()
    expect(screen.getByText("Journal Todo")).toBeTruthy()
    expect(screen.getByText("Author")).toBeTruthy()
    expect(screen.getByText("BarrySong97")).toBeTruthy()
    expect(screen.getByText("Version")).toBeTruthy()
    expect(screen.getByText("v0.1.11")).toBeTruthy()
    expect(screen.getByText("SQLite path")).toBeTruthy()
    expect(screen.getByRole("button", { name: "journal.db" })).toBeTruthy()
    expect(screen.getByText("Command palette")).toBeTruthy()
    expect(screen.getByText("Switch workspace")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "journal.db" }))
    expect(onRevealSqlitePath).toHaveBeenCalledTimes(1)
  })

  it("hides version line when version is null", () => {
    render(
      <JournalSettingsPopover
        appName="Journal Todo"
        authorName="BarrySong97"
        version={null}
        sqlitePath={null}
      />
    )

    fireEvent.click(screen.getByTitle("Settings"))

    expect(screen.queryByText("Version")).toBeNull()
    expect(screen.getByText("SQLite path")).toBeTruthy()
    expect(screen.getByText("Unavailable")).toBeTruthy()
  })
})
