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

# Step 2: Bump version
echo -e "${YELLOW}📦 Bumping version (${VERSION_TYPE})...${NC}"
npm version "$VERSION_TYPE" --no-git-tag-version
echo -e "${GREEN}✅ Version bumped successfully${NC}"
echo ""

# Step 3: Extract new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}📌 New version: ${BLUE}v${NEW_VERSION}${NC}"
echo ""

# Step 4: Ask user for confirmation
echo -e "${YELLOW}⚠️  You are about to release version ${BLUE}v${NEW_VERSION}${NC}"
echo -e "${YELLOW}   This will:${NC}"
echo -e "${YELLOW}   - Commit package.json${NC}"
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
  git checkout package.json
  echo -e "${YELLOW}⚠️  Version bump reverted${NC}"
  exit 1
fi

# Step 5: Git operations
echo -e "${YELLOW}📝 Committing version bump...${NC}"
git add package.json
git commit -m "chore: bump version to v${NEW_VERSION}"
echo -e "${GREEN}✅ Committed package.json${NC}"
echo ""

echo -e "${YELLOW}🏷️  Creating git tag...${NC}"
git tag "v${NEW_VERSION}"
echo -e "${GREEN}✅ Created tag v${NEW_VERSION}${NC}"
echo ""

echo -e "${YELLOW}🚀 Pushing to remote...${NC}"
git push origin main && git push origin "v${NEW_VERSION}"
echo -e "${GREEN}✅ Pushed commits and tags${NC}"
echo ""

# Step 6: Build
echo -e "${YELLOW}🔨 Building production artifacts...${NC}"
pnpm -C packages/desktop build
echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Step 7: Verify artifacts
echo -e "${YELLOW}🔍 Verifying build artifacts...${NC}"
BUNDLE_DIR="./packages/desktop/src-tauri/target/release/bundle"
ARTIFACT_PATTERNS=(
  "$BUNDLE_DIR/nsis/*.exe"
  "$BUNDLE_DIR/nsis/*.exe.sig"
  "$BUNDLE_DIR/msi/*.msi"
  "$BUNDLE_DIR/msi/*.msi.sig"
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
  echo -e "${RED}❌ Error: No build artifacts found in ${BUNDLE_DIR}${NC}"
  exit 1
fi

if [[ ${#MISSING_PATTERNS[@]} -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Missing expected artifact patterns:${NC}"
  for pattern in "${MISSING_PATTERNS[@]}"; do
    echo -e "${YELLOW}   - $pattern${NC}"
  done
  echo -e "${YELLOW}   Continuing with found artifacts.${NC}"
fi

echo -e "${GREEN}✅ Found ${#ARTIFACTS[@]} artifacts${NC}"
echo ""

# Step 8: Generate Release Notes
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

# Step 9: Create GitHub Release
echo -e "${YELLOW}🎉 Creating GitHub release...${NC}"
gh release create "v${NEW_VERSION}" \
  --repo "BarrySong97/journal_todo" \
  --title "JournalTodo v${NEW_VERSION}" \
  --notes "$(echo -e "$RELEASE_NOTES")" \
  "${ARTIFACTS[@]}"

echo -e "${GREEN}✅ GitHub release created${NC}"
echo ""

# Step 10: Success message
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
