# shadcn Component Library + Theme Switching — Design

**Date:** 2026-08-28
**Status:** Approved (design) — pending spec review
**Stack:** Tauri v2 · React 19 · Vite 7 · pnpm 9.8 · TypeScript (strict)

## Background

Polaris is a Tauri v2 desktop app with a Vite + React 19 + TypeScript frontend. The frontend is currently a clean baseline (`src/App.tsx`, `src/main.tsx`, `src/vite-env.d.ts`) — no styling system, no CSS files, no path aliases. This design adds the shadcn/ui component library and a light/dark/system theme switcher, following shadcn/ui best practices per <https://ui.shadcn.com/>.

## Goals

- Install shadcn/ui into the existing Vite + React 19 project (Tailwind v4, CSS variables, `@/*` alias).
- Add the minimal component set the theme switcher needs: `button` and `dropdown-menu`.
- Implement a context-based `ThemeProvider` (the Vite path — **not** `next-themes`) with light/dark/system modes, persisted to `localStorage`, that live-tracks OS theme changes while in `system` mode.
- Eliminate cold-start FOUC via an inline pre-mount script in `index.html`.
- Keep the implementation CSP-compatible: the inline script is pin-able by `sha256` hash for when Tauri CSP is later enabled (AGENTS.md flags CSP as currently off but TODO before shipping).
- Verify with `pnpm build` (tsc gate) and `pnpm tauri dev` (manual), per AGENTS.md's testing convention.

## Non-Goals

- No native Tauri theme API integration — `matchMedia` already provides OS detection + live change events in the webview; the Rust side stays untouched. (Re-evaluate if `matchMedia` ever proves insufficient.)
- No new test framework — AGENTS.md specifies `pnpm build` + manual `pnpm tauri dev` verification for frontend; no frontend test suite exists and we do not add one here.
- No brand color system beyond shadcn's `neutral` base — custom tokens / brand palette are a separate task.
- No real app layout/chrome — `App.tsx` gets a minimal verification surface only, removable when real UI lands.
- No CSP enablement in this task — CSP stays `null`; we only ensure the inline script is hash-pinnable for the future.

## Architecture

shadcn/ui's documented Vite installation flow, plus a hand-written theme provider and a pre-mount FOUC script. One approach (the best-practice path); no competing alternatives remain after the FOUC decision was settled.

### Installation shape

1. **Tailwind v4** via the `@tailwindcss/vite` plugin (CSS-first config — no `tailwind.config.js`). A single `src/index.css` holds `@import "tailwindcss";` plus the shadcn tokens written by `shadcn init`.
2. **`@` path alias** in `tsconfig.json` (`baseUrl` + `paths`) and `vite.config.ts` (`resolve.alias`), pointing at `./src`. Adapted to this repo's single-file `tsconfig.json` (no `tsconfig.app.json`).
3. **`shadcn init`** generates `components.json` (style `new-york`, base color `neutral`, `cssVariables: true`, `rsc: false`, Vite aliases) and seeds `src/index.css` with `:root` / `.dark` / `@custom-variant dark` / `@theme inline` / base layer, plus `src/lib/utils.ts` (`cn()`).
4. **`shadcn add button dropdown-menu`** drops component source into `src/components/ui/`.

### Theme switching shape

- **`src/components/theme-provider.tsx`** — React context provider + `useTheme` hook. State is `"light" | "dark" | "system"`. Persists to `localStorage["polaris-theme"]`. Applies the resolved class (`light`/`dark`) and `color-scheme` to `document.documentElement`. Registers a `matchMedia("(prefers-color-scheme: dark)")` change listener so `system` mode live-tracks OS appearance changes. (Enhancement over the shadcn default provider, which only checks OS preference once at mount.)
- **`src/components/mode-toggle.tsx`** — `DropdownMenu` with a Sun/Moon icon button; items set light/dark/system.
- **`index.html`** — inline `<script>` in `<head>` that sets the class + `color-scheme` before React mounts (FOUC elimination).
- **`src/main.tsx`** — wraps `<App/>` in `<ThemeProvider>`.
- **`src/App.tsx`** — imports `index.css`; renders a minimal verification surface (ModeToggle + a token showcase card).

