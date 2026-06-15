"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CopyButton } from "@/components/dashboard/copy-button";
import { DraftBlock } from "@/components/dashboard/draft-block";
import { MarkdownContent } from "@/components/markdown-content";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { CONNECTION_NOTE_MAX_CHARS } from "@/lib/agent/config";
import type {
  DraftChatMessageView,
  DraftChatState,
} from "@/lib/agent/draft-chat";
import { cn } from "@/lib/utils";

type DraftChatDialogProps = {
  leadId: string;
  leadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftsUpdated?: (drafts: {
    warmingComment: string | null;
    connectionNote: string | null;
  }) => void;
};

function DraftPreview({
  label,
  value,
  charLimit,
}: {
  label: string;
  value: string | null;
  charLimit?: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {charLimit ? (
            <span
              className={cn(
                "ml-2 tabular-nums normal-case",
                (value?.length ?? 0) > charLimit
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {value?.length ?? 0}/{charLimit}
            </span>
          ) : null}
        </p>
        <CopyButton text={value ?? ""} />
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
        {value ?? (
          <span className="text-muted-foreground italic">Not available</span>
        )}
      </p>
    </div>
  );
}

function ChatMessage({ message }: { message: DraftChatMessageView }) {
  const isUser = message.role === "USER";

  return (
    <div
      className={cn(
        "max-w-[92%] rounded-lg px-3 py-2 text-sm leading-6",
        isUser
          ? "ml-auto bg-primary text-primary-foreground"
          : "bg-muted text-foreground",
      )}
    >
      {isUser ? (
        <p className="whitespace-pre-wrap">{message.content}</p>
      ) : (
        <MarkdownContent content={message.content} />
      )}
    </div>
  );
}

export function DraftChatDialog({
  leadId,
  leadName,
  open,
  onOpenChange,
  onDraftsUpdated,
}: DraftChatDialogProps) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [state, setState] = useState<DraftChatState | null>(null);
  const [input, setInput] = useState("");
  const [initializing, setInitializing] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const onDraftsUpdatedRef = useRef(onDraftsUpdated);
  const loadStartedRef = useRef(false);

  onDraftsUpdatedRef.current = onDraftsUpdated;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!open) {
      loadStartedRef.current = false;
      return;
    }

    if (loadStartedRef.current) {
      return;
    }

    loadStartedRef.current = true;
    let cancelled = false;

    async function loadChat() {
      setInitializing(true);

      try {
        const response = await fetch(`/api/leads/${leadId}/draft-chat`);
        const data = (await response.json()) as DraftChatState;

        if (cancelled) return;

        setState(data);
        onDraftsUpdatedRef.current?.({
          warmingComment: data.warmingComment,
          connectionNote: data.connectionNote,
        });
      } catch {
        if (!cancelled) {
          setState({
            chatId: "",
            warmingComment: null,
            connectionNote: null,
            messages: [],
            error: "Could not load draft chat.",
          });
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    void loadChat();

    return () => {
      cancelled = true;
    };
  }, [leadId, open]);

  useEffect(() => {
    if (open && state?.messages.length) {
      scrollToBottom();
    }
  }, [open, scrollToBottom, state?.messages.length]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending || initializing) {
      return;
    }

    setSending(true);
    setInput("");

    const optimisticUserMessage: DraftChatMessageView = {
      id: `optimistic-${Date.now()}`,
      role: "USER",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setState((current) =>
      current
        ? {
            ...current,
            messages: [...current.messages, optimisticUserMessage],
          }
        : current,
    );

    try {
      const response = await fetch(`/api/leads/${leadId}/draft-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await response.json()) as DraftChatState;
      setState(data);
      onDraftsUpdatedRef.current?.({
        warmingComment: data.warmingComment,
        connectionNote: data.connectionNote,
      });

      if (!data.error) {
        startRefresh(() => {
          router.refresh();
        });
      }
    } catch {
      setState((current) =>
        current
          ? {
              ...current,
              error: "Could not send message. Try again.",
            }
          : current,
      );
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void handleSend();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,820px)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle>Draft assistant — {leadName}</DialogTitle>
          <DialogDescription>
            Generates warming comments and connection notes. Chat to refine the
            drafts — every message is saved.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="flex min-h-0 flex-col border-b lg:border-r lg:border-b-0">
            <div className="border-b px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Current drafts
              </p>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-3 p-4">
                {initializing ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2Icon className="size-4 animate-spin" />
                    Generating drafts…
                  </div>
                ) : (
                  <>
                    <DraftPreview
                      label="Warming comment"
                      value={state?.warmingComment ?? null}
                    />
                    <DraftPreview
                      label="Connection note"
                      value={state?.connectionNote ?? null}
                      charLimit={CONNECTION_NOTE_MAX_CHARS}
                    />
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex min-h-0 flex-col">
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-3 p-4">
                {initializing ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    Creating your first drafts…
                  </div>
                ) : state?.messages.length ? (
                  state.messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Drafts will appear here once generation finishes.
                  </p>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {state?.error ? (
              <Alert variant="destructive" className="mx-4 mb-2">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="border-t bg-muted/30 p-4">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Make the connection note shorter, more casual, mention their post…"
                  rows={2}
                  disabled={initializing || sending || Boolean(state?.error)}
                  className="min-h-0 resize-none"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={
                    initializing ||
                    sending ||
                    !input.trim() ||
                    Boolean(state?.error)
                  }
                  className="shrink-0 self-end"
                >
                  {sending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type OutreachDraftsProps = {
  leadId: string;
  leadName: string;
  warmingComment: string | null;
  connectionNote: string | null;
  showGenerateButton?: boolean;
};

export function OutreachDrafts({
  leadId,
  leadName,
  warmingComment: initialWarmingComment,
  connectionNote: initialConnectionNote,
  showGenerateButton = true,
}: OutreachDraftsProps) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [open, setOpen] = useState(false);
  const [warmingComment, setWarmingComment] = useState(initialWarmingComment);
  const [connectionNote, setConnectionNote] = useState(initialConnectionNote);

  useEffect(() => {
    setWarmingComment(initialWarmingComment);
    setConnectionNote(initialConnectionNote);
  }, [initialConnectionNote, initialWarmingComment]);

  const handleDraftsUpdated = useCallback(
    (drafts: {
      warmingComment: string | null;
      connectionNote: string | null;
    }) => {
      setWarmingComment(drafts.warmingComment);
      setConnectionNote(drafts.connectionNote);
    },
    [],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        startRefresh(() => {
          router.refresh();
        });
      }
    },
    [router],
  );

  const missingDrafts = !connectionNote;

  return (
    <div className="space-y-4">
      {showGenerateButton ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {missingDrafts
              ? "Drafts were not generated for this lead yet."
              : "Need a different angle? Open the assistant to refine."}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenChange(true)}
          >
            <SparklesIcon className="size-4" />
            {missingDrafts ? "Generate drafts" : "Refine drafts"}
          </Button>
        </div>
      ) : null}

      <DraftBlock
        warmingComment={warmingComment}
        connectionNote={connectionNote}
      />

      <DraftChatDialog
        leadId={leadId}
        leadName={leadName}
        open={open}
        onOpenChange={handleOpenChange}
        onDraftsUpdated={handleDraftsUpdated}
      />
    </div>
  );
}
