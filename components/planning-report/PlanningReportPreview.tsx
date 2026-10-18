"use client";

import { PlanningReportField, PlanningReportModel } from "@/lib/planning-report/generatePlanningReport";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-bone/10 pt-6 first:border-t-0 first:pt-0">
      <h3 className="font-heading text-2xl font-semibold text-bone">{title}</h3>
      {children}
    </section>
  );
}

function FieldList({ fields, emptyText }: { fields: PlanningReportField[]; emptyText: string }) {
  if (!fields.length) return null;

  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {fields.map((field, index) => (
        <div key={`${field.label}-${index}`} className="border-b border-bone/10 py-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-bone/38">{field.label}</dt>
          <dd className="mt-2 whitespace-pre-wrap text-bone/78">{field.value || emptyText}</dd>
        </div>
      ))}
    </dl>
  );
}

function ValueList({ values, emptyText }: { values: string[]; emptyText: string }) {
  if (!values.length) return null;

  return (
    <ul className="space-y-2">
      {values.map((value, index) => (
        <li key={`${value}-${index}`} className="border-b border-bone/10 py-3 text-bone/76">
          {value || emptyText}
        </li>
      ))}
    </ul>
  );
}

export function PlanningReportPreview({ model }: { model: PlanningReportModel }) {
  return (
    <div className="space-y-7 pt-5">
      <div>
        <h2 className="font-heading text-3xl font-semibold leading-tight text-bone">{model.title}</h2>
      </div>

      {model.sections.length ? model.sections.map((section) => (
        <Section key={section.key} title={section.title}>
          <div className="space-y-5">
            {section.blocks.map((block) => (
              <article key={block.id} className="space-y-3">
                <div>
                  <p className="font-heading text-xl font-semibold text-bone">{block.title}</p>
                </div>
                <FieldList fields={block.fields} emptyText={model.emptyText} />
                <ValueList values={block.values} emptyText={model.emptyText} />
                {!block.fields.length && !block.values.length ? (
                  <p className="text-sm text-bone/45">{model.emptyText}</p>
                ) : null}
              </article>
            ))}
          </div>
        </Section>
      )) : (
        <p className="text-sm text-bone/45">{model.emptyText}</p>
      )}
    </div>
  );
}
