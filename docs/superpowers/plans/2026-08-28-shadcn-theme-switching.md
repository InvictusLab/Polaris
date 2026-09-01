# shadcn Component Library + Theme Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shadcn/ui as the component library and implement light/dark/system theme switching (no cold-start flash) for the Polaris Tauri v2 + React 19 + Vite 7 frontend.

**Architecture:** Tailwind v4 via `@tailwindcss/vite` + an `@/*`→`./src/*` alias; `shadcn init`/`add` for components; a hand-written context `ThemeProvider` (not `next-themes`) persisting to `localStorage` with a `matchMedia` live listener; an inline pre-mount `<script>` in `index.html` eliminates FOUC and is CSP-hash-pinnable for when Tauri CSP is later enabled.

**Tech Stack:** Tauri v2, React 19, Vite 7, pnpm 9.8, TypeScript (strict), Tailwind CSS v4, shadcn/ui (style `new-york`, base color `neutral`).

**Spec:** `docs/superpowers/specs/2026-08-28-shadcn-theme-switching-design.md`

## Global Constraints

Copied from the spec / AGENTS.md — every task's requirements implicitly include these.

- **Package manager:** `pnpm` (9.8.0). Use `pnpm` for installs and `pnpm dlx` for the shadcn CLI. `pnpm add` updates `pnpm-lock.yaml`.
- **ESM config:** `vite.config.ts` is ESM (`"type": "module"`). Do **not** use `__dirname` — use `fileURLToPath(new URL("./src", import.meta.url))`.
- **Path alias:** `@/*` → `./src/*`, configured in BOTH `tsconfig.json` (`baseUrl` + `paths`) and `vite.config.ts` (`resolve.alias`).
- **Commit style:** Conventional Commits, scope `polaris`, **subject line only, no body** (AGENTS.md). This plan has exactly **two** commits — one per task. Do not commit mid-task.
- **Verification (no test framework):** AGENTS.md specifies no frontend test suite. Each task verifies via `pnpm build` (runs `tsc` — the type gate) and manual `pnpm tauri dev` checks. Do not add a test framework.
- **Generated files:** `components.json`, `src/lib/utils.ts`, the `src/index.css` token blocks, and `src/components/ui/*.tsx` are written by the shadcn CLI. Do not hand-edit them; if a regen is needed, re-run the CLI.
- **CSP:** `src-tauri/tauri.conf.json` has `app.security.csp: null` (off). The inline FOUC script runs unrestricted now; its `sha256` is recorded for future CSP enablement (separate task).
- **CSS import typing:** `src/vite-env.d.ts` already has `/// <reference types="vite/client" />`, so `import "@/index.css"` type-checks. Do not remove that reference.
- **Don't touch:** `src-tauri/**` (Rust backend — no changes needed) and `src-tauri/icons/**` (never hand-edit).

## File Structure

