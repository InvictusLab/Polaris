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
