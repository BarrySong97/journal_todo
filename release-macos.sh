#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version type from argument, default to 'patch' (kept for CLI compatibility)
VERSION_TYPE=${1:-patch}

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}❌ Invalid version type: $VERSION_TYPE${NC}"
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo -e "${RED}❌ This script must be run on macOS${NC}"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Starting macOS Release Process (upload only)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Check for uncommitted changes
echo -e "${YELLOW}🔍 Checking for uncommitted changes...${NC}"
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${RED}❌ Error: You have uncommitted changes. Please commit or stash them first.${NC}"
  git status --short
  exit 1
fi
echo -e "${GREEN}✅ Working directory is clean${NC}"
echo ""

# Step 2: Extract version (no bump)
NEW_VERSION=$(node -p "require('./package.json').version")

echo -e "${GREEN}📌 Current version: ${BLUE}v${NEW_VERSION}${NC}"
echo ""

# Step 3: Ask user for confirmation
echo -e "${YELLOW}⚠️  You are about to upload macOS artifacts for version ${BLUE}v${NEW_VERSION}${NC}"
echo -e "${YELLOW}   This will:${NC}"
echo -e "${YELLOW}   - Build macOS artifacts for x86_64 and aarch64${NC}"
echo -e "${YELLOW}   - Update latest.json with macOS platforms${NC}"
echo -e "${YELLOW}   - Upload artifacts to the existing GitHub release${NC}"
echo ""
read -p "Do you want to proceed? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${RED}❌ Release cancelled by user${NC}"
  exit 1
fi

# Step 4: Build macOS artifacts (x86_64 + aarch64)
echo -e "${YELLOW}🔨 Building macOS production artifacts...${NC}"
MAC_TARGETS=("x86_64-apple-darwin" "aarch64-apple-darwin")
for target in "${MAC_TARGETS[@]}"; do
  echo -e "${YELLOW}   - Building target: ${target}${NC}"
  pnpm -C packages/desktop tauri build --target "${target}"
done

echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Step 5: Verify artifacts
echo -e "${YELLOW}🔍 Verifying build artifacts...${NC}"
BUNDLE_DIR_X64="./packages/desktop/src-tauri/target/x86_64-apple-darwin/release/bundle"
BUNDLE_DIR_ARM="./packages/desktop/src-tauri/target/aarch64-apple-darwin/release/bundle"

ARTIFACT_PATTERNS=(
  "$BUNDLE_DIR_X64/dmg/*${NEW_VERSION}*.dmg"
  "$BUNDLE_DIR_X64/macos/*${NEW_VERSION}*.app.tar.gz"
  "$BUNDLE_DIR_X64/macos/*${NEW_VERSION}*.app.tar.gz.sig"
  "$BUNDLE_DIR_ARM/dmg/*${NEW_VERSION}*.dmg"
  "$BUNDLE_DIR_ARM/macos/*${NEW_VERSION}*.app.tar.gz"
  "$BUNDLE_DIR_ARM/macos/*${NEW_VERSION}*.app.tar.gz.sig"
)

ARTIFACTS=()
MISSING_PATTERNS=()

shopt -s nullglob
for pattern in "${ARTIFACT_PATTERNS[@]}"; do
  matches=( $pattern )
  if [[ ${#matches[@]} -eq 0 ]]; then
    MISSING_PATTERNS+=("$pattern")
  else
    ARTIFACTS+=("${matches[@]}")
  fi
done
shopt -u nullglob

if [[ ${#ARTIFACTS[@]} -eq 0 ]]; then
  echo -e "${RED}❌ Error: No build artifacts found for v${NEW_VERSION}${NC}"
  exit 1
fi

if [[ ${#MISSING_PATTERNS[@]} -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Missing expected artifact patterns for v${NEW_VERSION}:${NC}"
  for pattern in "${MISSING_PATTERNS[@]}"; do
    echo -e "${YELLOW}   - $pattern${NC}"
  done
  exit 1
fi

echo -e "${GREEN}✅ Found ${#ARTIFACTS[@]} artifacts${NC}"
echo ""

# Step 6: Update latest.json with macOS platforms
echo -e "${YELLOW}🧾 Updating latest.json (macOS)...${NC}"
MAC_X64_APP=$(ls "$BUNDLE_DIR_X64"/macos/*${NEW_VERSION}*.app.tar.gz 2>/dev/null | head -n 1)
MAC_X64_SIG=$(ls "$BUNDLE_DIR_X64"/macos/*${NEW_VERSION}*.app.tar.gz.sig 2>/dev/null | head -n 1)
MAC_ARM_APP=$(ls "$BUNDLE_DIR_ARM"/macos/*${NEW_VERSION}*.app.tar.gz 2>/dev/null | head -n 1)
MAC_ARM_SIG=$(ls "$BUNDLE_DIR_ARM"/macos/*${NEW_VERSION}*.app.tar.gz.sig 2>/dev/null | head -n 1)

if [[ -z "$MAC_X64_APP" || -z "$MAC_X64_SIG" || -z "$MAC_ARM_APP" || -z "$MAC_ARM_SIG" ]]; then
  echo -e "${RED}❌ Error: Missing macOS app.tar.gz or signature for v${NEW_VERSION}${NC}"
  exit 1
fi

MAC_X64_APP_NAME=$(basename "$MAC_X64_APP")
MAC_ARM_APP_NAME=$(basename "$MAC_ARM_APP")
MAC_X64_SIG_CONTENT=$(cat "$MAC_X64_SIG")
MAC_ARM_SIG_CONTENT=$(cat "$MAC_ARM_SIG")
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MAC_X64_URL="https://github.com/BarrySong97/journal_todo/releases/download/v${NEW_VERSION}/${MAC_X64_APP_NAME}"
MAC_ARM_URL="https://github.com/BarrySong97/journal_todo/releases/download/v${NEW_VERSION}/${MAC_ARM_APP_NAME}"

node -e "const fs=require('fs');const version=process.argv[1];const pubDate=process.argv[2];const x64Sig=process.argv[3];const x64Url=process.argv[4];const armSig=process.argv[5];const armUrl=process.argv[6];const path='latest.json';let json={};if(fs.existsSync(path)){json=JSON.parse(fs.readFileSync(path,'utf8'));}json.version=version;json.notes=json.notes ?? '';json.pub_date=pubDate;json.platforms=json.platforms ?? {};json.platforms['darwin-x86_64']={signature:x64Sig,url:x64Url};json.platforms['darwin-aarch64']={signature:armSig,url:armUrl};fs.writeFileSync(path,JSON.stringify(json,null,2)+'\n');" "$NEW_VERSION" "$PUB_DATE" "$MAC_X64_SIG_CONTENT" "$MAC_X64_URL" "$MAC_ARM_SIG_CONTENT" "$MAC_ARM_URL"

ARTIFACTS+=("latest.json")
echo -e "${GREEN}✅ latest.json updated${NC}"
echo ""

# Step 7: Upload artifacts to existing release
echo -e "${YELLOW}🎉 Uploading artifacts to GitHub release...${NC}"
gh release upload "v${NEW_VERSION}" \
  --repo "BarrySong97/journal_todo" \
  --clobber \
  "${ARTIFACTS[@]}"

echo -e "${GREEN}✅ GitHub release updated${NC}"
echo ""

# Step 8: Success message
RELEASE_URL="https://github.com/BarrySong97/journal_todo/releases/tag/v${NEW_VERSION}"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎊 macOS artifacts upload completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📦 Release URL:${NC}"
echo -e "${BLUE}   ${RELEASE_URL}${NC}"
echo ""
