import { Activity } from "@/types/activity";
import { Locale } from "@/types/locale";

export type AssessmentStatus = "draft" | "published" | "closed";

export type Assessment = {
  id: string;
  ownerId?: string;
  title: string;
  description?: string;
  estimatedDuration?: string;
  language: Locale;
  status: AssessmentStatus;
  publicToken?: string;
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};
