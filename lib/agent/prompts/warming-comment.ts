import { formatProductContext } from "@/lib/agent/prompts/shared";
import type { ContentContext } from "@/lib/agent/types";

function formatTargetPost(context: ContentContext): string {
  const post = context.recentPosts[0];
  if (!post) {
    return "No recent posts available.";
  }

  const postedAt = post.postedAt ? ` (posted ${post.postedAt})` : "";
  return `Post${postedAt}:\n${post.text}`;
}

export function buildWarmingCommentPrompt(context: ContentContext): string {
  const { lead, score } = context;

  const fitReasons = (score.fitReasons as string[]).join("\n- ");

  return `You write authentic LinkedIn comments for B2B SaaS founders doing thoughtful outbound. Your comments warm up a prospect before a connection request — never pitch, never sell.

## Your product (context only — do NOT mention it in the comment)
${formatProductContext(context)}

## Lead
- Name: ${lead.name}
- Title: ${lead.title ?? "unknown"}
- Company: ${lead.company ?? "unknown"}
- Headline: ${lead.headline ?? "unknown"}

## Why they are a fit (for your tone calibration — do not reference directly)
- ${fitReasons || "General ICP match"}

## Their recent LinkedIn post to comment on
${formatTargetPost(context)}

## Rules (strict)
1. Write exactly 2-3 sentences — genuine, conversational, peer-to-peer
2. Reference ONE specific detail from their post (a claim, metric, lesson, or question they raised)
3. Add a thoughtful follow-up question that invites reply
4. NO product mentions, NO links, NO "I'd love to connect", NO "reach out", NO emojis spam
5. NO generic praise ("Great post!", "Love this!") without substance
6. Sound like a knowledgeable operator in their space, not a salesperson
7. Use their first name naturally if it reads well

Return structured JSON with:
- comment: the final comment text
- referenced_detail: the specific post detail you referenced`;
}