| Path | Responsibility | Created by |
|---|---|---|
| `package.json` | Deps: `tailwindcss`, `@tailwindcss/vite`, `@types/node`; + shadcn runtime deps (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`) | Task 1 |
| `vite.config.ts` | `tailwindcss()` plugin + `@` alias (ESM-safe) | Task 1 |
| `tsconfig.json` | `baseUrl` + `paths` for `@/*` | Task 1 |
| `src/index.css` | `@import "tailwindcss";` + shadcn tokens (`:root`, `.dark`, `@theme inline`, base layer) | Task 1 (import) + CLI (tokens) |
| `components.json` | shadcn config (style/baseColor/aliases) | CLI (Task 1) |
| `src/lib/utils.ts` | `cn()` class-merge helper | CLI (Task 1) |
| `src/components/ui/button.tsx` | Button component | CLI (Task 1) |
| `src/components/ui/dropdown-menu.tsx` | DropdownMenu component | CLI (Task 1) |
| `index.html` | Inline FOUC `<script>` in `<head>` + hash comment | Task 2 |
| `src/components/theme-provider.tsx` | Context `ThemeProvider` + `useTheme` hook | Task 2 |
| `src/components/mode-toggle.tsx` | Sun/Moon dropdown toggle | Task 2 |
| `src/main.tsx` | Wrap `<App/>` in `<ThemeProvider>` | Task 2 |
| `src/App.tsx` | Import `index.css`; verification surface (ModeToggle + token card) | Task 2 |

---

## Task 1: Tailwind v4 + shadcn/ui infrastructure

**Files:**
- Modify: `package.json`, `vite.config.ts`, `tsconfig.json`
- Create: `src/index.css`
- Create (CLI): `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, `src/components/ui/dropdown-menu.tsx`

**Interfaces:**
- Consumes: nothing from later tasks.
- Produces: `@/*` alias resolvable in TS + Vite; `cn()` at `@/lib/utils`; `Button` at `@/components/ui/button`; `DropdownMenu*` at `@/components/ui/dropdown-menu`; shadcn tokens in `src/index.css`; `components.json` for future `shadcn add`.

- [ ] **Step 1: Install Tailwind v4 + node types**

```bash
pnpm add tailwindcss @tailwindcss/vite && pnpm add -D @types/node
```

Expected: `pnpm-lock.yaml` and `package.json` updated — `tailwindcss` + `@tailwindcss/vite` in `dependencies`, `@types/node` in `devDependencies`.

- [ ] **Step 2: Add the `@/*` alias to `tsconfig.json`**

In `tsconfig.json`, inside `compilerOptions`, add `baseUrl` and `paths` immediately after `"skipLibCheck": true,`:

```json
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
```

- [ ] **Step 3: Replace `vite.config.ts` — Tailwind plugin + ESM-safe `@` alias**

`@types/node` now types `process`, so the old `// @ts-expect-error process is a nodejs global` directive must go (it would become an *unused* `@ts-expect-error` and itself error). Replace the entire file with:

```ts
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 3420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 3421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

Note: `fileURLToPath(new URL("./src", import.meta.url))` resolves `./src` against the `vite.config.ts` location (URL resolution replaces the last path segment) → `<repo-root>/src`. This is the ESM-correct equivalent of the shadcn docs' `path.resolve(__dirname, "./src")`, which would throw here (`__dirname` is undefined in ESM).

- [ ] **Step 4: Create `src/index.css` with the Tailwind import**

Create `src/index.css` with exactly (shadcn init appends tokens in Step 5):

```css
@import "tailwindcss";
```

- [ ] **Step 5: Run `shadcn init` (non-interactive — defaults = new-york + neutral + CSS variables)**

```bash
pnpm dlx shadcn@latest init -d -y
```

Expected: writes `components.json`; appends the `:root` / `.dark` / `@custom-variant dark` / `@theme inline` / `@layer base` blocks to `src/index.css`; creates `src/lib/utils.ts` (`cn()`); installs runtime deps `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`. If `-d -y` still prompts despite the flags, accept defaults: style `new-york`, base color `neutral`, CSS variables `yes`.

- [ ] **Step 6: Verify `components.json`**

Open `components.json`. It must contain:
- `"rsc": false`
- `"tailwind": { "css": "src/index.css", "baseColor": "neutral", "cssVariables": true }`
- `"aliases"` mapping `"@/components"`, `"@/lib/utils"`, `"@/components/ui"`, `"@/lib"`, `"@/hooks"`.

If `baseColor` is not `neutral`, run `pnpm dlx shadcn@latest init --base-color neutral -d -y` again. Do not proceed with a non-`neutral` base color — Task 2's verification surface assumes the neutral palette.

- [ ] **Step 7: Add the `button` and `dropdown-menu` components**

```bash
pnpm dlx shadcn@latest add button dropdown-menu -y
```

Expected: creates `src/components/ui/button.tsx` and `src/components/ui/dropdown-menu.tsx` (+ their deps, e.g. `@radix-ui/react-dropdown-menu`, `@radix-ui/react-slot`).

- [ ] **Step 8: Verify the type + build gate**

Run: `pnpm build`
Expected: completes with zero TypeScript errors and produces `dist/`. (The app does not import `index.css` yet, so no Tailwind CSS is emitted into the bundle this step — that is fine; the build validates the alias, types, and config.)

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts tsconfig.json src/index.css components.json src/lib/utils.ts src/components/ui/
git commit -m "feat(polaris): add tailwind and shadcn component library"
```

---

## Task 2: Theme switching

**Files:**
- Modify: `index.html`, `src/main.tsx`, `src/App.tsx`
- Create: `src/components/theme-provider.tsx`, `src/components/mode-toggle.tsx`

**Interfaces:**
- Consumes: `@/components/ui/button`, `@/components/ui/dropdown-menu`, `lucide-react` (from Task 1).
- Produces: `ThemeProvider` + `useTheme` at `@/components/theme-provider`; `ModeToggle` at `@/components/mode-toggle`; the `polaris-theme` localStorage contract shared with the inline `index.html` script.

- [ ] **Step 1: Add the inline FOUC script + hash placeholder to `index.html`**

Replace the entire `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Polaris</title>
    <!--
      Pre-paint theme script — sets the dark/light class + color-scheme on <html>
      before React mounts, so there is no flash of the wrong theme on cold start.
      CSP is currently disabled (tauri.conf.json: app.security.csp = null).
      When CSP is enabled, allow this inline script in script-src: __HASH__
    -->
    <script>
      (function () {
        try {
          var t = localStorage.getItem("polaris-theme") || "system";
          var d =
            t === "dark" ||
            (t === "system" &&
              window.matchMedia("(prefers-color-scheme: dark)").matches);
          var e = document.documentElement;
          e.classList.remove("light", "dark");
          e.classList.add(d ? "dark" : "light");
          e.style.colorScheme = d ? "dark" : "light";
        } catch {}
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Note: the comment deliberately contains no literal `<script>` tag, so the hash step's regex matches only the real FOUC block above.

- [ ] **Step 2: Compute the CSP hash and fill the placeholder**

Run this (heredoc — quoted `EOF` so the shell touches nothing):

```bash
node <<'EOF'
const fs = require("fs");
const crypto = require("crypto");
let t = fs.readFileSync("index.html", "utf8");
const re = /<script>([\s\S]*?)<\/script>/g;
let m, body;
while ((m = re.exec(t))) {
  if (m[1].includes("polaris-theme")) body = m[1];
}
if (!body) {
  console.error("FOUC script not found in index.html");
  process.exit(1);
}
body = body.replace(/^\s+|\s+$/g, "");
const h = "sha256-" + crypto.createHash("sha256").update(body, "utf8").digest("base64");
t = t.replace(/__HASH__|sha256-[A-Za-z0-9+/=]+/, h);
fs.writeFileSync("index.html", t);
console.log("Recorded " + h + " in index.html comment");
EOF
```

Expected: prints `Recorded sha256-<base64> in index.html comment` and replaces the `__HASH__` token in the comment with that value. (Re-run this any time the script body changes — it updates the existing hash in place.)

- [ ] **Step 3: Create `src/components/theme-provider.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "polaris-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === "light" || stored === "dark" || stored === "system"
        ? (stored as Theme)
        : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const effective =
        theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      root.classList.remove("light", "dark");
      root.classList.add(effective);
      root.style.colorScheme = effective;
    };

    apply();

    const onChange = () => {
      if (theme === "system") apply();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (theme: Theme) => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      /* ignore persistence failure */
    }
    setThemeState(theme);
  };

  return (
    <ThemeProviderContext.Provider {...props} value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeProviderContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
```

Note: the `onChange` closure captures `theme` at effect-creation time; because the effect re-runs whenever `theme` changes, the listener is always registered with the current value — the standard React `matchMedia` pattern.

- [ ] **Step 4: Create `src/components/mode-toggle.tsx`**

```tsx
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 5: Wrap the app in `ThemeProvider` — `src/main.tsx`**

Replace `src/main.tsx` with:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@/components/theme-provider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="polaris-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
```

`defaultTheme="system"` and `storageKey="polaris-theme"` are passed explicitly to match the inline FOUC script's hardcoded key (`polaris-theme`) — keep all three in sync.

- [ ] **Step 6: Build the verification surface — `src/App.tsx`**

Replace `src/App.tsx` with:

```tsx
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import "@/index.css";

function App() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-8 p-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Polaris</h1>
          <ModeToggle />
        </header>
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-muted-foreground">
            shadcn/ui is wired up. Use the toggle to switch light / dark / system
            — tokens update live and the choice persists across reloads.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Swatch className="bg-background" label="background" />
            <Swatch className="bg-primary" label="primary" />
            <Swatch className="bg-secondary" label="secondary" />
            <Swatch className="bg-muted" label="muted" />
            <Swatch className="bg-accent" label="accent" />
            <Swatch className="bg-destructive" label="destructive" />
            <Swatch className="bg-card" label="card" />
            <Swatch className="bg-border" label="border" />
          </div>
        </section>
      </div>
    </main>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className={`h-12 rounded border border-border ${className}`} />
      <span className="text-center text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default App;
```

- [ ] **Step 7: Verify the type + build gate**

Run: `pnpm build`
Expected: zero TypeScript errors; `dist/` produced with the Tailwind CSS bundle now emitted (because `App.tsx` imports `@/index.css`).

- [ ] **Step 8: Manual verification in the running app**

Run: `pnpm tauri dev` (first launch compiles Rust — may take minutes).
Once the window opens, confirm each:

1. Open the toggle (top-right): **Light** / **Dark** / **System** items appear.
2. Select each of Light, Dark, System — every swatch, button, and text color flips to match.
3. With **Dark** selected, reload the window (right-click → Reload, or Cmd-R): no flash of light theme on cold start (the inline script applied `dark` before React mounted).
4. With **System** selected, open macOS System Settings → Appearance and flip Light↔Dark while the app is open: the app updates live without a reload (the `matchMedia` change listener).
5. Reload again: the last-chosen theme persists across restarts.

If anything flashes or fails to persist, re-check that `index.html` has the inline script, `storageKey="polaris-theme"` matches in both `main.tsx` and the script, and the provider's `useEffect` runs.

- [ ] **Step 9: Commit**

```bash
git add index.html src/components/theme-provider.tsx src/components/mode-toggle.tsx src/main.tsx src/App.tsx
git commit -m "feat(polaris): implement light dark theme switching"
```

---

## Self-Review (run before handoff)

- **Spec coverage:** Install Tailwind v4 + alias (Task 1.1–1.4) ✓; `shadcn init` → `components.json`/tokens/`utils.ts` (Task 1.5–1.6) ✓; `shadcn add button dropdown-menu` (Task 1.7) ✓; FOUC inline script + CSP hash (Task 2.1–2.2) ✓; context `ThemeProvider` with `matchMedia` live listener + validation (Task 2.3) ✓; `ModeToggle` (Task 2.4) ✓; wire `main.tsx` + `App.tsx` verification surface (Task 2.5–2.6) ✓; verification via `pnpm build` + manual `pnpm tauri dev` (Task 1.8, 2.7–2.8) ✓; two commits per spec (Task 1.9, 2.9) ✓.
- **Placeholder scan:** no TBD/TODO/vague steps; every code/config step has the exact content. The shadcn init "if it still prompts, accept defaults" is a documented fallback, not a placeholder.
- **Type consistency:** `useTheme()` returns `{ theme, setTheme }` — `ModeToggle` uses `setTheme` ✓; `ThemeProvider` props `defaultTheme`/`storageKey` — `main.tsx` passes both ✓; `polaris-theme` key consistent across `index.html` script, `ThemeProvider` default, and `main.tsx` prop ✓; `Button`/`DropdownMenu*` import paths match the CLI's `@/components/ui/*` output ✓.
