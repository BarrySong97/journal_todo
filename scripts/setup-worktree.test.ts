import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];
const scriptPath = path.resolve("scripts/setup-worktree.sh");

function createTempDir() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "setup-worktree-"));
  tempDirs.push(directory);
  return directory;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const directory = tempDirs.pop();
    if (directory) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe("scripts/setup-worktree.sh", () => {
  it("skips when CONDUCTOR_ROOT_PATH is not set", () => {
    const workspaceRoot = createTempDir();

    const output = execFileSync("bash", [scriptPath], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: {},
    });

    expect(output).toContain("CONDUCTOR_ROOT_PATH is not set");
  });

  it("links current project shared files", () => {
    const sourceRoot = createTempDir();
    const workspaceRoot = createTempDir();

    fs.mkdirSync(path.join(sourceRoot, "packages/web"), { recursive: true });
    fs.mkdirSync(path.join(sourceRoot, "packages/website"), { recursive: true });
    fs.writeFileSync(
      path.join(sourceRoot, "packages/web/.env.local"),
      "VITE_API_URL=http://localhost:4000\n",
    );
    fs.writeFileSync(
      path.join(sourceRoot, "packages/website/.env.local"),
      "NEXT_PUBLIC_SITE_URL=http://localhost:3000\n",
    );
    fs.writeFileSync(path.join(sourceRoot, "journal_todo.key"), "secret\n");

    const output = execFileSync("bash", [scriptPath], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        CONDUCTOR_ROOT_PATH: sourceRoot,
      },
    });

    expect(output).toContain("Linked packages/web/.env.local");
    expect(output).toContain("Linked packages/website/.env.local");
    expect(output).toContain("Linked journal_todo.key");
    expect(output).toContain("Linked packages/desktop/.env");

    expect(
      fs.lstatSync(path.join(workspaceRoot, "packages/web/.env.local")).isSymbolicLink(),
    ).toBe(true);
    expect(
      fs
        .lstatSync(path.join(workspaceRoot, "packages/website/.env.local"))
        .isSymbolicLink(),
    ).toBe(true);
    expect(
      fs.lstatSync(path.join(workspaceRoot, "packages/desktop/.env")).isSymbolicLink(),
    ).toBe(true);
    expect(
      fs.realpathSync(path.join(workspaceRoot, "packages/desktop/.env")),
    ).toBe(fs.realpathSync(path.join(sourceRoot, "packages/web/.env.local")));
  });

  it("keeps existing files and preserves already-correct symlinks", () => {
    const sourceRoot = createTempDir();
    const workspaceRoot = createTempDir();

    fs.mkdirSync(path.join(sourceRoot, "packages/website"), { recursive: true });
    fs.mkdirSync(path.join(sourceRoot, "packages/web"), { recursive: true });
    fs.mkdirSync(path.join(workspaceRoot, "packages/website"), { recursive: true });
    fs.mkdirSync(path.join(workspaceRoot, "packages/web"), { recursive: true });
    fs.writeFileSync(
      path.join(sourceRoot, "packages/website/.env.local"),
      "NEXT_PUBLIC_SITE_URL=http://root\n",
    );
    fs.writeFileSync(
      path.join(sourceRoot, "packages/web/.env.local"),
      "VITE_API_URL=http://root\n",
    );
    fs.writeFileSync(
      path.join(workspaceRoot, "packages/website/.env.local"),
      "LOCAL_ONLY=1\n",
    );
    fs.symlinkSync(
      path.join(sourceRoot, "packages/web/.env.local"),
      path.join(workspaceRoot, "packages/web/.env.local"),
    );

    const output = execFileSync("bash", [scriptPath], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        CONDUCTOR_ROOT_PATH: sourceRoot,
      },
    });

    expect(output).toContain("Keeping existing packages/website/.env.local");
    expect(output).toContain("Already linked packages/web/.env.local");
    expect(
      fs.readFileSync(path.join(workspaceRoot, "packages/website/.env.local"), "utf8"),
    ).toBe("LOCAL_ONLY=1\n");
  });
});
