"use client";;
import { use } from "react";

import { useSearchParams } from "next/navigation";
import { AssessmentBuilder } from "@/components/builder/AssessmentBuilder";
import { DesignerAuthGate } from "@/components/auth/DesignerAuthGate";

export default function BuilderPage(props: { params: Promise<{ assessmentId: string }> }) {
  const params = use(props.params);
  const searchParams = useSearchParams();
  const initialTemplateMode = searchParams.get("template") === "1";

  return (
    <DesignerAuthGate>
      {(designer) => <AssessmentBuilder assessmentId={params.assessmentId} ownerId={designer.id} initialTemplateMode={initialTemplateMode} />}
    </DesignerAuthGate>
  );
}