## Files

| Group | Path | Action | Notes |
|---|---|---|---|
| Infra | `package.json` | edit | Add `tailwindcss`, `@tailwindcss/vite` (deps); `@types/node` (dev). `shadcn init`/`add` additionally pull `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` (and per-component deps) at runtime. |
| Infra | `vite.config.ts` | edit | Add `tailwindcss()` to `plugins`; add `resolve.alias` mapping `"@"` → `path.resolve(__dirname, "./src")`. Import `path` from `node:path`. Requires `@types/node`. Preserve existing Tauri server/watch config. |
| Infra | `tsconfig.json` | edit | Add `"baseUrl": "."` and `"paths": { "@/*": ["./src/*"] }` to `compilerOptions`. (Single-file tsconfig — no `tsconfig.app.json` to also update.) |
| Infra | `src/index.css` | create, then extend via CLI | Initially `@import "tailwindcss";`; `shadcn init` appends the token blocks. Do not hand-edit the generated token blocks. |
| Generated | `components.json` | create (CLI) | Written by `shadcn init`. Do not hand-edit. |
| Generated | `src/lib/utils.ts` | create (CLI) | `cn()` helper. Written by `shadcn init`. |
| Generated | `src/components/ui/button.tsx` | create (CLI) | Written by `shadcn add button`. |
| Generated | `src/components/ui/dropdown-menu.tsx` | create (CLI) | Written by `shadcn add dropdown-menu`. |
| Hand-written | `src/components/theme-provider.tsx` | create | Context + `useTheme`; localStorage + matchMedia live listener. |
| Hand-written | `src/components/mode-toggle.tsx` | create | Sun/Moon dropdown toggle. |
| Hand-written | `index.html` | edit | Inline FOUC `<script>` in `<head>`. |
| Hand-written | `src/main.tsx` | edit | Wrap `<App/>` in `<ThemeProvider>`. |
| Hand-written | `src/App.tsx` | edit | Import `index.css`; minimal verification surface. |

## Theme Data Flow

1. **Pre-paint (FOUC script, `index.html` `<head>`)** — reads `localStorage["polaris-theme"]` (default `system`), resolves to `dark`/`light` via `matchMedia("(prefers-color-scheme: dark)")`, sets `classList` (`light`/`dark`) and `style.colorScheme` on `<html>`. Runs before React mounts; no flash of the wrong theme. Content is stable for CSP hashing (see FOUC & CSP).
2. **Mount** — `ThemeProvider` initializes state from the same localStorage key (validated against the allowed set, try/catch fallback to `defaultTheme`). A `useEffect` reconciles the class on `<html>` (idempotent — matches what the inline script already set).
3. **Live OS tracking** — the same `useEffect` registers a `matchMedia` change listener; on OS appearance change, if the current theme is `system`, re-resolves and re-applies the class + `color-scheme`. Cleanup removes the listener on unmount.
4. **User toggle** — `ModeToggle` calls `setTheme(mode)` → writes `localStorage` + sets state → the reconcile effect re-applies the class. Persists across reloads (step 1 reads it on the next cold start).
5. **CSP path** — the inline script's `sha256` is computed at implementation time and recorded in this spec and as an HTML comment above the script. When Tauri CSP is later enabled, add `'sha256-<hash>'` to `script-src`; the script continues to run under a strict policy. Until then (CSP `null`), it runs unrestricted.

## FOUC & CSP

**Inline script (exact, stable content for hashing):**

```html
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
```

- The hash is computed over the script element's text content (CSP strips leading/trailing ASCII whitespace). Record the resulting `'sha256-…'` in this spec and as an HTML comment above the script.
- `color-scheme` is set so native UA widgets (scrollbars, form controls) match the theme.
- The `try {} catch {}` guards against any `localStorage`/`matchMedia` failure (private-mode-style edge cases); on failure, the `:root` (light) tokens apply by default — acceptable degradation.

