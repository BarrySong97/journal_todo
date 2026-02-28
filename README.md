# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Release Scripts

This repo uses two release scripts:

- `release-windows.sh`: full release flow (bump version, tag, push, build Windows, create GitHub release)
- `release-macos.sh`: upload-only flow (build macOS x86_64 + arm64, update `latest.json`, upload to existing release)

### Usage

1) Run the Windows script first (creates the release):

```bash
./release-windows.sh patch
```

2) Run the macOS script next (adds mac artifacts to the same release):

```bash
./release-macos.sh patch
```

### Notes

- `release-macos.sh` does not bump version or create tags.
- Windows artifacts include NSIS, MSI, and portable `.exe`.
- macOS artifacts include `dmg` and `app.tar.gz` + `.sig` for both Intel and Apple Silicon.
- Both scripts update/upload `latest.json`.
