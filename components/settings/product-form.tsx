"use client";

import { ChevronDownIcon } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

      <Alert className="border-primary/20 bg-primary/5">
        <AlertTitle>Minimum setup</AlertTitle>
        <AlertDescription>
          Product name + at least one value proposition. Industries and personas
          feed ICP scoring when ICP fields are left empty. See the&nbsp;
          <a href="/help" className="font-medium text-foreground underline">
            setup guide
          </a>
          &nbsp; for a full walkthrough.
        </AlertDescription>
      </Alert>

      <FormSection
        title="SaaS identity"
        description="Core product details used when scoring leads and drafting outreach."
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
        description="One tag per item — press Enter or paste comma-separated lists."
      >
        <ProductTagFields initialData={data} />
      </FormSection>

      <Collapsible className="rounded-xl border border-border bg-card shadow-sm p-4">
        <CardHeader className="pb-0">
          <CollapsibleTrigger className="group flex w-full items-center justify-between text-left">
            <CardTitle className="text-base">Optional case studies</CardTitle>
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-3">
            <CardDescription>
              Short proof points the agent can reference in drafts. Example
              entries are pre-filled for this workspace — replace with your real
              customer stories when you have them.
            </CardDescription>
            <div className="mt-5">
              <CaseStudyFields initialStudies={data.caseStudies} />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

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
        hint="Concrete outcomes you deliver. Add 3–5 short tags, not a paragraph."
        values={valueProps}
        onChange={setValueProps}
        placeholder="e.g. Fill more gym memberships without ad spend"
      />
      <TagInput
        label="Target industries"
        hint="Used for industry fit when ICP → Industries is empty."
        values={targetIndustries}
        onChange={setTargetIndustries}
        placeholder="e.g. Gyms"
      />
      <TagInput
        label="Target personas"
        hint="Used as title hints when ICP → Target titles is empty."
        values={targetPersonas}
        onChange={setTargetPersonas}
        placeholder="e.g. Gym owner"
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
          <Card key={study.key} size="sm">
            <CardContent className="space-y-3">
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
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-destructive"
                onClick={() => removeStudy(study.key)}
              >
                Remove case study
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button
        type="button"
        variant="link"
        className="mt-2 h-auto p-0"
        onClick={addStudy}
      >
        + Add case study
      </Button>
    </>
  );
}

function useStateArray<T>(initial: T[]) {
  const [values, setValues] = useState(initial);
  return [values, setValues] as const;
}
