"use client";

import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return <Input className={cn(className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  return <Textarea className={cn(className)} {...props} />;
}

export function SubmitButton({
  label,
  pending,
}: {
  label: string;
  pending: boolean;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function FormMessage({
  state,
}: {
  state: { success: boolean; message: string };
}) {
  if (!state.message) return null;

  return (
    <Alert
      variant={state.success ? "default" : "destructive"}
      className={cn(
        state.success &&
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
      )}
      role="status"
    >
      <AlertDescription
        className={cn(
          state.success &&
            "text-emerald-800 dark:text-emerald-200 [&_p]:text-emerald-800 dark:[&_p]:text-emerald-200",
        )}
      >
        {state.message}
      </AlertDescription>
    </Alert>
  );
}
