import Link from "next/link";

type DashboardShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
};

export function DashboardShell({
  title,
  description,
  children,
  headerExtra,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900"
          >
            lnkr
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
            >
              Today&apos;s top 50
            </Link>
            <Link
              href="/history"
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
            >
              History
            </Link>
            <Link
              href="/settings/product"
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
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
