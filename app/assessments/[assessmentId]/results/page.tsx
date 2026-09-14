"use client";;
import { use } from "react";

import { DesignerAuthGate } from "@/components/auth/DesignerAuthGate";
import { ResultsDashboard } from "@/components/reports/ResultsDashboard";

export default function ResultsPage(props: { params: Promise<{ assessmentId: string }> }) {
  const params = use(props.params);
  return (
    <DesignerAuthGate>
      {(designer) => <ResultsDashboard assessmentId={params.assessmentId} designer={designer} />}
    </DesignerAuthGate>
  );
}
