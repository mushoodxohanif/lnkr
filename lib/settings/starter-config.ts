import type { PromptTemplateKey } from "@/lib/prompts/types";
import type {
  CaseStudy,
  ExclusionRules,
  ICPCriteriaData,
  UserProfileData,
} from "@/lib/settings/types";
import { DEFAULT_ICP_WEIGHTS } from "@/lib/settings/types";

/** Example product profile aligned with fitness/gym AI automation outreach. */
export const STARTER_PRODUCT: Omit<UserProfileData, "id"> = {
  productName: "AI Automation",
  valueProps: [
    "Automate complex business workflows with collaborative AI agents",
    "Integrate OpenAI, Gemini, and Claude into existing systems at scale",
    "Deploy AI voice agents for 24/7 lead qualification and appointment booking",
  ],
  targetIndustries: [
    "Fitness",
    "Gyms",
    "Health & Wellness",
    "Physical Therapy",
    "Spa",
    "E-commerce",
    "Logistics",
    "EdTech",
    "Event Management",
  ],
  targetPersonas: [
    "Owner",
    "Founder",
    "Director",
    "President",
    "Studio Manager",
    "Gym Owner",
  ],
  caseStudies: [
    {
      title: "Boutique gym cut missed calls 40% with AI receptionist",
      summary:
        "A 2-location gym replaced after-hours phone tag with an AI voice agent that books intros and answers membership FAQs. Front desk saves ~6 hours/week.",
    },
    {
      title: "PT clinic automated intake without hiring",
      summary:
        "A physical therapy practice integrated LLM workflows into patient intake so common questions are handled before staff review. Same-day callback rate improved.",
    },
  ],
  pricingTierHints:
    "Custom AI projects $55–80/hr (agentic flows, LLM integration, voice automation)",
};

/** Core ICP — keep company size and tech stack empty until enrichment data is reliable. */
export const STARTER_ICP_CORE: Pick<
  ICPCriteriaData,
  "titles" | "industries" | "fitThreshold" | "geo"
> = {
  titles: [
    "Owner",
    "Founder",
    "Director",
    "President",
    "Principal",
    "Manager",
    "Partner",
  ],
  industries: [],
  fitThreshold: 45,
  geo: ["United States"],
};

/** Advanced ICP examples — apply when you have enrichment data or stricter filtering. */
export const STARTER_ICP_ADVANCED_EXAMPLES = {
  seniorityLevels: [
    "Owner",
    "Founder",
    "President",
    "Principal",
    "Director",
    "Partner",
  ],
  companySizeMin: 1,
  companySizeMax: 250,
  techStack: [
    "Mindbody",
    "Zen Planner",
    "Gymdesk",
    "Stripe",
    "HubSpot",
    "Google Calendar",
  ],
  exclusionRules: {
    competitors: [],
    titles: ["Intern", "Student", "Contractor"],
    industries: ["Staffing", "Recruiting"],
    agencies: true,
  } satisfies ExclusionRules,
  weights: { ...DEFAULT_ICP_WEIGHTS },
};

export const STARTER_PROMPT_INSTRUCTIONS: Record<PromptTemplateKey, string> = {
  icp_scoring: `Focus on fitness, gym, wellness, rehab, and spa operators in the United States.
Prioritize decision-makers who likely feel operational pain: missed calls, manual member follow-up, front-desk overload, and scheduling friction.
Do not inflate fit for staffing agencies, recruiters, or pure consultants.
Ground pain points in their company name, headline, and industry — do not invent funding or tech stack facts when enrichment is missing.`,
  warming_comment: `Write as a peer operator in fitness or wellness — not a vendor.
Reference one specific detail from their post and ask one genuine follow-up question.
Never mention AI, automation, your product, or booking a call.
Keep it to 2–3 sentences; no generic praise like "Great post!"`,
  connection_note: `Write as a peer founder in fitness/wellness or adjacent B2B ops — never a vendor or marketer.
Observe something real: their company, a recent post, hiring, or growth signal.
Add one insight about hidden scaling friction (missed inquiries, manual admin, after-hours coverage, member follow-up gaps).
End with a curiosity question — no CTA, no pitch, no mention of AI or your services.
Stay under 300 characters. No "hope you're doing well", no links, no buzzwords.`,
};

export const STARTER_CASE_STUDIES: CaseStudy[] = STARTER_PRODUCT.caseStudies;
