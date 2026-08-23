# 项目结构

Polaris 是一个 Tauri v2 应用：Vite + React + TypeScript 前端配合 Rust 后端。

## 前端

- **技术栈：** React 19 + TypeScript，由 Vite 构建。
- **入口：** `src/main.tsx`
- **根组件：** `src/App.tsx`
- **资源：** `src/assets/` 存放前端资源；`public/` 存放原样提供的静态文件。

## 后端

- **Crate：** `src-tauri/src/` 中的 Rust crate。
  - `src-tauri/src/main.rs` —— 二进制入口。
  - `src-tauri/src/lib.rs` —— Tauri 命令与构建器。
- **配置：** `src-tauri/tauri.conf.json`。
  - `beforeDevCommand` 执行 `pnpm dev`；`beforeBuildCommand` 执行 `pnpm build`。
  - 开发服务器固定为 `http://localhost:3420`。
- **权限：** `src-tauri/capabilities/default.json` 授权 `core:default` 与 `opener:default`。

## 文档

- **源文件：** `docs/` 中的 Markdown（英文在 `docs/en/`，中文在 `docs/zh/`）。
- **配置：** `docs/.vitepress/config.ts`。
- **构建产物：** `docs/.vitepress/dist/`。

## 约定

- 前端：组件 PascalCase，函数 camelCase，样式就近放置。
- 后端：遵循 `cargo fmt`，snake_case，可被前端调用的函数标注 `#[tauri::command]` 并在 `generate_handler!` 中注册。
- 提交：Conventional Commits，scope 为 `polaris`（如 `feat(polaris): ...`）。
