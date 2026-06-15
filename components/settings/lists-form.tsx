"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
  TextInput,
} from "@/components/settings/form-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  deleteSnList,
  exportSnListCsvAction,
  saveSnList,
  toggleSnList,
} from "@/lib/settings/actions";
import type { SnListData } from "@/lib/settings/types";
import { cn } from "@/lib/utils";

const initialState = { success: false, message: "" };

type ListsFormProps = {
  lists: SnListData[];
};

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ListCsvDownloadButton({
  listId,
  listName,
  leadCount,
  disabled,
}: {
  listId: string;
  listName: string;
  leadCount: number;
  disabled?: boolean;
}) {
  const [exportPending, startExport] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);

  function handleExport() {
    startExport(async () => {
      setExportError(null);
      try {
        const { csv, filename } = await exportSnListCsvAction(listId);
        downloadCsv(csv, filename);
      } catch {
        setExportError("Download failed. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || exportPending || leadCount === 0}
        onClick={handleExport}
        title={
          leadCount === 0
            ? "Sync this list first to download leads."
            : `Download ${leadCount} synced leads from ${listName} as CSV`
        }
      >
        {exportPending ? "Downloading…" : "Download CSV"}
      </Button>
      {exportError ? (
        <p className="text-xs text-destructive">{exportError}</p>
      ) : null}
    </div>
  );
}

export function ListsForm({ lists }: ListsFormProps) {
  const [saveState, saveAction, savePending] = useActionState(
    saveSnList,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSnList,
    initialState,
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleSnList,
    initialState,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);

  const editingList = lists.find((list) => list.id === editingId);
  const statusMessage =
    saveState.message || deleteState.message || toggleState.message;
  const statusSuccess =
    saveState.success || deleteState.success || toggleState.success;
  const anyPending = savePending || deletePending || togglePending;

  useEffect(() => {
    setEnabled(editingList?.enabled ?? true);
  }, [editingList]);

  return (
    <div className="space-y-6">
      <FormSection
        title="Saved Sales Navigator lists"
        description="Paste a saved people list URL from Sales Navigator. No LinkedIn sign-in is required to add lists here — sign in locally only when you run sync."
      >
        {lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No lists configured yet. Add your first Sales Navigator list below.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {lists.map((list) => (
              <li
                key={list.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{list.name}</p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        list.enabled
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : undefined,
                      )}
                    >
                      {list.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <a
                    href={list.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-sm text-muted-foreground hover:text-foreground"
                  >
                    {list.url}
                  </a>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {list.lastSyncedAt
                      ? `Last synced ${list.lastSyncedAt.toLocaleString()}`
                      : "Never synced"}
                    {list.leadCount > 0
                      ? ` · ${list.leadCount} lead${list.leadCount === 1 ? "" : "s"} in database`
                      : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ListCsvDownloadButton
                    listId={list.id}
                    listName={list.name}
                    leadCount={list.leadCount}
                    disabled={anyPending}
                  />
                  <form action={toggleAction}>
                    <input type="hidden" name="id" value={list.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={String(!list.enabled)}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={togglePending}
                    >
                      {list.enabled ? "Disable" : "Enable"}
                    </Button>
                  </form>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(list.id)}
                  >
                    Edit
                  </Button>
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={list.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={deletePending}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <FormSection
        title={editingList ? "Edit list" : "Add list"}
        description="URL must be a Sales Navigator saved people list."
      >
        <form action={saveAction} className="space-y-4">
          {editingList ? (
            <input type="hidden" name="id" value={editingList.id} />
          ) : null}
          <input type="hidden" name="enabled" value={String(enabled)} />
          <Field label="List name" hint="Label for your reference only.">
            <TextInput
              name="name"
              key={`name-${editingId ?? "new"}`}
              defaultValue={editingList?.name ?? ""}
              placeholder="Series B fintech leads"
              required
            />
          </Field>
          <Field
            label="Sales Navigator list URL"
            hint="Open your list in Sales Navigator and copy the browser URL (must contain /sales/lists/people/)."
          >
            <TextInput
              name="url"
              key={`url-${editingId ?? "new"}`}
              defaultValue={editingList?.url ?? ""}
              placeholder="https://www.linkedin.com/sales/lists/people/..."
              required
            />
          </Field>
          <div className="flex items-center gap-3">
            <Checkbox
              id="list-enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked === true)}
            />
            <Label htmlFor="list-enabled" className="font-normal">
              Enable for sync
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton
              label={editingList ? "Update list" : "Add list"}
              pending={savePending}
            />
            {editingList ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingId(null)}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </FormSection>

      {statusMessage ? (
        <FormMessage
          state={{ success: statusSuccess, message: statusMessage }}
        />
      ) : null}
      {anyPending ? (
        <p className="text-xs text-muted-foreground">Updating lists...</p>
      ) : null}
    </div>
  );
}
