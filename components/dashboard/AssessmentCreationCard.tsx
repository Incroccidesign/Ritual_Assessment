"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { AssessmentTemplate, nasijDefaultAssessmentTemplates } from "@/data/templates/nasijSustainabilityAssessmentTemplate";
import { Button, Card } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils/cn";

type TemplateListItem = {
  id: string;
  source: "default" | "user";
  title: string;
  description: string;
  badge?: string;
  assessment?: Assessment;
  template?: AssessmentTemplate;
};

function ScratchIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 228.8 237.6" className="h-24 w-24 text-bone/72">
      <path
        fill="currentColor"
        d="M152.42,178.86h-47.88c-.83,0-1.5-.67-1.5-1.5v-13.88l-23.5.65c-.42.02-.8-.14-1.09-.42-.29-.28-.45-.67-.45-1.08v-28.1h-9.73c-.52,0-1.01-.27-1.28-.72s-.29-1-.05-1.47l11.06-21.51v-10.08c0-8.4,2.48-16.5,7.16-23.45.24-.35,5.79-8.32,12.29-11.98,6.3-4.04,13.68-6.32,21.27-6.55.08,0,2.89-.16,5.76.21,8.41.88,16.29,4.27,22.75,9.78.5.44,11.87,10.59,14.1,24.43.46,2.52.69,5.06.69,7.55,0,4.99-.89,9.9-2.66,14.62-.09.25-2.26,6-5.45,10.2v51.79c0,.83-.67,1.5-1.5,1.5ZM106.05,175.86h44.88v-50.8c0-.34.12-.67.33-.93,3.06-3.85,5.29-9.75,5.31-9.81,1.64-4.38,2.46-8.94,2.46-13.57,0-2.31-.22-4.68-.65-7.03,0-.01,0-.02,0-.03-2.04-12.76-12.99-22.56-13.1-22.66-5.99-5.1-13.3-8.25-21.14-9.07-2.63-.34-5.25-.2-5.28-.2-7.08.22-13.93,2.33-19.85,6.13-5.97,3.36-11.3,11.02-11.36,11.1-4.34,6.44-6.64,13.96-6.64,21.76v10.44c0,.24-.06.47-.17.69l-10.1,19.65h8.77c.83,0,1.5.67,1.5,1.5v28.06l23.5-.65c.39-.03.8.14,1.09.42.29.28.45.67.45,1.08v13.93ZM121.07,128.98c-.49,0-.95-.24-1.23-.65l-10.23-14.8c-.32-.46-.35-1.05-.1-1.55.26-.49.77-.8,1.33-.81l20.59-.06h0c.56,0,1.07.31,1.33.8.26.5.22,1.1-.1,1.55l-10.36,14.85c-.28.41-.74.65-1.23.65h0ZM113.7,114.18l7.38,10.67,7.48-10.72-14.85.04ZM109.81,107.62c-.83,0-1.5-.67-1.5-1.5l-.07-24.87c.17-4.24,1.52-7.51,4.04-9.78,3.9-3.52,9.12-3.24,9.34-3.23,6.85.27,12.25,5.87,12.27,12.76l.07,25.04c0,.83-.67,1.5-1.5,1.5l-22.65.07h0ZM121.22,71.23c-.94,0-4.41.17-6.96,2.48-1.88,1.71-2.9,4.26-3.03,7.59l.07,23.3,19.65-.06-.07-23.54c-.02-5.27-4.16-9.57-9.43-9.77,0,0-.09,0-.24,0Z"
      />
    </svg>
  );
}

function TemplateIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 228.8 237.6" className="h-24 w-24 text-bone/72">
      <path
        fill="currentColor"
        d="M154.02,69.9h-63.02c-4.91,0-8.72,3.71-9.12,8.42-4.41.4-7.91,3.71-8.32,8.12-4.51.6-7.91,4.31-7.91,9.02v63.12c0,5.11,4.01,9.12,9.12,9.12h63.03c2.5,0,4.81-1,6.51-2.8,1.5-1.5,2.3-3.41,2.5-5.41,2-.3,4.01-1.2,5.41-2.71,1.5-1.6,2.41-3.51,2.5-5.71,2.2-.2,4.21-1.1,5.81-2.71,1.7-1.7,2.61-4.01,2.61-6.41v-62.93c0-5.11-4.01-9.12-9.12-9.12h0ZM91,72.91h63.03c3.41,0,6.11,2.71,6.11,6.11v14.63h-75.25v-14.63c0-3.41,2.7-6.11,6.11-6.11h0ZM91,148.26c-3.41,0-6.11-2.71-6.11-6.11v-45.49h26.56v51.6h-20.44ZM137.79,164.79h-63.03c-3.41,0-6.11-2.71-6.11-6.11v-63.12c0-3.01,2.11-5.41,4.91-6.01v61.02c0,5.11,4.01,9.12,9.12,9.12h61.12c-.2,1.2-.7,2.3-1.6,3.3-1.2,1.1-2.7,1.8-4.41,1.8h0ZM145.71,156.68h-63.03c-3.41,0-6.11-2.71-6.11-6.11v-63.12c0-3.11,2.3-5.71,5.31-6.01v60.72c0,5.11,4.01,9.12,9.12,9.12h60.82c-.1,1.3-.7,2.61-1.7,3.61-1.2,1.1-2.7,1.8-4.41,1.8h0ZM158.44,146.45c-1.2,1.2-2.71,1.8-4.41,1.8h-39.58v-51.6h45.69v45.39c0,1.7-.6,3.21-1.7,4.41h0Z"
      />
    </svg>
  );
}

