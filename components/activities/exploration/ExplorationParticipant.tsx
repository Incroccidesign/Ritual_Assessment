"use client";

import { ExplorationActivity, ExplorationAnswer } from "@/types/activity";
import { ExplorationCards } from "@/components/activities/exploration/ExplorationCards";

export function ExplorationParticipant({
  activity,
  answer,
  onChange
}: {
  activity: ExplorationActivity;
  answer: ExplorationAnswer;
  onChange: (answer: ExplorationAnswer) => void;
}) {
  return <ExplorationCards activity={activity} answer={answer} onChange={onChange} />;
}
