import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  wide?: boolean;
};

export function DashboardShell({
  title,
  description,
  children,
  headerExtra,
  wide = false,
}: DashboardShellProps) {
  const containerClass = wide ? "max-w-7xl" : "max-w-5xl";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader containerClass={containerClass} />

      <main
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-6 py-8",
          containerClass,
        )}
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {headerExtra}
        </div>
        {children}
      </main>
    </div>
  );
}
