import Link from "next/link";
import { SettingsNav } from "@/components/settings/settings-nav";

type SettingsShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function SettingsShell({
  title,
  description,
  children,
}: SettingsShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
            >
              lnkr
            </Link>
            <p className="mt-1 text-xs text-zinc-400">Settings</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <SettingsNav />

        <main>
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              {description}
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
