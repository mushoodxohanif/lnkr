"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";

import { TextInput } from "@/components/settings/form-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type TagInputProps = {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export function TagInput({
  label,
  hint,
  values,
  onChange,
  placeholder = "Type and press Enter",
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addValues(rawSegments: string[]) {
    const nextValues = [...values];
    let changed = false;

    for (const raw of rawSegments) {
      const next = raw.trim();
      if (!next) continue;
      if (
        nextValues.some((value) => value.toLowerCase() === next.toLowerCase())
      ) {
        continue;
      }
      nextValues.push(next);
      changed = true;
    }

    if (changed) {
      onChange(nextValues);
    }
    setDraft("");
  }

  function addValue(raw: string) {
    addValues([raw]);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!/[,\n]/.test(text)) return;

    event.preventDefault();
    addValues(text.split(/[,\n]+/));
  }

  function removeValue(valueToRemove: string) {
    onChange(values.filter((value) => value !== valueToRemove));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <Badge key={value} variant="secondary">
              {value}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeValue(value)}
                aria-label={`Remove ${value}`}
                className="size-4 rounded-full hover:bg-muted"
              >
                <XIcon />
              </Button>
            </Badge>
          ))}
        </div>
      ) : null}
      <TextInput
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addValue(draft);
          }
        }}
        onPaste={handlePaste}
        onBlur={() => addValue(draft)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
