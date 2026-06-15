"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLead } from "@/lib/dashboard/actions";
import type { FinalizedLeadRow } from "@/lib/dashboard/finalized-leads-shared";

type LeadEditDialogProps = {
  lead: FinalizedLeadRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (message: string) => void;
};

export function LeadEditDialog({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: LeadEditDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(lead.name);
  const [title, setTitle] = useState(lead.title ?? "");
  const [company, setCompany] = useState(lead.company ?? "");
  const [location, setLocation] = useState(lead.location ?? "");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateLead(lead.id, {
        name,
        title,
        company,
        location,
      });

      if (result.success) {
        onSuccess?.(result.message);
        onOpenChange(false);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
          <DialogDescription>
            Update profile fields for {lead.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company">Company</Label>
            <Input
              id="edit-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
