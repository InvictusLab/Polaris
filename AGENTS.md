# Repository Guidelines

## Project Structure & Module Organization

This is a Tauri v2 desktop application with a Vite + React + TypeScript frontend and a Rust backend.

### Frontend

- **Stack:** React 19 + TypeScript, built with Vite.
- **Entry:** `src/main.tsx`
- **Root component:** `src/App.tsx`
- **Styles:** `src/App.css` (imported inside `App.tsx`; there is no `src/index.css`).
- **Assets:** `src/assets/` holds frontend assets; `public/` holds static files served unchanged.

### Backend

- **Crate:** Rust crate in `src-tauri/src/`.
  - `src-tauri/src/main.rs` is the binary entrypoint.
  - `src-tauri/src/lib.rs` defines Tauri commands and assembles the builder.
- **Config:** `src-tauri/tauri.conf.json`.
  - `beforeDevCommand` runs `pnpm dev`.
  - `beforeBuildCommand` runs `pnpm build`.
  - Dev server is fixed at `http://localhost:1420` (see `vite.config.ts`).
  - The library crate is named `polaris_lib`; the binary calls `polaris_lib::run()`.
- **Capabilities:** `src-tauri/capabilities/default.json` grants `core:default` and `opener:default`. Capability `windows` entries match window `label`s; Tauri defaults the first window's label to `main` (the config sets no explicit label), so any new or renamed window needs its own capability entry. Keep capabilities aligned with any added plugin or API.
- **Icons:** `src-tauri/icons/` contains packaged application icons. Do not hand-edit generated icon variants.

### Package Manager

The repo uses `pnpm` for JavaScript dependencies and the Tauri CLI (no lockfile present, so run `pnpm install` first).

## Build, Test, and Development Commands

### Prerequisites

Requires Node + pnpm and the Rust toolchain. Install Tauri's OS-level prerequisites (macOS Xcode CLT / Windows WebView2 / Linux WebKit + openssl) per https://tauri.app/start/prerequisites/.

### Frontend

Install dependencies:

```bash
pnpm install
```

Start the Vite frontend only (useful for quick UI iteration):

```bash
pnpm dev
```

Build the frontend for production:

```bash
pnpm build
```

TypeScript is checked during the build (`pnpm build` runs `tsc`).

Preview the production frontend build locally (without the Rust backend):

```bash
pnpm preview
```

### Backend

Build the Rust crate directly:

```bash
cd src-tauri && cargo build
```

Format Rust code:

```bash
cd src-tauri && cargo fmt
```

Run Rust lints (recommended pre-submit; no project clippy config):

```bash
cd src-tauri && cargo clippy
```

Run Rust tests:

```bash
cd src-tauri && cargo test
```

Run a specific Rust test:

```bash
cd src-tauri && cargo test <test_name>
```

### Full-stack

Start the Tauri dev window (launches Vite and the Rust backend):

```bash
pnpm tauri dev
```

Build the full Tauri app (production frontend + Rust binary):

```bash
pnpm tauri build
```

The Vite dev server uses port `1420` with `strictPort: true`; free that port before starting development.

## Coding Style & Naming Conventions

### Frontend

- Use TypeScript with the repository's strict compiler settings.
- The project is ESM (`"type": "module"` in `package.json`); use ESM syntax in any JS config files you add.
- Components are named in PascalCase (e.g., `App.tsx`).
- Functions and variables use camelCase.
- Keep styles beside the component they serve.
- Access the Tauri backend via `@tauri-apps/api` imports (e.g., `invoke` from `@tauri-apps/api/core`); `window.__TAURI__` is not exposed (`withGlobalTauri` is off).
- No dedicated JavaScript formatter or linter is configured.

### Backend

- Follow `cargo fmt` for formatting.
- Rust functions and modules use snake_case.
- Annotate frontend-callable functions with `#[tauri::command]`.
- The frontend invokes commands by their registered name (e.g., `invoke("greet", { name })`).
- Register each new command in `tauri::generate_handler![...]` in `src-tauri/src/lib.rs` (the macro uses square brackets, e.g., `tauri::generate_handler![greet]`).

## Testing Guidelines

### Frontend

Frontend tests are not configured. For frontend changes, at minimum run `pnpm build` (catches TypeScript errors) and manually verify the affected flow with `pnpm tauri dev`.

### Backend

Rust tests belong beside the code they cover in `src-tauri/src/`, using `#[cfg(test)]` modules and descriptive `snake_case` test names. Run `cargo test` from `src-tauri/`.

## Commit Message Guidelines

History uses Conventional Commits with scope `polaris` (e.g., `feat(polaris): project initialization`) — subject line only, no body. Keep commits focused.

Commit only under the contributor's own identity. If `user.name` / `user.email` is not yet configured for the repository, stop and ask the user to set it before committing:

```bash
git config user.name "your name"
git config user.email "your email"
```

Run without `--global` to scope the value to this repo.

## Pull Request Guidelines

Base PRs against `master` (origin's default branch; `develop` is local-only — push it first if you branch from it). Pull requests should call out any capability or configuration (`tauri.conf.json`, `Cargo.toml`) changes explicitly, and include screenshots for UI changes.

## Notes

- When adding a Tauri plugin, ensure its permissions are added to `src-tauri/capabilities/default.json` (custom `#[tauri::command]` functions need no capability entry).
- Recommended VS Code extensions: `tauri-apps.tauri-vscode` and `rust-lang.rust-analyzer` (see `.vscode/extensions.json`).
- CSP is currently disabled (`app.security.csp` is `null` in `tauri.conf.json`); set a policy before shipping a production build.
- Do not modify files under `src-tauri/icons/` by hand; regenerate them with the Tauri icon tooling if needed.
