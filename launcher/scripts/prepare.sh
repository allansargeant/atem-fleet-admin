#!/usr/bin/env bash
# Assemble the embedded ATEM Fleet Admin app for the desktop bundle.
#
# The web target's server pulls a native addon (atem-connection depends on
# @julusian/freetype2), which cannot be inlined into a single-file bundle. So we
# ship the compiled server (out-server), the built web UI (out-web) and a
# production node_modules carrying this platform's native prebuilds, laid out so
# the server's __dirname-relative path (../web) resolves unchanged.
#
# Produces src-tauri/node[.exe] and src-tauri/atem-fleet-admin-app/ (both
# git-ignored; they ship inside the bundle). Run before `npm run tauri build`.
# Must run on the TARGET platform (native prebuilds are platform-specific); the
# release matrix does exactly that.
#
# NODE_PLATFORM overrides the embedded runtime arch (win-x64 / darwin-arm64 /
# darwin-x64 / linux-x64 / linux-arm64); defaults to the host.
set -euo pipefail

NODE_VERSION="v22.20.0"

detect_platform() {
  local os arch
  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux)  os="linux" ;;
    MINGW*|MSYS*|CYGWIN*) os="win" ;;
    *) os="linux" ;;
  esac
  case "$(uname -m)" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64)  arch="x64" ;;
    *) arch="x64" ;;
  esac
  echo "${os}-${arch}"
}

PLATFORM="${NODE_PLATFORM:-$(detect_platform)}"

HERE="$(cd "$(dirname "$0")/.." && pwd)"     # launcher/
REPO="$(cd "$HERE/.." && pwd)"               # atem-fleet-admin repo root
TAURI="$HERE/src-tauri"
APP="$TAURI/atem-fleet-admin-app"

echo "==> building ATEM Fleet Admin (web + server)"
( cd "$REPO" && npm install && npm run web:build && npm run server:build )

echo "==> staging compiled server + web dist"
rm -rf "$APP"
mkdir -p "$APP"
# out-server/{server,shared,main} -> APP/{server,shared,main}; server resolves ../web
cp -R "$REPO/out-server/." "$APP/"
cp -R "$REPO/out-web" "$APP/web"

echo "==> installing production node_modules (with native prebuilds for $PLATFORM)"
# Minimal manifest whose deps are the server's runtime deps, so one hoisted
# node_modules serves the app. Versions are read from the repo package.json.
node -e '
  const fs = require("fs");
  const pkg = require(process.argv[1]);
  const want = ["express", "atem-connection"];
  const deps = {};
  for (const d of want) if (pkg.dependencies?.[d]) deps[d] = pkg.dependencies[d];
  fs.writeFileSync(process.argv[2], JSON.stringify({
    name: "atem-fleet-admin-app",
    private: true,
    dependencies: deps
  }, null, 2));
' "$REPO/package.json" "$APP/package.json"
( cd "$APP" && npm install --omit=dev --no-audit --no-fund )

echo "==> fetching self-contained Node $NODE_VERSION ($PLATFORM)"
if [[ "$PLATFORM" == win-* ]]; then
  TARBALL="node-$NODE_VERSION-$PLATFORM"
  curl -sL "https://nodejs.org/dist/$NODE_VERSION/$TARBALL.zip" -o "$TAURI/node.zip"
  ( cd "$TAURI"
    if command -v unzip >/dev/null 2>&1; then unzip -q -o node.zip
    elif command -v 7z >/dev/null 2>&1; then 7z x -y node.zip >/dev/null
    else tar -xf node.zip; fi )
  cp "$TAURI/$TARBALL/node.exe" "$TAURI/node.exe"
  rm -rf "$TAURI/$TARBALL" "$TAURI/node.zip"
  echo "prepared: $TAURI/node.exe + $APP"
else
  TARBALL="node-$NODE_VERSION-$PLATFORM"
  curl -sL "https://nodejs.org/dist/$NODE_VERSION/$TARBALL.tar.gz" -o "$TAURI/node.tar.gz"
  tar xzf "$TAURI/node.tar.gz" -C "$TAURI"
  cp "$TAURI/$TARBALL/bin/node" "$TAURI/node"
  chmod +x "$TAURI/node"
  rm -rf "$TAURI/$TARBALL" "$TAURI/node.tar.gz"
  echo "prepared: $TAURI/node + $APP (server, web UI, prod node_modules)"
fi
