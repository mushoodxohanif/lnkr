import type * as React from "react";

import { cn } from "@/lib/utils";

/** Shared max content width for app pages, header, and marketing sections. */
export const APP_CONTENT_MAX_WIDTH = "max-w-6xl";

type MaxWidthWrapperProps<T extends React.ElementType = "div"> = {
  as?: T;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className">;

export function MaxWidthWrapper<T extends React.ElementType = "div">({
  as,
  className,
  ...props
}: MaxWidthWrapperProps<T>) {
  const Component = as ?? "div";

  return (
    <Component
      className={cn("mx-auto w-full", APP_CONTENT_MAX_WIDTH, className)}
      {...props}
    />
  );
}
