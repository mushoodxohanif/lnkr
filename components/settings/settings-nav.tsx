"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/help", label: "Setup guide" },
  { href: "/settings/product", label: "Product profile" },
  { href: "/settings/icp", label: "ICP criteria" },
  { href: "/settings/lists", label: "SN list URLs" },
  { href: "/settings/prompts", label: "Prompt templates" },
  { href: "/settings/safety", label: "Safety & audit" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            asChild
            className={cn(
              "w-full justify-start",
              isActive && "bg-muted text-foreground",
            )}
          >
            <Link href={item.href} aria-current={isActive ? "page" : undefined}>
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
