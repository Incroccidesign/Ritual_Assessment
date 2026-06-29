"use client";

import { DesignerAuthGate } from "@/components/auth/DesignerAuthGate";
import { ResultsDashboard } from "@/components/reports/ResultsDashboard";

export default function ResultsPage({ params }: { params: { assessmentId: string } }) {
  return (
    <DesignerAuthGate>
      {(designer) => <ResultsDashboard assessmentId={params.assessmentId} designer={designer} />}
    </DesignerAuthGate>
  );
}
