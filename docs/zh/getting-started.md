# 快速开始

Polaris 是一个 Tauri v2 桌面应用：Rust 后端配合由 Vite 构建的 React 19 + TypeScript 前端。

## 前置条件

- **Node.js** 与 **pnpm**
- **Rust 工具链**（[rustup](https://rustup.rs)）
- Tauri 的系统级依赖 —— 参见 [Tauri 前置条件指南](https://tauri.app/start/prerequisites/)。

## 安装依赖

```bash
pnpm install
```

## 启动开发

启动完整的 Tauri 开发窗口（Vite 前端 + Rust 后端）：

```bash
pnpm tauri dev
```

仅做前端快速迭代：

```bash
pnpm dev
```

Vite 开发服务器运行在 `http://localhost:1420`（`strictPort: true`）—— 启动前请先释放该端口。

## 生产构建

```bash
pnpm tauri build
```

构建生产前端并编译 Rust 二进制，生成打包应用。

## 仅前端构建

```bash
pnpm build
```

依次执行 `tsc`（类型检查）与 `vite build`。

## 文档

本站点基于 [VitePress](https://vitepress.dev) 构建。本地运行：

```bash
pnpm docs:dev      # 启动文档开发服务器
pnpm docs:build    # 构建文档站点
pnpm docs:preview  # 预览构建后的文档
```
