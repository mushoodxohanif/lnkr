"use client";

import { ChevronDownIcon } from "lucide-react";
import { useActionState, useState } from "react";
import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
  TextInput,
} from "@/components/settings/form-primitives";
import { TagInput } from "@/components/settings/tag-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { saveICPCriteria } from "@/lib/settings/actions";
import {
  DEFAULT_COMPANY_SIZE_MAX,
  DEFAULT_COMPANY_SIZE_MIN,
  DEFAULT_FIT_THRESHOLD,
} from "@/lib/settings/defaults";
import { STARTER_ICP_ADVANCED_EXAMPLES } from "@/lib/settings/starter-config";
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
  companySizeMin: DEFAULT_COMPANY_SIZE_MIN,
  companySizeMax: DEFAULT_COMPANY_SIZE_MAX,
  industries: [],
  techStack: [],
  geo: [],
  exclusionRules: {},
  weights: { ...DEFAULT_ICP_WEIGHTS },
  fitThreshold: DEFAULT_FIT_THRESHOLD,
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

      <Alert className="border-primary/20 bg-primary/5">
        <AlertTitle>Start simple</AlertTitle>
        <AlertDescription>
          Match <strong>target titles</strong> to the jobs in your Sales
          Navigator list. Leave industries empty to reuse{" "}
          <strong>Product → Target industries</strong>. Default fit threshold is{" "}
          {DEFAULT_FIT_THRESHOLD}% — raise it once batches look good.
        </AlertDescription>
      </Alert>

      <FormSection
        title="Who qualifies for today's batch"
        description="Leads below the fit threshold are archived and won't appear on the dashboard."
      >
        <TagInput
          label="Target titles"
          hint="Partial match on job title and headline. Use titles your list actually contains (e.g. Owner, Founder), not only C-suite if your list isn't executives."
          values={titles}
          onChange={setTitles}
          placeholder="e.g. Owner"
        />
        <TagInput
          label="Industries"
          hint="Optional. Leave empty to use industries from your Product profile."
          values={industries}
          onChange={setIndustries}
          placeholder="e.g. Fitness"
        />
        <Field
          label="Minimum fit threshold (%)"
          hint="Leads scoring below this are archived. Start at 45; increase to 55–60 when quality is consistent."
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

      <Collapsible className="rounded-xl border border-border bg-card shadow-sm">
        <div className="px-6 py-4">
          <CollapsibleTrigger className="group flex w-full items-center justify-between text-left">
            <span className="text-sm font-semibold text-foreground">
              Advanced ICP options
            </span>
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="space-y-6 border-t border-border px-6 py-5">
            <StarterExamplesPanel />
            <TagInput
              label="Seniority levels"
              hint="Optional filter on title text (e.g. Director, VP)."
              values={seniorityLevels}
              onChange={setSeniorityLevels}
              placeholder="e.g. Director"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Min company size (employees)"
                hint="Leave blank until enrichment data is reliable. Example for boutique studios: 1."
              >
                <TextInput
                  name="companySizeMin"
                  type="number"
                  min={1}
                  defaultValue={data.companySizeMin ?? ""}
                  placeholder={String(
                    STARTER_ICP_ADVANCED_EXAMPLES.companySizeMin,
                  )}
                />
              </Field>
              <Field
                label="Max company size (employees)"
                hint="Leave blank to avoid penalizing leads with unknown size. Example: 250."
              >
                <TextInput
                  name="companySizeMax"
                  type="number"
                  min={1}
                  defaultValue={data.companySizeMax ?? ""}
                  placeholder={String(
                    STARTER_ICP_ADVANCED_EXAMPLES.companySizeMax,
                  )}
                />
              </Field>
            </div>
            <TagInput
              label="Tech stack signals"
              hint="Add only when enrichment returns tech data. Example: Mindbody, Stripe."
              values={techStack}
              onChange={setTechStack}
              placeholder="e.g. Mindbody"
            />
            <TagInput
              label="Geography"
              hint="Countries or regions to favor."
              values={geo}
              onChange={setGeo}
              placeholder="e.g. United States"
            />

            <div className="space-y-4">
              <Separator />
              <p className="text-sm font-medium text-foreground">
                Exclusion rules
              </p>
              <TagInput
                label="Competitors"
                values={exclusionRules.competitors ?? []}
                onChange={(values) =>
                  setExclusionRules({ ...exclusionRules, competitors: values })
                }
                placeholder="e.g. Competitor Inc."
              />
              <TagInput
                label="Excluded titles"
                values={exclusionRules.titles ?? []}
                onChange={(values) =>
                  setExclusionRules({ ...exclusionRules, titles: values })
                }
                placeholder="e.g. Intern"
              />
              <TagInput
                label="Excluded industries"
                values={exclusionRules.industries ?? []}
                onChange={(values) =>
                  setExclusionRules({ ...exclusionRules, industries: values })
                }
                placeholder="e.g. Staffing"
              />
              <TagInput
                label="Excluded profile keywords"
                hint="Partial match against the profile About and Description sections."
                values={exclusionRules.profileKeywords ?? []}
                onChange={(values) =>
                  setExclusionRules({
                    ...exclusionRules,
                    profileKeywords: values,
                  })
                }
                placeholder="e.g. Open to work"
              />
              <div className="flex items-center gap-3">
                <Checkbox
                  id="exclude-agencies"
                  checked={exclusionRules.agencies ?? false}
                  onCheckedChange={(checked) =>
                    setExclusionRules({
                      ...exclusionRules,
                      agencies: checked === true,
                    })
                  }
                />
                <Label htmlFor="exclude-agencies" className="font-normal">
                  Exclude agencies and consultancies
                </Label>
              </div>
            </div>

            <div className="space-y-4">
              <Separator />
              <p className="text-sm font-medium text-foreground">
                Scoring weights
              </p>
              <p className="text-xs text-muted-foreground">
                Relative importance of each dimension. Defaults work for most
                users.
              </p>
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
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

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

function StarterExamplesPanel() {
  const examples = STARTER_ICP_ADVANCED_EXAMPLES;

  return (
    <Card size="sm" className="bg-muted/50">
      <CardContent className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Suggested advanced values</p>
        <p className="mt-1">
          Your workspace includes example exclusion rules below. Seniority,
          company size, and tech stack are left empty on purpose — they can
          lower scores when Sales Navigator profiles lack title or enrichment
          data.
        </p>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-medium text-foreground">
              Seniority (when titles are reliable)
            </dt>
            <dd>{examples.seniorityLevels.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">
              Company size (studios / SMB)
            </dt>
            <dd>
              {examples.companySizeMin}–{examples.companySizeMax} employees
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-foreground">
              Tech stack (fitness / ops tools)
            </dt>
            <dd>{examples.techStack.join(", ")}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
