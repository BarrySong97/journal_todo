# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Release Scripts

This repo uses one unified release script:

- `release.sh`

### Usage

```bash
./release.sh all patch
```

### Step Commands

```bash
./release.sh prepare patch   # only bump/sync version
./release.sh commit          # commit version files
./release.sh tag             # create v<version> tag
./release.sh push            # push main + tag
./release.sh build           # build current OS artifacts
./release.sh upload          # upload with retry strategy
./release.sh upload --latest-json-only  # only merge and upload latest.json with --clobber
./release.sh notes           # generate website downloads/release-notes JSON from GitHub release + git tags
./release.sh all patch       # run full sequence
```

### Retry Upload After Network Issues

If upload was interrupted after tag/release already exists, run:

```bash
./release.sh upload
```

If you only need to refresh update metadata across platforms:

```bash
./release.sh upload --latest-json-only
```

If you only need to refresh website downloads and release notes data:

```bash
./release.sh notes
```

The script will:
- fetch existing assets from the remote release
- compare remote assets vs local assets
- show `missing_on_remote`, `already_on_remote`, `remote_only`
- let you choose:
  - upload missing files only
  - re-upload all files with `--clobber`
  - cancel

### Notes

- macOS and Windows use the same release flow model; only artifact sets differ.
- Windows upload assets include NSIS and MSI bundles (portable `.exe` is not uploaded).
- macOS artifacts include `dmg` and `app.tar.gz` + `.sig` for both Intel and Apple Silicon.
- Legacy scripts `release-windows.sh`, `release-macos.sh`, `release-script.sh` were removed.

## Vercel Deployment (Website)

Deploy `packages/website` as the Vercel project root.

- Root Directory: `packages/website`
- Framework Preset: `Next.js`
- Install Command: `pnpm install`
- Build Command: `pnpm build`
- Output Directory: leave empty
- Config file location: `packages/website/vercel.json`

Keep `vercel.json` inside `packages/website` (not repo root) to avoid
accidentally deploying the monorepo root and hitting
`No Next.js version detected`.
