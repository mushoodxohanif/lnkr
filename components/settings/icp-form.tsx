"use client";

import { useActionState, useState } from "react";
import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
  TextInput,
} from "@/components/settings/form-primitives";
import { TagInput } from "@/components/settings/tag-input";
import { saveICPCriteria } from "@/lib/settings/actions";
import {
  DEFAULT_ICP_WEIGHTS,
  type ExclusionRules,
  type ICPCriteriaData,
  type ICPWeights,
} from "@/lib/settings/types";

const initialState = { success: false, message: "" };

const EMPTY_ICP: ICPCriteriaData = {
  titles: [],
  seniorityLevels: [],
  companySizeMin: 50,
  companySizeMax: 2000,
  industries: [],
  techStack: [],
  geo: [],
  exclusionRules: {},
  weights: { ...DEFAULT_ICP_WEIGHTS },
  fitThreshold: 60,
};

type ICPFormProps = {
  initialData: ICPCriteriaData | null;
};

export function ICPForm({ initialData }: ICPFormProps) {
  const [state, formAction, pending] = useActionState(
    saveICPCriteria,
    initialState,
  );
  const data = initialData ?? EMPTY_ICP;

  const [titles, setTitles] = useState(data.titles);
  const [seniorityLevels, setSeniorityLevels] = useState(data.seniorityLevels);
  const [industries, setIndustries] = useState(data.industries);
  const [techStack, setTechStack] = useState(data.techStack);
  const [geo, setGeo] = useState(data.geo);
  const [exclusionRules, setExclusionRules] = useState<ExclusionRules>(
    data.exclusionRules,
  );
  const [weights, setWeights] = useState<ICPWeights>({
    ...DEFAULT_ICP_WEIGHTS,
    ...data.weights,
  });

  return (
    <form action={formAction} className="space-y-6">
      {data.id ? <input type="hidden" name="id" value={data.id} /> : null}
      <input type="hidden" name="titles" value={JSON.stringify(titles)} />
      <input
        type="hidden"
        name="seniorityLevels"
        value={JSON.stringify(seniorityLevels)}
      />
      <input
        type="hidden"
        name="industries"
        value={JSON.stringify(industries)}
      />
      <input type="hidden" name="techStack" value={JSON.stringify(techStack)} />
      <input type="hidden" name="geo" value={JSON.stringify(geo)} />
      <input
        type="hidden"
        name="exclusionRules"
        value={JSON.stringify(exclusionRules)}
      />
      <input type="hidden" name="weights" value={JSON.stringify(weights)} />

      <FormSection
        title="Target profile"
        description="Rule-based scoring checks leads against these dimensions first."
      >
        <TagInput
          label="Target titles"
          hint="Decision-maker titles that indicate a strong fit."
          values={titles}
          onChange={setTitles}
          placeholder="e.g. VP Engineering"
        />
        <TagInput
          label="Seniority levels"
          values={seniorityLevels}
          onChange={setSeniorityLevels}
          placeholder="e.g. Director, VP, C-level"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Min company size (employees)">
            <TextInput
              name="companySizeMin"
              type="number"
              min={1}
              defaultValue={data.companySizeMin ?? ""}
              placeholder="50"
            />
          </Field>
          <Field label="Max company size (employees)">
            <TextInput
              name="companySizeMax"
              type="number"
              min={1}
              defaultValue={data.companySizeMax ?? ""}
              placeholder="2000"
            />
          </Field>
        </div>
        <TagInput
          label="Industries"
          values={industries}
          onChange={setIndustries}
          placeholder="e.g. Fintech"
        />
        <TagInput
          label="Tech stack signals"
          hint="Technologies that indicate product-market fit."
          values={techStack}
          onChange={setTechStack}
          placeholder="e.g. Stripe, Kubernetes"
        />
        <TagInput
          label="Geography"
          values={geo}
          onChange={setGeo}
          placeholder="e.g. United States, UK"
        />
      </FormSection>

      <FormSection
        title="Exclusion rules"
        description="Leads matching these rules are penalized or filtered out."
      >
        <TagInput
          label="Competitors"
          values={exclusionRules.competitors ?? []}
          onChange={(values) =>
            setExclusionRules({ ...exclusionRules, competitors: values })
          }
          placeholder="e.g. Datadog"
        />
        <TagInput
          label="Excluded titles"
          values={exclusionRules.titles ?? []}
          onChange={(values) =>
            setExclusionRules({ ...exclusionRules, titles: values })
          }
          placeholder="e.g. Intern, Recruiter"
        />
        <TagInput
          label="Excluded industries"
          values={exclusionRules.industries ?? []}
          onChange={(values) =>
            setExclusionRules({ ...exclusionRules, industries: values })
          }
          placeholder="e.g. Staffing & Recruiting"
        />
        <label className="flex items-center gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={exclusionRules.agencies ?? false}
            onChange={(event) =>
              setExclusionRules({
                ...exclusionRules,
                agencies: event.target.checked,
              })
            }
            className="h-4 w-4 rounded border-zinc-300"
          />
          Exclude agencies and consultancies
        </label>
      </FormSection>

      <FormSection
        title="Scoring weights"
        description="Relative importance of each dimension in the hybrid rule + LLM score."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(DEFAULT_ICP_WEIGHTS) as (keyof ICPWeights)[]).map(
            (key) => (
              <Field key={key} label={formatWeightLabel(key)}>
                <TextInput
                  type="number"
                  min={0}
                  max={100}
                  value={weights[key] ?? DEFAULT_ICP_WEIGHTS[key]}
                  onChange={(event) =>
                    setWeights({
                      ...weights,
                      [key]: Number(event.target.value),
                    })
                  }
                />
              </Field>
            ),
          )}
        </div>
        <Field
          label="Minimum fit threshold (%)"
          hint="Leads below this score are archived and not shown in daily batches."
        >
          <TextInput
            name="fitThreshold"
            type="number"
            min={0}
            max={100}
            defaultValue={data.fitThreshold}
          />
        </Field>
      </FormSection>

      <FormMessage state={state} />
      <SubmitButton label="Save ICP criteria" pending={pending} />
    </form>
  );
}

function formatWeightLabel(key: keyof ICPWeights): string {
  const labels: Record<keyof ICPWeights, string> = {
    title: "Title match",
    company: "Company size",
    industry: "Industry",
    geo: "Geography",
    techStack: "Tech stack",
    signals: "Intent signals",
  };
  return labels[key];
}
