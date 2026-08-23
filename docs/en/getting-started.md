# Getting Started

Polaris is a Tauri v2 desktop application: a Rust backend paired with a React 19 + TypeScript frontend built by Vite.

## Prerequisites

- **Node.js** and **pnpm**
- **Rust toolchain** ([rustup](https://rustup.rs))
- Tauri's OS-level prerequisites — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/).

## Install dependencies

```bash
pnpm install
```

## Start development

Launch the full Tauri dev window (Vite frontend + Rust backend):

```bash
pnpm tauri dev
```

For quick frontend-only iteration:

```bash
pnpm dev
```

The Vite dev server runs at `http://localhost:3420` (`strictPort: true`) — free that port before starting.

## Build for production

```bash
pnpm tauri build
```

This builds the production frontend and compiles the Rust binary into a packaged application.

## Frontend-only build

```bash
pnpm build
```

Runs `tsc` (type-check) then `vite build`.

## Documentation

This site is built with [VitePress](https://vitepress.dev). Run it locally:

```bash
pnpm docs:dev      # start the docs dev server
pnpm docs:build    # build the docs site
pnpm docs:preview  # preview the built docs
```
