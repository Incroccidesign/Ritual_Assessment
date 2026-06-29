"use client";

import { useSearchParams } from "next/navigation";
import { AssessmentBuilder } from "@/components/builder/AssessmentBuilder";
import { DesignerAuthGate } from "@/components/auth/DesignerAuthGate";

export default function BuilderPage({ params }: { params: { assessmentId: string } }) {
  const searchParams = useSearchParams();
  const initialTemplateMode = searchParams.get("template") === "1";

  return (
    <DesignerAuthGate>
      {(designer) => <AssessmentBuilder assessmentId={params.assessmentId} ownerId={designer.id} initialTemplateMode={initialTemplateMode} />}
    </DesignerAuthGate>
  );
}
