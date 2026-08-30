#!/usr/bin/env bash
set -euo pipefail

APP_NAME="gerdur"
BUILD_DIR="build"
DIST_DIR="dist"

rm -rf "$BUILD_DIR"
rm -rf "$DIST_DIR"

yarn build

mkdir -p "$BUILD_DIR"

case "$(uname -s)" in
  Linux)
    TARGETS=(
      node16-linux-x64
      node16-alpine-x64
    )
    ;;
  Darwin)
    TARGETS=(
      node16-macos-x64
      node16-macos-arm64
    )
    ;;
  MINGW*|MSYS*|CYGWIN*)
    TARGETS=(
      node14-win-x64
    )
    ;;
  *)
    echo "Unsupported host OS: $(uname -s)" >&2
    exit 1
    ;;
esac

pkg --out-path "$BUILD_DIR" package.json --targets "$(IFS=,; echo "${TARGETS[*]}")"

if command -v zip >/dev/null 2>&1; then
  ARCHIVER="zip"
elif command -v tar >/dev/null 2>&1; then
  ARCHIVER="tar"
else
  echo "Need zip or tar installed" >&2
  exit 1
fi

cd "$BUILD_DIR"

for file in *; do
  base="${file%.*}"

  if [[ "$file" == *.exe ]]; then
    cp "$file" "$APP_NAME.exe"
    if [[ "$ARCHIVER" == "zip" ]]; then
      zip "${base}.zip" "$APP_NAME.exe"
    else
      tar -czf "${base}.tar.gz" "$APP_NAME.exe"
    fi
    rm -f "$APP_NAME.exe"
  else
    cp "$file" "$APP_NAME"
    if [[ "$ARCHIVER" == "zip" ]]; then
      zip "${base}.zip" "$APP_NAME"
    else
      tar -czf "${base}.tar.gz" "$APP_NAME"
    fi
    rm -f "$APP_NAME"
  fi
done
