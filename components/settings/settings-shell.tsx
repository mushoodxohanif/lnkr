import { AppHeader } from "@/components/app-header";
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
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader containerClass="max-w-6xl" />

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <SettingsNav />

        <main>
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
