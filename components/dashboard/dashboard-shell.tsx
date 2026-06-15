import { AppHeader } from "@/components/app-header";
import { MaxWidthWrapper } from "@/components/max-width-wrapper";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
  /** Lock layout to the viewport so nested flex children can scroll internally. */
  fillViewport?: boolean;
};

export function DashboardShell({
  children,
  fillViewport = false,
}: DashboardShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        fillViewport ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <AppHeader />

      <MaxWidthWrapper
        as="main"
        className={cn(
          "flex flex-1 flex-col p-6",
          fillViewport && "min-h-0 overflow-hidden",
        )}
      >
        {children}
      </MaxWidthWrapper>
    </div>
  );
}
