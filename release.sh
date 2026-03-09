#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

GH_REPO="BarrySong97/journal_todo"
WEBSITE_DATA_DIR="packages/website/app/data"
DOWNLOADS_JSON_PATH="${WEBSITE_DATA_DIR}/downloads.json"
RELEASE_NOTES_JSON_PATH="${WEBSITE_DATA_DIR}/release-notes.json"

VERSION_FILES=(
  "package.json"
  "packages/api/package.json"
  "packages/db/package.json"
  "packages/desktop/package.json"
  "packages/shared/package.json"
  "packages/web/package.json"
  "packages/desktop/src-tauri/tauri.conf.json"
)

LOCAL_ASSETS=()
REMOTE_ASSET_NAMES=()
MISSING_ON_REMOTE=()
ALREADY_ON_REMOTE=()
REMOTE_ONLY=()
MAC_X64_APP_STAGED=""
MAC_X64_SIG_STAGED=""
MAC_ARM_APP_STAGED=""
MAC_ARM_SIG_STAGED=""

print_usage() {
  cat <<USAGE
Usage:
  ./release.sh prepare [patch|minor|major]
  ./release.sh commit
  ./release.sh tag
  ./release.sh push
  ./release.sh build
  ./release.sh upload [--latest-json-only]
  ./release.sh notes
  ./release.sh all [patch|minor|major]
USAGE
}

validate_version_type() {
  local version_type="$1"
  if [[ ! "$version_type" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}Invalid version type: $version_type${NC}"
    echo "Allowed: patch | minor | major"
    exit 1
  fi
}

detect_platform() {
  local uname_out
  uname_out="$(uname -s)"

  case "$uname_out" in
    Darwin)
      echo "macos"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      echo "windows"
      ;;
    *)
      echo -e "${RED}Unsupported OS: ${uname_out}${NC}" >&2
      exit 1
      ;;
  esac
}

require_tool() {
  local tool="$1"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo -e "${RED}Missing required tool: $tool${NC}"
    exit 1
  fi
}

get_current_version() {
  node -p "require('./package.json').version"
}

check_clean_worktree() {
  if [[ -n $(git status --porcelain) ]]; then
    echo -e "${RED}Working tree is not clean${NC}"
    git status --short
    exit 1
  fi
}

sync_version_files() {
  local version="$1"

  for file in "${VERSION_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
      echo -e "${RED}Missing version file: $file${NC}"
      exit 1
    fi

    node -e "const fs=require('fs');const file=process.argv[1];const version=process.argv[2];const data=JSON.parse(fs.readFileSync(file,'utf8'));data.version=version;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\\n');" "$file" "$version"
  done
}

contains_name() {
  local target="$1"
  shift
  local item
  for item in "$@"; do
    if [[ "$item" == "$target" ]]; then
      return 0
    fi
  done
  return 1
}

append_unique_asset() {
  local path="$1"
  local item
  for item in "${LOCAL_ASSETS[@]}"; do
    if [[ "$item" == "$path" ]]; then
      return
    fi
  done
  LOCAL_ASSETS+=("$path")
}

