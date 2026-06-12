"use client";

import { useActionState, useState } from "react";
import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
  TextInput,
} from "@/components/settings/form-primitives";
import { deleteSnList, saveSnList, toggleSnList } from "@/lib/settings/actions";
import type { SnListData } from "@/lib/settings/types";

const initialState = { success: false, message: "" };

type ListsFormProps = {
  lists: SnListData[];
};

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

  const editingList = lists.find((list) => list.id === editingId);
  const statusMessage =
    saveState.message || deleteState.message || toggleState.message;
  const statusSuccess =
    saveState.success || deleteState.success || toggleState.success;
  const anyPending = savePending || deletePending || togglePending;

  return (
    <div className="space-y-6">
      <FormSection
        title="Saved Sales Navigator lists"
        description="Paste a saved people list URL from Sales Navigator. Enable lists you want to sync."
      >
        {lists.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No lists configured yet. Add your first Sales Navigator list below.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {lists.map((list) => (
              <li
                key={list.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-900">{list.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        list.enabled
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {list.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <a
                    href={list.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-sm text-zinc-500 hover:text-zinc-800"
                  >
                    {list.url}
                  </a>
                  <p className="mt-1 text-xs text-zinc-400">
                    {list.lastSyncedAt
                      ? `Last synced ${list.lastSyncedAt.toLocaleString()}`
                      : "Never synced"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={toggleAction}>
                    <input type="hidden" name="id" value={list.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={String(!list.enabled)}
                    />
                    <button
                      type="submit"
                      disabled={togglePending}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      {list.enabled ? "Disable" : "Enable"}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setEditingId(list.id)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Edit
                  </button>
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={list.id} />
                    <button
                      type="submit"
                      disabled={deletePending}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
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
          <label className="flex items-center gap-3 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="enabled"
              value="true"
              defaultChecked={editingList?.enabled ?? true}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Enable for sync
          </label>
          <div className="flex items-center gap-3">
            <SubmitButton
              label={editingList ? "Update list" : "Add list"}
              pending={savePending}
            />
            {editingList ? (
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Cancel edit
              </button>
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
        <p className="text-xs text-zinc-400">Updating lists...</p>
      ) : null}
    </div>
  );
}
