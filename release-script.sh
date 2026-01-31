#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version type from argument, default to 'patch'
VERSION_TYPE=${1:-patch}

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}❌ Invalid version type: $VERSION_TYPE${NC}"
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Starting Release Process (${VERSION_TYPE} bump)${NC}"
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

# Step 2: Bump version (root)
echo -e "${YELLOW}📦 Bumping version (${VERSION_TYPE})...${NC}"
npm version "$VERSION_TYPE" --no-git-tag-version
echo -e "${GREEN}✅ Root version bumped successfully${NC}"
echo ""

# Step 3: Extract new version and sync across packages
NEW_VERSION=$(node -p "require('./package.json').version")
VERSION_FILES=(
  "package.json"
  "packages/api/package.json"
  "packages/db/package.json"
  "packages/desktop/package.json"
  "packages/shared/package.json"
  "packages/web/package.json"
  "packages/desktop/src-tauri/tauri.conf.json"
)

echo -e "${YELLOW}🔁 Syncing version to workspace packages...${NC}"
for file in "${VERSION_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo -e "${RED}❌ Missing version file: $file${NC}"
    exit 1
  fi
  node -e "const fs=require('fs');const path=process.argv[1];const version=process.argv[2];const data=JSON.parse(fs.readFileSync(path,'utf8'));data.version=version;fs.writeFileSync(path,JSON.stringify(data,null,2)+'\n');" "$file" "$NEW_VERSION"
done
echo -e "${GREEN}✅ Version synced to all packages${NC}"
echo ""

# Step 4: Display new version
echo -e "${GREEN}📌 New version: ${BLUE}v${NEW_VERSION}${NC}"
echo ""

# Step 5: Ask user for confirmation
echo -e "${YELLOW}⚠️  You are about to release version ${BLUE}v${NEW_VERSION}${NC}"
echo -e "${YELLOW}   This will:${NC}"
echo -e "${YELLOW}   - Commit version files across the monorepo${NC}"
echo -e "${YELLOW}   - Create git tag v${NEW_VERSION}${NC}"
echo -e "${YELLOW}   - Push to origin/main${NC}"
echo -e "${YELLOW}   - Build production artifacts${NC}"
echo -e "${YELLOW}   - Create GitHub release${NC}"
echo ""
read -p "Do you want to proceed? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${RED}❌ Release cancelled by user${NC}"
  # Revert version bump
  git checkout -- "${VERSION_FILES[@]}"
  echo -e "${YELLOW}⚠️  Version bump reverted${NC}"
  exit 1
fi

# Step 6: Git operations
echo -e "${YELLOW}📝 Committing version bump...${NC}"
git add "${VERSION_FILES[@]}"
git commit -m "chore: bump version to v${NEW_VERSION}"
echo -e "${GREEN}✅ Committed version files${NC}"
echo ""

echo -e "${YELLOW}🏷️  Creating git tag...${NC}"
git tag "v${NEW_VERSION}"
echo -e "${GREEN}✅ Created tag v${NEW_VERSION}${NC}"
echo ""

echo -e "${YELLOW}🚀 Pushing to remote...${NC}"
git push origin main && git push origin "v${NEW_VERSION}"
echo -e "${GREEN}✅ Pushed commits and tags${NC}"
echo ""

