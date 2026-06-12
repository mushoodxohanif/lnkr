import { normalizeTagList } from "@/lib/settings/normalize-tags";
import type { ICPCriteriaData, UserProfileData } from "@/lib/settings/types";

/** Merge product profile into ICP so users configure targeting once. */
export function getEffectiveICP(
  icp: ICPCriteriaData,
  product: UserProfileData | null,
): ICPCriteriaData {
  const productIndustries = product?.targetIndustries ?? [];
  const productPersonas = product?.targetPersonas ?? [];

  const titles =
    icp.titles.length > 0
      ? normalizeTagList(icp.titles)
      : normalizeTagList(productPersonas);

  const industries =
    icp.industries.length > 0
      ? normalizeTagList(icp.industries)
      : normalizeTagList(productIndustries);

  return {
    ...icp,
    titles,
    industries,
    weights: { ...icp.weights },
  };
}
