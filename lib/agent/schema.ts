import { z } from "zod";

import { CONNECTION_NOTE_MAX_CHARS } from "@/lib/agent/config";

export const warmingCommentSchema = z.object({
  comment: z
    .string()
    .min(20)
    .max(600)
    .describe("2-3 sentence genuine comment with no pitch or links"),
  referenced_detail: z
    .string()
    .min(5)
    .max(200)
    .describe("Specific detail from the post that the comment references"),
});

export const connectionNoteSchema = z.object({
  connection_note: z
    .string()
    .min(20)
    .max(CONNECTION_NOTE_MAX_CHARS)
    .describe(
      `Personalized connection request note, max ${CONNECTION_NOTE_MAX_CHARS} characters`,
    ),
  personalization_hooks: z
    .array(z.string().min(5).max(150))
    .min(2)
    .max(4)
    .describe("Specific facts used to personalize the note"),
  insight_hook: z
    .string()
    .min(10)
    .max(120)
    .describe(
      "Single industry insight or hidden bottleneck referenced in the note",
    ),
});

export type WarmingCommentOutput = z.infer<typeof warmingCommentSchema>;
export type ConnectionNoteOutput = z.infer<typeof connectionNoteSchema>;
