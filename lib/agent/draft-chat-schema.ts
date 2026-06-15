import { z } from "zod";

import { CONNECTION_NOTE_MAX_CHARS } from "@/lib/agent/config";

export const draftChatResponseSchema = z.object({
  message: z
    .string()
    .min(1)
    .max(2000)
    .describe(
      "Brief conversational reply explaining what you changed or answering the user",
    ),
  warmingComment: z
    .string()
    .nullable()
    .describe(
      "Updated warming comment draft, or null if no recent post to comment on",
    ),
  connectionNote: z
    .string()
    .min(20)
    .max(CONNECTION_NOTE_MAX_CHARS)
    .describe(
      `Updated connection note draft, max ${CONNECTION_NOTE_MAX_CHARS} characters`,
    ),
});

export type DraftChatResponse = z.infer<typeof draftChatResponseSchema>;
