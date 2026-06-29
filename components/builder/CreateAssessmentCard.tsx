"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ritual-ui";
import { createLocalAssessment } from "@/lib/assessment/localStore";
import { useLocale } from "@/lib/i18n/useLocale";

export function CreateAssessmentCard({ ownerId, onCreated }: { ownerId: string; onCreated: (assessmentId: string) => void }) {
  const { messages } = useLocale();

  return (
    <Button
      onClick={() => {
        const assessment = createLocalAssessment(ownerId);
        onCreated(assessment.id);
      }}
    >
      <Plus size={17} /> {messages.dashboard.createNewAssessment}
    </Button>
  );
}
