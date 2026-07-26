// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { JournalSettingsPopover } from "@/components/journal/JournalSettingsPopover"

afterEach(() => {
  cleanup()
})

const defaultProps = {
  appName: "Journal Todo",
  authorName: "BarrySong97",
  version: "0.1.11",
  sqlitePath: "/Users/test/.journal-todo/journal.db",
  rolloverIsMove: false,
  onRolloverModeChange: vi.fn(),
  sortIncompleteFirst: true,
  onSortModeChange: vi.fn(),
}

describe("JournalSettingsPopover", () => {
  it("renders settings trigger", () => {
    render(<JournalSettingsPopover {...defaultProps} />)
    expect(screen.getByTitle("Settings")).toBeTruthy()
  })

  it("shows shortcuts and app info when opened", () => {
    const onRevealSqlitePath = vi.fn()
    const onImportSqlitePath = vi.fn()

    render(
      <JournalSettingsPopover
        {...defaultProps}
        onRevealSqlitePath={onRevealSqlitePath}
        onImportSqlitePath={onImportSqlitePath}
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
    expect(screen.getByText("Cut selected")).toBeTruthy()
    expect(screen.getByText("Delete selected")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "journal.db" }))
    expect(screen.getByText("Open current path")).toBeTruthy()
    expect(screen.getByText("Import database")).toBeTruthy()

    fireEvent.click(screen.getByText("Open current path"))
    expect(onRevealSqlitePath).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "journal.db" }))
    fireEvent.click(screen.getByText("Import database"))
    expect(onImportSqlitePath).toHaveBeenCalledTimes(1)
  })

  it("hides version line when version is null", () => {
    render(
      <JournalSettingsPopover
        {...defaultProps}
        version={null}
        sqlitePath={null}
      />
    )

    fireEvent.click(screen.getByTitle("Settings"))

    expect(screen.queryByText("Version")).toBeNull()
    expect(screen.getByText("SQLite path")).toBeTruthy()
    expect(screen.getByText("Unavailable")).toBeTruthy()
  })

  it("checks for updates only after the user clicks the version action", () => {
    const onCheckForUpdates = vi.fn()
    render(
      <JournalSettingsPopover
        {...defaultProps}
        canCheckForUpdates
        onCheckForUpdates={onCheckForUpdates}
      />
    )

    fireEvent.click(screen.getByTitle("Settings"))
    expect(onCheckForUpdates).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }))
    expect(onCheckForUpdates).toHaveBeenCalledTimes(1)
  })

  it("shows an available version inline and starts the update on click", () => {
    const onInstallUpdate = vi.fn()
    render(
      <JournalSettingsPopover
        {...defaultProps}
        canCheckForUpdates
        updateStatus="available"
        availableVersion="0.1.12"
        onInstallUpdate={onInstallUpdate}
      />
    )

    fireEvent.click(screen.getByTitle("Settings"))
    expect(screen.getByText("v0.1.12 available")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Update" }))
    expect(onInstallUpdate).toHaveBeenCalledTimes(1)
  })

  it("renders manual update progress without a toast action", () => {
    render(
      <JournalSettingsPopover
        {...defaultProps}
        canCheckForUpdates
        updateStatus="downloading"
        updateProgress={42}
      />
    )

    fireEvent.click(screen.getByTitle("Settings"))
    expect(screen.getByText("Downloading 42%")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Check for updates" })).toBeNull()
  })

  it("shows Roll over row with Copy label when rolloverIsMove is false", () => {
    render(<JournalSettingsPopover {...defaultProps} rolloverIsMove={false} />)
    fireEvent.click(screen.getByTitle("Settings"))
    expect(screen.getByText("Roll over")).toBeTruthy()
    expect(screen.getByText("Copy")).toBeTruthy()
  })

  it("shows Move label when rolloverIsMove is true", () => {
    render(<JournalSettingsPopover {...defaultProps} rolloverIsMove={true} />)
    fireEvent.click(screen.getByTitle("Settings"))
    expect(screen.getByText("Roll over")).toBeTruthy()
    expect(screen.getByText("Move")).toBeTruthy()
  })

  it("calls onRolloverModeChange(true) when switch is toggled on", () => {
    const onRolloverModeChange = vi.fn()
    render(
      <JournalSettingsPopover
        {...defaultProps}
        rolloverIsMove={false}
        onRolloverModeChange={onRolloverModeChange}
      />
    )
    fireEvent.click(screen.getByTitle("Settings"))
    const switchInput = screen.getAllByRole("checkbox")[0]
    // Click the wrapping label to trigger the checkbox change
    fireEvent.click(switchInput.closest("label")!)
    expect(onRolloverModeChange).toHaveBeenCalledWith(true)
  })

  it("calls onRolloverModeChange(false) when switch is toggled off", () => {
    const onRolloverModeChange = vi.fn()
    render(
      <JournalSettingsPopover
        {...defaultProps}
        rolloverIsMove={true}
        onRolloverModeChange={onRolloverModeChange}
      />
    )
    fireEvent.click(screen.getByTitle("Settings"))
    const switchInput = screen.getAllByRole("checkbox")[0]
    // Click the wrapping label to trigger the checkbox change
    fireEvent.click(switchInput.closest("label")!)
    expect(onRolloverModeChange).toHaveBeenCalledWith(false)
  })

  it("shows Sort row with Incomplete on top label when sortIncompleteFirst is true", () => {
    render(<JournalSettingsPopover {...defaultProps} sortIncompleteFirst={true} />)
    fireEvent.click(screen.getByTitle("Settings"))
    expect(screen.getByText("Sort")).toBeTruthy()
    expect(screen.getByText("Incomplete on top")).toBeTruthy()
  })

  it("shows Incomplete on bottom label when sortIncompleteFirst is false", () => {
    render(<JournalSettingsPopover {...defaultProps} sortIncompleteFirst={false} />)
    fireEvent.click(screen.getByTitle("Settings"))
    expect(screen.getByText("Incomplete on bottom")).toBeTruthy()
  })

  it("calls onSortModeChange(false) when sort switch is toggled off", () => {
    const onSortModeChange = vi.fn()
    render(
      <JournalSettingsPopover
        {...defaultProps}
        sortIncompleteFirst={true}
        onSortModeChange={onSortModeChange}
      />
    )
    fireEvent.click(screen.getByTitle("Settings"))
    const switchInput = screen.getAllByRole("checkbox")[1]
    fireEvent.click(switchInput.closest("label")!)
    expect(onSortModeChange).toHaveBeenCalledWith(false)
  })
})
