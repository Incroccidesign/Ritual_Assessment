"use client";

import { ExplorationItem, PrioritizationActivity, PrioritizationAnswer } from "@/types/activity";
import { TapToRank } from "@/components/activities/prioritization/TapToRank";
import { SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function PrioritizationParticipant({
  sourceItems,
  answer,
  onChange
}: {
  activity: PrioritizationActivity;
  sourceItems: ExplorationItem[];
  answer: PrioritizationAnswer;
  onChange: (answer: PrioritizationAnswer) => void;
}) {
  const { messages } = useLocale();
  if (!sourceItems.length) return <SubtlePanel><p className="text-bone/56">{messages.common.empty}</p></SubtlePanel>;
  return <TapToRank items={sourceItems} answer={answer} onChange={onChange} />;
}
