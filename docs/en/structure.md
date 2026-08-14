# Project Structure

Polaris is a Tauri v2 application with a Vite + React + TypeScript frontend and a Rust backend.

## Frontend

- **Stack:** React 19 + TypeScript, built with Vite.
- **Entry:** `src/main.tsx`
- **Root component:** `src/App.tsx`
- **Styles:** `src/App.css`
- **Assets:** `src/assets/` for frontend assets; `public/` for static files served unchanged.

## Backend

- **Crate:** Rust crate in `src-tauri/src/`.
  - `src-tauri/src/main.rs` — binary entrypoint.
  - `src-tauri/src/lib.rs` — Tauri commands and the builder.
- **Config:** `src-tauri/tauri.conf.json`.
  - `beforeDevCommand` runs `pnpm dev`; `beforeBuildCommand` runs `pnpm build`.
  - Dev server is fixed at `http://localhost:1420`.
- **Capabilities:** `src-tauri/capabilities/default.json` grants `core:default` and `opener:default`.

## Documentation

- **Source:** Markdown in `docs/` (English in `docs/en/`, Chinese in `docs/zh/`).
- **Config:** `docs/.vitepress/config.ts`.
- **Build output:** `docs/.vitepress/dist/`.

## Conventions

- Frontend: PascalCase components, camelCase functions, styles beside their component.
- Backend: `cargo fmt`, snake_case, `#[tauri::command]` for frontend-callable functions registered in `generate_handler!`.
- Commits: Conventional Commits with scope `polaris` (e.g., `feat(polaris): ...`).