collect_with_patterns() {
  local patterns=("$@")
  local pattern

  LOCAL_ASSETS=()
  local missing_patterns=()

  shopt -s nullglob
  for pattern in "${patterns[@]}"; do
    local matches=( $pattern )
    if [[ ${#matches[@]} -eq 0 ]]; then
      missing_patterns+=("$pattern")
    else
      local m
      for m in "${matches[@]}"; do
        append_unique_asset "$m"
      done
    fi
  done
  shopt -u nullglob

  if [[ ${#missing_patterns[@]} -gt 0 ]]; then
    echo -e "${RED}Missing expected artifacts:${NC}"
    local mp
    for mp in "${missing_patterns[@]}"; do
      echo "  - $mp"
    done
    exit 1
  fi

  if [[ ${#LOCAL_ASSETS[@]} -eq 0 ]]; then
    echo -e "${RED}No local artifacts found${NC}"
    exit 1
  fi
}

collect_local_assets() {
  local platform="$1"
  local version="$2"

  if [[ "$platform" == "windows" ]]; then
    local bundle_dir="./packages/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle"
    collect_with_patterns \
      "$bundle_dir/nsis/*${version}*.exe" \
      "$bundle_dir/nsis/*${version}*.exe.sig" \
      "$bundle_dir/msi/*${version}*.msi" \
      "$bundle_dir/msi/*${version}*.msi.sig"
    return
  fi

  if [[ "$platform" == "macos" ]]; then
    local bundle_x64="./packages/desktop/src-tauri/target/x86_64-apple-darwin/release/bundle"
    local bundle_arm="./packages/desktop/src-tauri/target/aarch64-apple-darwin/release/bundle"
    collect_with_patterns \
      "$bundle_x64/dmg/*${version}*.dmg" \
      "$bundle_arm/dmg/*${version}*.dmg"

    local app_x64 sig_x64 app_arm sig_arm
    app_x64=$(ls "$bundle_x64"/macos/*.app.tar.gz 2>/dev/null | head -n 1)
    sig_x64=$(ls "$bundle_x64"/macos/*.app.tar.gz.sig 2>/dev/null | head -n 1)
    app_arm=$(ls "$bundle_arm"/macos/*.app.tar.gz 2>/dev/null | head -n 1)
    sig_arm=$(ls "$bundle_arm"/macos/*.app.tar.gz.sig 2>/dev/null | head -n 1)

    if [[ -z "$app_x64" || -z "$sig_x64" || -z "$app_arm" || -z "$sig_arm" ]]; then
      echo -e "${RED}Missing macOS app.tar.gz/signature artifacts${NC}"
      exit 1
    fi

    local stage_dir=".release-assets/v${version}/macos"
    mkdir -p "$stage_dir"

    local app_base
    app_base=$(basename "$app_x64")
    app_base="${app_base%.app.tar.gz}"

    MAC_X64_APP_STAGED="$stage_dir/${app_base}_${version}_x64.app.tar.gz"
    MAC_X64_SIG_STAGED="$stage_dir/${app_base}_${version}_x64.app.tar.gz.sig"
    MAC_ARM_APP_STAGED="$stage_dir/${app_base}_${version}_aarch64.app.tar.gz"
    MAC_ARM_SIG_STAGED="$stage_dir/${app_base}_${version}_aarch64.app.tar.gz.sig"

    cp "$app_x64" "$MAC_X64_APP_STAGED"
    cp "$sig_x64" "$MAC_X64_SIG_STAGED"
    cp "$app_arm" "$MAC_ARM_APP_STAGED"
    cp "$sig_arm" "$MAC_ARM_SIG_STAGED"

    append_unique_asset "$MAC_X64_APP_STAGED"
    append_unique_asset "$MAC_X64_SIG_STAGED"
    append_unique_asset "$MAC_ARM_APP_STAGED"
    append_unique_asset "$MAC_ARM_SIG_STAGED"
    return
  fi

  echo -e "${RED}Unknown platform for artifact collection: $platform${NC}"
  exit 1
}

update_latest_json() {
  local platform="$1"
  local version="$2"
  local pub_date
  pub_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  if [[ "$platform" == "windows" ]]; then
    local bundle_dir="./packages/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle"
    local nsis_exe
    local nsis_sig
    nsis_exe=$(ls "$bundle_dir"/nsis/*${version}*.exe 2>/dev/null | head -n 1)
    nsis_sig=$(ls "$bundle_dir"/nsis/*${version}*.exe.sig 2>/dev/null | head -n 1)

    if [[ -z "$nsis_exe" || -z "$nsis_sig" ]]; then
      echo -e "${RED}Missing NSIS update bundle/signature for latest.json${NC}"
      exit 1
    fi

    local nsis_name
    local nsis_sig_content
    local update_url
    nsis_name=$(basename "$nsis_exe")
    nsis_sig_content=$(cat "$nsis_sig")
    update_url="https://github.com/${GH_REPO}/releases/download/v${version}/${nsis_name}"

    node -e "const fs=require('fs');const version=process.argv[1];const pubDate=process.argv[2];const sig=process.argv[3];const url=process.argv[4];const file='latest.json';let json={};if(fs.existsSync(file)){json=JSON.parse(fs.readFileSync(file,'utf8'));}json.version=version;json.notes=json.notes ?? '';json.pub_date=pubDate;json.platforms=json.platforms ?? {};json.platforms['windows-x86_64']={signature:sig,url};fs.writeFileSync(file,JSON.stringify(json,null,2)+'\\n');" "$version" "$pub_date" "$nsis_sig_content" "$update_url"
    append_unique_asset "latest.json"
    return
  fi

  if [[ "$platform" == "macos" ]]; then
    if [[ -z "$MAC_X64_APP_STAGED" || -z "$MAC_X64_SIG_STAGED" || -z "$MAC_ARM_APP_STAGED" || -z "$MAC_ARM_SIG_STAGED" ]]; then
      echo -e "${RED}Missing staged macOS updater artifacts for latest.json${NC}"
      exit 1
    fi

    local app_x64_name app_arm_name sig_x64_content sig_arm_content url_x64 url_arm
    app_x64_name=$(basename "$MAC_X64_APP_STAGED")
    app_arm_name=$(basename "$MAC_ARM_APP_STAGED")
    sig_x64_content=$(cat "$MAC_X64_SIG_STAGED")
    sig_arm_content=$(cat "$MAC_ARM_SIG_STAGED")
    url_x64="https://github.com/${GH_REPO}/releases/download/v${version}/${app_x64_name}"
    url_arm="https://github.com/${GH_REPO}/releases/download/v${version}/${app_arm_name}"

    node -e "const fs=require('fs');const version=process.argv[1];const pubDate=process.argv[2];const sigX64=process.argv[3];const urlX64=process.argv[4];const sigArm=process.argv[5];const urlArm=process.argv[6];const file='latest.json';let json={};if(fs.existsSync(file)){json=JSON.parse(fs.readFileSync(file,'utf8'));}json.version=version;json.notes=json.notes ?? '';json.pub_date=pubDate;json.platforms=json.platforms ?? {};json.platforms['darwin-x86_64']={signature:sigX64,url:urlX64};json.platforms['darwin-aarch64']={signature:sigArm,url:urlArm};fs.writeFileSync(file,JSON.stringify(json,null,2)+'\\n');" "$version" "$pub_date" "$sig_x64_content" "$url_x64" "$sig_arm_content" "$url_arm"
    append_unique_asset "latest.json"
    return
  fi

  echo -e "${RED}Unknown platform for latest.json update: $platform${NC}"
  exit 1
}

get_remote_asset_names() {
  local version="$1"
  local gh_json

  REMOTE_ASSET_NAMES=()
  if ! gh_json=$(gh release view "v${version}" --repo "$GH_REPO" --json assets 2>/dev/null); then
    return 1
  fi

  while IFS= read -r name; do
    if [[ -n "$name" ]]; then
      REMOTE_ASSET_NAMES+=("$name")
    fi
  done < <(node -e "const json=JSON.parse(process.argv[1]);for(const a of (json.assets||[])){if(a&&a.name)console.log(a.name)}" "$gh_json")
  return 0
}

sync_latest_json_from_remote() {
  local version="$1"
  local cache_dir=".release-assets/cache"
  mkdir -p "$cache_dir"

  if gh release download "v${version}" \
    --repo "$GH_REPO" \
    --pattern "latest.json" \
    --output "$cache_dir/latest.remote.json" \
    --clobber >/dev/null 2>&1; then
    cp "$cache_dir/latest.remote.json" latest.json
  fi
}

compute_asset_diff() {
  MISSING_ON_REMOTE=()
  ALREADY_ON_REMOTE=()
  REMOTE_ONLY=()

  local local_names=()
  local path name
  for path in "${LOCAL_ASSETS[@]}"; do
    name=$(basename "$path")
    local_names+=("$name")
    if contains_name "$name" "${REMOTE_ASSET_NAMES[@]}"; then
      ALREADY_ON_REMOTE+=("$path")
    else
      MISSING_ON_REMOTE+=("$path")
    fi
  done

  local remote_name
  for remote_name in "${REMOTE_ASSET_NAMES[@]}"; do
    if ! contains_name "$remote_name" "${local_names[@]}"; then
      REMOTE_ONLY+=("$remote_name")
    fi
  done
}

show_asset_diff() {
  echo -e "${BLUE}Asset diff for release:${NC}"

  echo "missing_on_remote (${#MISSING_ON_REMOTE[@]}):"
  local item
  for item in "${MISSING_ON_REMOTE[@]}"; do
    echo "  - $(basename "$item")"
  done

  echo "already_on_remote (${#ALREADY_ON_REMOTE[@]}):"
  for item in "${ALREADY_ON_REMOTE[@]}"; do
    echo "  - $(basename "$item")"
  done

  echo "remote_only (${#REMOTE_ONLY[@]}):"
  for item in "${REMOTE_ONLY[@]}"; do
    echo "  - $item"
  done
  echo ""
}

create_release_if_missing() {
  local version="$1"

  echo -e "${YELLOW}Release v${version} does not exist on GitHub.${NC}"
  echo "1) Create release v${version} now"
  echo "2) Cancel"
  read -p "Select [1-2]: " -r choice

  case "$choice" in
    1)
      gh release create "v${version}" \
        --repo "$GH_REPO" \
        --title "JournalTodo v${version}" \
        --notes "Release v${version}"
      ;;
    *)
      echo -e "${RED}Upload cancelled${NC}"
      exit 1
      ;;
  esac
}

upload_with_strategy() {
  local version="$1"

  echo "Choose upload strategy:"
  echo "1) Upload missing files only (${#MISSING_ON_REMOTE[@]})"
  echo "2) Re-upload all files with --clobber (${#LOCAL_ASSETS[@]})"
  echo "3) Cancel"
  read -p "Select [1-3]: " -r choice

  case "$choice" in
    1)
      if [[ ${#MISSING_ON_REMOTE[@]} -eq 0 ]]; then
        echo -e "${GREEN}No missing files. Nothing to upload.${NC}"
        return
      fi
      gh release upload "v${version}" --repo "$GH_REPO" "${MISSING_ON_REMOTE[@]}"
      ;;
    2)
      gh release upload "v${version}" --repo "$GH_REPO" --clobber "${LOCAL_ASSETS[@]}"
      ;;
    *)
      echo -e "${RED}Upload cancelled${NC}"
      exit 1
      ;;
  esac
}

upload_latest_json_only() {
  local platform="$1"
  local version="$2"

  sync_latest_json_from_remote "$version"
  collect_local_assets "$platform" "$version"
  update_latest_json "$platform" "$version"

  gh release upload "v${version}" --repo "$GH_REPO" --clobber latest.json
  echo -e "${GREEN}latest.json uploaded with --clobber for v${version}${NC}"
}

update_downloads_json_version() {
  local version="$1"

  if [[ ! -f "$DOWNLOADS_JSON_PATH" ]]; then
    echo -e "${YELLOW}Skipped downloads.json update (file not found): ${DOWNLOADS_JSON_PATH}${NC}"
    return
  fi

  DOWNLOADS_JSON_PATH="$DOWNLOADS_JSON_PATH" RELEASE_VERSION="$version" node - <<'NODE'
const fs = require("fs")

const filePath = process.env.DOWNLOADS_JSON_PATH
const version = process.env.RELEASE_VERSION
const semverPattern = /\d+\.\d+\.\d+/g

const raw = fs.readFileSync(filePath, "utf8")
const data = JSON.parse(raw)

data.version = version
data.generatedAt = new Date().toISOString()

for (const group of data.groups || []) {
  for (const item of group.items || []) {
    if (typeof item.assetName === "string") {
      item.assetName = item.assetName.replace(semverPattern, version)
    }
    if (typeof item.url === "string") {
      item.url = item.url.replace(semverPattern, version)
    }
  }
}

fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
NODE

  echo -e "${GREEN}Updated downloads.json to v${version}${NC}"
}

step_prepare() {
  local version_type="${1:-patch}"
  validate_version_type "$version_type"

  check_clean_worktree
  npm version "$version_type" --no-git-tag-version

  local version
  version=$(get_current_version)
  sync_version_files "$version"

  echo -e "${GREEN}Prepared version v${version}${NC}"
}

step_commit() {
  git add "${VERSION_FILES[@]}"
  if git diff --cached --quiet; then
    echo -e "${RED}No staged version changes to commit${NC}"
    exit 1
  fi

  local version
  version=$(get_current_version)
  git commit -m "chore: bump version to v${version}"
  echo -e "${GREEN}Committed version changes for v${version}${NC}"
}

step_tag() {
  local version tag
  version=$(get_current_version)
  tag="v${version}"

  if git rev-parse "$tag" >/dev/null 2>&1; then
    echo -e "${RED}Tag already exists locally: ${tag}${NC}"
    exit 1
  fi

  git tag "$tag"
  echo -e "${GREEN}Created tag ${tag}${NC}"
}

step_push() {
  local version tag
  version=$(get_current_version)
  tag="v${version}"

  git push origin main
  git push origin "$tag"
  echo -e "${GREEN}Pushed main and ${tag}${NC}"
}

step_build() {
  local platform
  platform=$(detect_platform)

  if [[ "$platform" == "windows" ]]; then
    pnpm -C packages/desktop tauri build --target x86_64-pc-windows-msvc
    echo -e "${GREEN}Windows artifacts built${NC}"
    return
  fi

  if [[ "$platform" == "macos" ]]; then
    local targets=("x86_64-apple-darwin" "aarch64-apple-darwin")
    local t
    for t in "${targets[@]}"; do
      pnpm -C packages/desktop tauri build --target "$t"
    done
    echo -e "${GREEN}macOS artifacts built (x86_64 + aarch64)${NC}"
    return
  fi

  echo -e "${RED}Unsupported platform for build${NC}"
  exit 1
}

step_upload() {
  local mode="${1:-normal}"
  require_tool gh

  local platform version
  platform=$(detect_platform)
  version=$(get_current_version)

  if ! get_remote_asset_names "$version"; then
    create_release_if_missing "$version"
    get_remote_asset_names "$version" || {
      echo -e "${RED}Failed to fetch release assets after creating release${NC}"
      exit 1
    }
  fi

  if [[ "$mode" == "latest-only" ]]; then
    upload_latest_json_only "$platform" "$version"
    update_downloads_json_version "$version"
    return
  fi

  sync_latest_json_from_remote "$version"
  collect_local_assets "$platform" "$version"
  update_latest_json "$platform" "$version"

  compute_asset_diff
  show_asset_diff
  upload_with_strategy "$version"
  update_downloads_json_version "$version"

  echo -e "${GREEN}Upload step completed for v${version}${NC}"
}

step_notes() {
  require_tool gh

  local version tag gh_json
  version=$(get_current_version)
  tag="v${version}"

  if ! gh_json=$(gh release view "$tag" --repo "$GH_REPO" --json assets 2>/dev/null); then
    echo -e "${RED}Release ${tag} not found on GitHub.${NC}"
    echo "Run tag/push/upload first, then retry: ./release.sh notes"
    exit 1
  fi

  mkdir -p "$WEBSITE_DATA_DIR"

  GH_ASSETS_JSON="$gh_json" \
  GH_REPO="$GH_REPO" \
  RELEASE_VERSION="$version" \
  OUTPUT_PATH="$DOWNLOADS_JSON_PATH" \
  node - <<'NODE'
const fs = require("fs")

const json = JSON.parse(process.env.GH_ASSETS_JSON || "{}")
const assets = (json.assets || []).map((asset) => asset?.name).filter(Boolean)
const repo = process.env.GH_REPO
const version = process.env.RELEASE_VERSION
const outputPath = process.env.OUTPUT_PATH

const isDmg = (name) => /\.dmg$/i.test(name) && !/\.sig$/i.test(name)
const isExe = (name) => /\.exe$/i.test(name) && !/\.sig$/i.test(name)

const macArmDmg = assets.find((name) => isDmg(name) && /aarch64/i.test(name))
const macX64Dmg = assets.find(
  (name) => isDmg(name) && /(x64|x86_64)/i.test(name) && !/aarch64/i.test(name)
)
const windowsInstaller = assets.find(
  (name) => isExe(name) && !/portable/i.test(name)
)

const missing = []
if (!macArmDmg) missing.push("macOS Apple Silicon dmg (*aarch64*.dmg)")
if (!macX64Dmg) missing.push("macOS Intel dmg (*x64*.dmg)")
if (!windowsInstaller) {
  missing.push("Windows installer exe (*.exe, excluding portable and .sig)")
}

if (missing.length > 0) {
  console.error("Missing required release assets:")
  for (const item of missing) {
    console.error(`  - ${item}`)
  }
  process.exit(1)
}

const buildUrl = (assetName) =>
  `https://github.com/${repo}/releases/download/v${version}/${assetName}`

const downloads = {
  version,
  generatedAt: new Date().toISOString(),
  groups: [
    {
      category: "macOS",
      items: [
        {
          name: "Apple Silicon",
          assetName: macArmDmg,
          url: buildUrl(macArmDmg),
        },
        {
          name: "Intel",
          assetName: macX64Dmg,
          url: buildUrl(macX64Dmg),
        },
      ],
    },
    {
      category: "Windows",
      items: [
        {
          name: "Windows 10/11 (64-bit)",
          assetName: windowsInstaller,
          url: buildUrl(windowsInstaller),
        },
      ],
    },
  ],
}

fs.writeFileSync(outputPath, `${JSON.stringify(downloads, null, 2)}\n`)
NODE

  OUTPUT_PATH="$RELEASE_NOTES_JSON_PATH" \
  node - <<'NODE'
const { execSync } = require("child_process")
const fs = require("fs")

const outputPath = process.env.OUTPUT_PATH

const tagOutput = execSync("git tag --list 'v*' --sort=-version:refname", {
  encoding: "utf8",
})
const tags = tagOutput
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)

if (tags.length === 0) {
  console.error("No git tags matched 'v*'. Cannot generate release-notes.json.")
  process.exit(1)
}

const readLines = (cmd) => {
  const out = execSync(cmd, { encoding: "utf8" }).trim()
  if (!out) return []
  return out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

const normalizeText = (subject) =>
  subject.replace(
    /^(feat|fix|chore|refactor|docs|test|perf|build|ci|style)(\([^)]+\))?:\s*/i,
    ""
  )

const mapType = (subject) => {
  if (/^feat(\([^)]+\))?:/i.test(subject)) return "new"
  if (/^fix(\([^)]+\))?:/i.test(subject)) return "fix"
  return "other"
}

const releases = tags.map((tag, index) => {
  const prevTag = tags[index + 1]
  const date = execSync(`git log -1 --format=%aI ${tag}`, {
    encoding: "utf8",
  }).trim()

  const subjects = prevTag
    ? readLines(`git log --pretty=format:%s ${prevTag}..${tag}`)
    : readLines(`git log -1 --pretty=format:%s ${tag}`)

  const items = subjects.map((subject) => ({
    type: mapType(subject),
    text: normalizeText(subject) || subject,
  }))

  return {
    version: tag,
    date,
    items,
  }
})

const payload = {
  generatedAt: new Date().toISOString(),
  releases,
}

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
NODE

  echo -e "${GREEN}Generated website data files:${NC}"
  echo "  - ${DOWNLOADS_JSON_PATH}"
  echo "  - ${RELEASE_NOTES_JSON_PATH}"
}

step_all() {
  local version_type="${1:-patch}"
  validate_version_type "$version_type"

  step_prepare "$version_type"

  local version
  version=$(get_current_version)

  echo -e "${YELLOW}About to run commit -> tag -> push -> build -> upload for v${version}${NC}"
  read -p "Proceed? (yes/no): " -r confirm
  if [[ ! "$confirm" =~ ^[Yy][Ee][Ss]$ ]]; then
    git checkout -- "${VERSION_FILES[@]}"
    echo -e "${RED}Cancelled${NC}"
    echo -e "${YELLOW}Reverted version file changes from prepare${NC}"
    exit 1
  fi

  step_commit
  step_tag
  step_push
  step_build
  step_upload
}

main() {
  local cmd="${1:-}"
  shift || true

  case "$cmd" in
    prepare)
      step_prepare "$@"
      ;;
    commit)
      step_commit
      ;;
    tag)
      step_tag
      ;;
    push)
      step_push
      ;;
    build)
      step_build
      ;;
    upload)
      if [[ $# -eq 0 ]]; then
        step_upload
      elif [[ $# -eq 1 && "$1" == "--latest-json-only" ]]; then
        step_upload "latest-only"
      else
        echo -e "${RED}Unknown option for upload: $*${NC}"
        print_usage
        exit 1
      fi
      ;;
    notes)
      if [[ $# -ne 0 ]]; then
        echo -e "${RED}Unknown option for notes: $*${NC}"
        print_usage
        exit 1
      fi
      step_notes
      ;;
    all)
      step_all "$@"
      ;;
    "")
      print_usage
      exit 1
      ;;
    *)
      echo -e "${RED}Unknown command: $cmd${NC}"
      print_usage
      exit 1
      ;;
  esac
}

main "$@"
