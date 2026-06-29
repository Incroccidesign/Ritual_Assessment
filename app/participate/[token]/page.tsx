import { AssessmentRunner } from "@/components/participant/AssessmentRunner";

export default function ParticipatePage({ params }: { params: { token: string } }) {
  return <AssessmentRunner token={params.token} />;
}