# Step 7: Build
echo -e "${YELLOW}🔨 Building production artifacts...${NC}"
pnpm -C packages/desktop build
echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Step 8: Verify artifacts
echo -e "${YELLOW}🔍 Verifying build artifacts...${NC}"
BUNDLE_DIR="./packages/desktop/src-tauri/target/release/bundle"
ARTIFACT_PATTERNS=(
  "$BUNDLE_DIR/nsis/*${NEW_VERSION}*.exe"
  "$BUNDLE_DIR/nsis/*${NEW_VERSION}*.exe.sig"
  "$BUNDLE_DIR/msi/*${NEW_VERSION}*.msi"
  "$BUNDLE_DIR/msi/*${NEW_VERSION}*.msi.sig"
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
  echo -e "${RED}❌ Error: No build artifacts found for v${NEW_VERSION} in ${BUNDLE_DIR}${NC}"
  exit 1
fi

if [[ ${#MISSING_PATTERNS[@]} -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Missing expected artifact patterns for v${NEW_VERSION}:${NC}"
  for pattern in "${MISSING_PATTERNS[@]}"; do
    echo -e "${YELLOW}   - $pattern${NC}"
  done
fi

echo -e "${GREEN}✅ Found ${#ARTIFACTS[@]} artifacts${NC}"
echo ""

# Step 9: Generate Release Notes
echo -e "${YELLOW}📝 Generating release notes...${NC}"

# Get previous tag (the tag before HEAD)
PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || git rev-list --max-parents=0 HEAD)

echo "   From: $PREV_TAG"
echo "   To:   v$NEW_VERSION"
echo ""

# Get all commit messages between previous tag and new version
COMMITS=$(git log ${PREV_TAG}..HEAD --pretty=format:"%s" --no-merges)

# Initialize release notes
RELEASE_NOTES=""

# Extract and format FEATURES
FEATURES=$(echo "$COMMITS" | grep "^feat" || true)
if [ -n "$FEATURES" ]; then
  RELEASE_NOTES+="## ✨ Features\n\n"
  while IFS= read -r line; do
    # Remove "feat" prefix and scope, keep the description
    MSG=$(echo "$line" | sed -E 's/^feat(\([^)]+\))?: */- /')
    RELEASE_NOTES+="$MSG\n"
  done <<< "$FEATURES"
  RELEASE_NOTES+="\n"
fi

# Extract and format BUG FIXES
FIXES=$(echo "$COMMITS" | grep "^fix" || true)
if [ -n "$FIXES" ]; then
  RELEASE_NOTES+="## 🐛 Bug Fixes\n\n"
  while IFS= read -r line; do
    MSG=$(echo "$line" | sed -E 's/^fix(\([^)]+\))?: */- /')
    RELEASE_NOTES+="$MSG\n"
  done <<< "$FIXES"
  RELEASE_NOTES+="\n"
fi

# Extract OTHER changes (chore, refactor, docs, etc.)
OTHERS=$(echo "$COMMITS" | grep -vE "^(feat|fix)" || true)
if [ -n "$OTHERS" ]; then
  RELEASE_NOTES+="## 🔧 Other Changes\n\n"
  while IFS= read -r line; do
    # Keep the type prefix for other changes
    MSG=$(echo "$line" | sed -E 's/^/- /')
    RELEASE_NOTES+="$MSG\n"
  done <<< "$OTHERS"
fi

# Preview release notes
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Release Notes Preview:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "$RELEASE_NOTES"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 10: Generate latest.json
echo -e "${YELLOW}🧾 Generating latest.json...${NC}"
NSIS_EXE=$(ls "$BUNDLE_DIR"/nsis/*${NEW_VERSION}*.exe 2>/dev/null | head -n 1)
NSIS_SIG=$(ls "$BUNDLE_DIR"/nsis/*${NEW_VERSION}*.exe.sig 2>/dev/null | head -n 1)

if [[ -z "$NSIS_EXE" || -z "$NSIS_SIG" ]]; then
  echo -e "${RED}❌ Error: Missing NSIS update bundle or signature for v${NEW_VERSION}${NC}"
  exit 1
fi

NSIS_EXE_NAME=$(basename "$NSIS_EXE")
NSIS_SIG_CONTENT=$(cat "$NSIS_SIG")
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

node -e "const fs=require('fs');const version=process.argv[1];const sig=process.argv[2];const exe=process.argv[3];const notes=process.argv[4];const pubDate=process.argv[5];const json={version,notes,pub_date:pubDate,platforms:{'windows-x86_64':{signature:sig,url:`https://github.com/BarrySong97/journal_todo/releases/download/v${NEW_VERSION}/${NSIS_EXE_NAME}`}}};fs.writeFileSync('latest.json',JSON.stringify(json,null,2)+'\n');" "$NEW_VERSION" "$NSIS_SIG_CONTENT" "$NSIS_EXE_NAME" "$(echo -e "$RELEASE_NOTES")" "$PUB_DATE"

ARTIFACTS+=("latest.json")
echo -e "${GREEN}✅ latest.json created${NC}"
echo ""

# Step 11: Create GitHub Release
echo -e "${YELLOW}🎉 Creating GitHub release...${NC}"
gh release create "v${NEW_VERSION}" \
  --repo "BarrySong97/journal_todo" \
  --title "JournalTodo v${NEW_VERSION}" \
  --notes "$(echo -e "$RELEASE_NOTES")" \
  "${ARTIFACTS[@]}"

echo -e "${GREEN}✅ GitHub release created${NC}"
echo ""

# Step 12: Success message
RELEASE_URL="https://github.com/BarrySong97/journal_todo/releases/tag/v${NEW_VERSION}"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎊 Release v${NEW_VERSION} completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📦 Release URL:${NC}"
echo -e "${BLUE}   ${RELEASE_URL}${NC}"
echo ""
echo -e "${GREEN}✨ Next steps:${NC}"
echo -e "   1. Verify the release on GitHub"
echo -e "   2. Test the auto-update functionality"
echo -e "   3. Announce the release to users"
echo ""