**Provider skeleton** (`src/components/theme-provider.tsx`, structure-level — final polish at implementation):

```tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = { theme: Theme; setTheme: (theme: Theme) => void };

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

> Note: the `onChange` closure captures `theme` at effect-creation time; because the effect re-runs whenever `theme` changes, the listener is always registered with the current value. This is the standard React pattern for `matchMedia` subscriptions.

**ModeToggle** follows the shadcn Vite dark-mode example (Sun/Moon `Button` + `DropdownMenu` with light/dark/system items); it only calls `useTheme().setTheme`, so persistence flows through the provider — no storage-key handling in the toggle itself.

## Defaults

| Decision | Value | Rationale / Swappable? |
|---|---|---|
| Base color | `neutral` | shadcn default; temperature-neutral. Swap to Stone/Zinc (warm) or Mauve/Olive/Mist/Taupe via `components.json` + re-init if a brand direction emerges. |
| Style | `new-york` | current shadcn default. `default` is the alternative. |
| Storage key | `polaris-theme` | project-scoped; avoids collision with the `vite-ui-theme` default. |
| Default theme | `system` | respects OS preference on first run. |
| `App.tsx` surface | minimal | ModeToggle + a small card showing background/foreground/primary/card/border tokens in both themes; delete when real UI lands. |

## Testing & Verification

Per AGENTS.md (no frontend test suite; `pnpm build` runs `tsc` as the type gate):

1. **`pnpm build`** — must pass with zero TS errors (validates the `@/*` alias, provider types, component imports).
2. **`pnpm tauri dev`** — manual verification:
   - Toggle light → dark → system; UI tokens update.
   - Reload the window while set to dark: no light flash on cold start (FOUC script works).
   - With theme = `system`, flip macOS appearance (System Settings → Appearance) while the app is open: the app updates live without reload.
   - Reloading persists the choice across restarts.

No test framework is added (YAGNI + AGENTS.md convention). The `ThemeProvider`'s `try/catch` on `localStorage`, the `matchMedia` presence relied on by the webview, and the stored-value validation are the non-trivial logic guards; they are verified manually above.

## Commits

Per AGENTS.md: Conventional Commits, scope `polaris`, subject line only, no body. Two focused commits for the implementation:

1. `feat(polaris): add tailwind and shadcn component library` — `package.json`, `vite.config.ts`, `tsconfig.json`, `src/index.css`, `components.json`, `src/lib/utils.ts`, `src/components/ui/{button,dropdown-menu}.tsx`.
2. `feat(polaris): implement light dark theme switching` — `index.html`, `src/components/{theme-provider,mode-toggle}.tsx`, `src/main.tsx`, `src/App.tsx`.

Commits are made directly; if `user.name` / `user.email` is unset for the repo, AGENTS.md says to ask the user to set it (without guessing values) and retry.

## Spec Location

This spec lives at `docs/superpowers/specs/` (the brainstorming skill's default path). Because `docs/` is the public VitePress site deployed to GitHub Pages, the spec is kept out of the published build via `srcExclude: ["superpowers/**"]` in `docs/.vitepress/config.ts`. Internal design docs accumulate under `docs/superpowers/` and are excluded from the public site; public-facing docs continue to live under `docs/en/` and `docs/zh/`.

## Open Questions / Future Work

- **Tauri CSP enablement** — when CSP is set, add the recorded `'sha256-…'` to `script-src`. Track separately.
- **Brand palette** — custom `--primary` etc. tokens beyond `neutral`; separate task.
- **Native Tauri theme API** — only revisit if `matchMedia` proves insufficient (e.g., per-window theme, or an OS that does not propagate `prefers-color-scheme` to the webview).
- **Per-window theme** — if multiple windows with different themes are ever needed, the single `<html>`-class model needs revisiting.
