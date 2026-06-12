"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/today",
    label: "Today's top 50",
    match: (pathname: string) => pathname === "/today",
  },
  {
    href: "/history",
    label: "History",
    match: (pathname: string) => pathname.startsWith("/history"),
  },
  {
    href: "/leads",
    label: "All leads",
    match: (pathname: string) => pathname.startsWith("/leads"),
  },
  {
    href: "/settings/product",
    label: "Settings",
    match: (pathname: string) => pathname.startsWith("/settings"),
  },
] as const;

type AppHeaderProps = {
  containerClass?: string;
};

export function AppHeader({ containerClass = "max-w-5xl" }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-background">
      <div
        className={cn(
          "mx-auto flex items-center justify-between px-6 py-4",
          containerClass,
        )}
      >
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          lnkr
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match(pathname);

            return (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                asChild
                className={cn(isActive && "bg-muted text-foreground")}
              >
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </Button>
            );
          })}
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}
