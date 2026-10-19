import { redirect } from "next/navigation";

export default async function SetupPage({ searchParams }: {
  searchParams: Promise<{ id?: string; locale?: string; lang?: string }>;
}) {
  const search = await searchParams;
  const query = new URLSearchParams({ setup: "collective" });
  if (search.id) query.set("id", search.id);
  if (search.locale) query.set("locale", search.locale);
  else if (search.lang) query.set("lang", search.lang);
  redirect(`/dashboard?${query.toString()}`);
}
