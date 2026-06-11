"use client";

import { useActionState, useState } from "react";
import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/settings/form-primitives";
import { TagInput } from "@/components/settings/tag-input";
import { saveUserProfile } from "@/lib/settings/actions";
import type { CaseStudy, UserProfileData } from "@/lib/settings/types";

type CaseStudyEntry = CaseStudy & { key: string };

function createCaseStudyKey(): string {
  return `case-study-${crypto.randomUUID()}`;
}

function toCaseStudyEntries(studies: CaseStudy[]): CaseStudyEntry[] {
  return studies.map((study) => ({
    ...study,
    key: createCaseStudyKey(),
  }));
}

const initialState = { success: false, message: "" };

const EMPTY_PROFILE: UserProfileData = {
  productName: "",
  valueProps: [],
  targetIndustries: [],
  targetPersonas: [],
  caseStudies: [],
  pricingTierHints: "",
};

type ProductFormProps = {
  initialData: UserProfileData | null;
};

export function ProductForm({ initialData }: ProductFormProps) {
  const [state, formAction, pending] = useActionState(
    saveUserProfile,
    initialState,
  );
  const data = initialData ?? EMPTY_PROFILE;

  return (
    <form action={formAction} className="space-y-6">
      {data.id ? <input type="hidden" name="id" value={data.id} /> : null}

      <FormSection
        title="SaaS identity"
        description="Core product details the agent uses when scoring leads and drafting outreach."
      >
        <Field
          label="Product name"
          hint="How you refer to your product in outreach."
        >
          <TextInput
            name="productName"
            defaultValue={data.productName}
            placeholder="Acme API Monitor"
            required
          />
        </Field>

        <Field
          label="Pricing tier hints"
          hint="Optional context on plans or deal size (e.g. mid-market, usage-based)."
        >
          <TextArea
            name="pricingTierHints"
            defaultValue={data.pricingTierHints}
            rows={3}
            placeholder="Teams on Pro ($499/mo) when they cross 100K API calls/day..."
          />
        </Field>
      </FormSection>

      <FormSection
        title="Positioning"
        description="Value props and personas shape fit scoring and connection notes."
      >
        <ProductTagFields initialData={data} />
      </FormSection>

      <FormSection
        title="Case studies"
        description="Short proof points the agent can reference when personalizing outreach."
      >
        <CaseStudyFields initialStudies={data.caseStudies} />
      </FormSection>

      <FormMessage state={state} />
      <SubmitButton label="Save product profile" pending={pending} />
    </form>
  );
}

function ProductTagFields({ initialData }: { initialData: UserProfileData }) {
  const [valueProps, setValueProps] = useStateArray(initialData.valueProps);
  const [targetIndustries, setTargetIndustries] = useStateArray(
    initialData.targetIndustries,
  );
  const [targetPersonas, setTargetPersonas] = useStateArray(
    initialData.targetPersonas,
  );

  return (
    <>
      <input
        type="hidden"
        name="valueProps"
        value={JSON.stringify(valueProps)}
      />
      <input
        type="hidden"
        name="targetIndustries"
        value={JSON.stringify(targetIndustries)}
      />
      <input
        type="hidden"
        name="targetPersonas"
        value={JSON.stringify(targetPersonas)}
      />

      <TagInput
        label="Value propositions"
        hint="Add 3–5 specific outcomes your product delivers."
        values={valueProps}
        onChange={setValueProps}
        placeholder="e.g. Cut API incident response time by 60%"
      />
      <TagInput
        label="Target industries"
        values={targetIndustries}
        onChange={setTargetIndustries}
        placeholder="e.g. Fintech"
      />
      <TagInput
        label="Target personas"
        values={targetPersonas}
        onChange={setTargetPersonas}
        placeholder="e.g. VP Engineering at Series B SaaS"
      />
    </>
  );
}

function CaseStudyFields({ initialStudies }: { initialStudies: CaseStudy[] }) {
  const [caseStudies, setCaseStudies] = useState<CaseStudyEntry[]>(() =>
    toCaseStudyEntries(initialStudies),
  );

  function updateStudy(key: string, field: keyof CaseStudy, value: string) {
    setCaseStudies(
      caseStudies.map((study) =>
        study.key === key ? { ...study, [field]: value } : study,
      ),
    );
  }

  function addStudy() {
    setCaseStudies([
      ...caseStudies,
      { key: createCaseStudyKey(), title: "", summary: "" },
    ]);
  }

  function removeStudy(key: string) {
    setCaseStudies(caseStudies.filter((study) => study.key !== key));
  }

  return (
    <>
      <input
        type="hidden"
        name="caseStudies"
        value={JSON.stringify(
          caseStudies.map(({ title, summary }) => ({ title, summary })),
        )}
      />
      <div className="space-y-4">
        {caseStudies.map((study) => (
          <div
            key={study.key}
            className="rounded-lg border border-zinc-200 p-4 space-y-3"
          >
            <Field label="Title">
              <TextInput
                value={study.title}
                onChange={(event) =>
                  updateStudy(study.key, "title", event.target.value)
                }
                placeholder="Series B fintech reduced MTTR by 45%"
              />
            </Field>
            <Field label="Summary">
              <TextArea
                value={study.summary}
                onChange={(event) =>
                  updateStudy(study.key, "summary", event.target.value)
                }
                rows={3}
                placeholder="What they did, what changed, and the measurable outcome."
              />
            </Field>
            <button
              type="button"
              onClick={() => removeStudy(study.key)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Remove case study
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addStudy}
        className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
      >
        + Add case study
      </button>
    </>
  );
}

function useStateArray<T>(initial: T[]) {
  const [values, setValues] = useState(initial);
  return [values, setValues] as const;
}
