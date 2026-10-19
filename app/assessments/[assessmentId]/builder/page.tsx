import { redirect } from "next/navigation";

export default async function BuilderPage({ params, searchParams }: {
  params: Promise<{ assessmentId: string }>;
  searchParams: Promise<{ locale?: string; lang?: string; template?: string }>;
}) {
  const { assessmentId } = await params;
  const search = await searchParams;
  const query = new URLSearchParams({ setup: "individual", assessment: assessmentId });
  if (search.locale) query.set("locale", search.locale);
  else if (search.lang) query.set("lang", search.lang);
  if (search.template === "1") query.set("template", "1");
  redirect(`/dashboard?${query.toString()}`);
}
