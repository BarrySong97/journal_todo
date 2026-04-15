import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/dev.sh");

describe("scripts/dev.sh", () => {
  it("uses CONDUCTOR_PORT when available", () => {
    const output = execFileSync("bash", [scriptPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        CONDUCTOR_PORT: "4700",
        TURBO_DEV_DRY_RUN: "1",
      },
    });

    expect(output).toContain("Starting workspace dev (conductor)");
    expect(output).toContain("desktop:  tauri dev");
    expect(output).toContain("web:      http://localhost:4700");
    expect(output).toContain("hmr:      ws://localhost:4701");
  });

  it("falls back to explicit offset mode", () => {
    const output = execFileSync("bash", [scriptPath, "10"], {
      encoding: "utf8",
      env: {
        ...process.env,
        CONDUCTOR_PORT: "",
        TURBO_DEV_DRY_RUN: "1",
      },
    });

    expect(output).toContain("Starting workspace dev (explicit-offset)");
    expect(output).toContain("web:      http://localhost:1430");
    expect(output).toContain("hmr:      ws://localhost:1431");
  });
});
