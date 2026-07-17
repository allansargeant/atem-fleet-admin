# ATEM Fleet Admin — desktop app

A small menu-bar desktop app for ATEM Fleet Admin: pick a network interface +
port, Start/Stop the server, open the app in your browser, and run it from the
system tray. Built with [Tauri v2](https://tauri.app) using the fleet's reusable
[av-launcher](https://github.com/allansargeant/av-launcher) shell.

Download an installer from
[Releases](https://github.com/allansargeant/atem-fleet-admin/releases):
macOS `.dmg` (arm64 + x86_64), Windows `.exe`, Linux `.deb` + `.rpm`. (A Linux
`.AppImage` is provided by the main **Electron** build instead — the tray app
skips it, since its bundler needs FUSE on CI.)

> **Fully self-contained.** Because ATEM Fleet Admin's web target is a Node app,
> this bundle embeds a Node runtime **and** the whole app (server + built web
> UI). Nothing needs to be installed — no Node, no separate checkout. Just
> download and run.

> **Unsigned builds.** By default the installers are unsigned. On macOS,
> right-click the app → **Open** → **Open** once; on Windows, "More info" →
> "Run anyway". See [SIGNING.md](SIGNING.md) to produce signed macOS builds.

> Prefer a native desktop build with no server at all? The repo's **Electron**
> app (`npm run dev` at the root, or the platform installers on the main
> release) is the same tool without the tray/web server.

## What it does

- Lists bindable network interfaces + a port field (defaults to 4720).
- **Start/Stop** the embedded Fleet Admin server.
- **Open** the app in your browser.
- Lives in the system tray; the panel themes itself to ATEM Fleet Admin's palette
  (carried in `src-tauri/launcher.toml`).

## Build

```bash
cd launcher
npm ci
bash scripts/prepare.sh        # build app + embed Node runtime for this platform
npm run tauri build            # produces installers under src-tauri/target/release/bundle
```

To stage a Node runtime for a different platform, set `NODE_PLATFORM`
(e.g. `NODE_PLATFORM=win-x64 bash scripts/prepare.sh`).

The embedded runtime (`src-tauri/node[.exe]`) and app tree
(`src-tauri/atem-fleet-admin-app/`) are produced by `prepare.sh` and git-ignored;
they ship inside the bundle.
