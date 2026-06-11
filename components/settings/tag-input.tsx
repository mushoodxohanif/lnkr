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

  function addValue(raw: string) {
    const next = raw.trim();
    if (!next) return;
    if (values.some((value) => value.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, next]);
    setDraft("");
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
        onBlur={() => addValue(draft)}
      />
      {hint ? (
        <span className="block text-xs text-zinc-500">{hint}</span>
      ) : null}
    </div>
  );
}
