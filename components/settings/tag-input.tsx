"use client";

import { useState } from "react";
import { TextInput } from "@/components/settings/form-primitives";

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

  function removeValue(index: number) {
    onChange(values.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800"
          >
            {value}
            <button
              type="button"
              onClick={() => removeValue(values.indexOf(value))}
              className="rounded-full px-1 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800"
              aria-label={`Remove ${value}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
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
      {hint ? (
        <span className="block text-xs text-zinc-500">{hint}</span>
      ) : null}
    </div>
  );
}