function ChoiceCard({
  title,
  description,
  children,
  onClick
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-[13rem] w-full flex-col items-start justify-between overflow-hidden rounded-lg border border-bone/12 bg-night/45 p-4 text-left transition",
        "hover:border-mint/60 hover:bg-mint/8 focus:outline-none focus:ring-2 focus:ring-mint"
      )}
      onClick={onClick}
    >
      <div>
        <h3 className="font-heading text-xl font-semibold text-bone">{title}</h3>
        <p className="mt-2 max-w-xs text-sm font-medium leading-5 text-bone/62">{description}</p>
      </div>
      <div className="-mb-2 self-center">{children}</div>
    </button>
  );
}

export function AssessmentCreationCard({
  creating,
  userTemplates,
  onCreateBlank,
  onUseDefaultTemplate,
  onUseUserTemplate,
  onBuildTemplate,
  onDeleteTemplate
}: {
  creating: boolean;
  userTemplates: Assessment[];
  onCreateBlank: () => void;
  onUseDefaultTemplate: (template: AssessmentTemplate) => void;
  onUseUserTemplate: (assessment: Assessment) => void;
  onBuildTemplate: () => void;
  onDeleteTemplate: (assessment: Assessment) => void;
}) {
  const { messages } = useLocale();
  const [mode, setMode] = useState<"choices" | "templates">("choices");
  const [deleteTemplate, setDeleteTemplate] = useState<Assessment | null>(null);
  const templates: TemplateListItem[] = [
    ...nasijDefaultAssessmentTemplates.map((template) => ({
      id: `nasij-${template.language}`,
      source: "default" as const,
      title: template.pickerTitle,
      description: template.pickerDescription,
      badge: template.pickerBadge,
      template
    })),
    ...userTemplates.map((assessment) => ({
      id: assessment.id,
      source: "user" as const,
      title: assessment.title,
      description: assessment.description || messages.assessmentCreate.templates.blankDescription,
      assessment
    }))
  ];

  function confirmDeleteTemplate() {
    if (!deleteTemplate) return;
    onDeleteTemplate(deleteTemplate);
    setDeleteTemplate(null);
  }

  return (
    <Card className="relative z-30 w-[min(calc(100vw-2rem),42rem)] border-bone/16 !bg-[#15181f] p-0 shadow-[0_28px_80px_rgba(0,0,0,0.72)]">
      <div className="space-y-5 rounded-lg bg-[#15181f] p-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-bone">
            {mode === "choices" ? messages.assessmentCreate.title : messages.assessmentCreate.templates.title}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-bone/60">
            {mode === "choices" ? messages.assessmentCreate.helper : messages.assessmentCreate.templates.description}
          </p>
        </div>

        {mode === "choices" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              title={messages.assessmentCreate.startFromScratch.title}
              description={messages.assessmentCreate.startFromScratch.description}
              onClick={onCreateBlank}
            >
              <ScratchIllustration />
            </ChoiceCard>
            <ChoiceCard
              title={messages.assessmentCreate.templates.title}
              description={messages.assessmentCreate.templates.choiceDescription}
              onClick={() => setMode("templates")}
            >
              <TemplateIllustration />
            </ChoiceCard>
          </div>
        ) : (
          <div className="space-y-4">
            <Button type="button" className="w-full" disabled={creating} onClick={onBuildTemplate}>
              <Plus size={16} /> {messages.assessmentCreate.templates.buildNew}
            </Button>
            <div className="space-y-3">
              {templates.map((item) => (
                <article key={item.id} className="rounded-lg border border-bone/10 bg-[#11141a] p-0">
                  <button
                    type="button"
                    disabled={creating}
                    className="block w-full rounded-lg p-4 text-left transition hover:bg-mint/8 focus:outline-none focus:ring-2 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => item.template ? onUseDefaultTemplate(item.template) : item.assessment ? onUseUserTemplate(item.assessment) : undefined}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-lg font-semibold text-bone">{item.title}</h3>
                      {item.source === "default" ? (
                        <span className="rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-xs font-semibold text-mint">
                          {item.badge ?? messages.assessmentCreate.templates.defaultBadge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-bone/58">{item.description}</p>
                  </button>
                  {item.assessment ? (
                    <div className="border-t border-bone/10 px-4 py-3">
                      <Button type="button" variant="danger" className="min-h-9 px-3" disabled={creating} onClick={() => setDeleteTemplate(item.assessment ?? null)}>
                        {messages.assessmentCreate.templates.delete}
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {deleteTemplate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <h3 className="font-heading text-2xl font-semibold text-bone">{messages.template.delete.title}</h3>
            <p className="mt-3 text-sm leading-6 text-bone/62">{messages.template.delete.body}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setDeleteTemplate(null)}>
                {messages.template.delete.cancel}
              </Button>
              <Button type="button" variant="danger" onClick={confirmDeleteTemplate}>
                {messages.template.delete.confirm}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}
