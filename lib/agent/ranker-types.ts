import type { TimingSignal } from "@/app/generated/prisma/client";

export type RankedLeadCandidate = {
  leadId: string;
  leadScoreId: string;
  companyKey: string;
  fitPercent: number;
  timingSignal: TimingSignal;
  rankScore: number;
};

export type DailyRankerResult = {
  status: "completed" | "skipped" | "error";
  batchId?: string;
  batchDate: string;
  candidateCount: number;
  selectedCount: number;
  enrichmentsRefreshed: number;
  rescored: number;
  contentGenerated?: number;
  contentSkipped?: number;
  contentErrors?: number;
  message?: string;
  runMetadata?: Record<string, unknown>;
};
