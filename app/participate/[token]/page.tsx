import { AssessmentRunner } from "@/components/participant/AssessmentRunner";

export default async function ParticipatePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return <AssessmentRunner token={params.token} />;
}
