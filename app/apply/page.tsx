import { redirect } from "next/navigation";

export default async function ApplyIndexPage(props: {
  searchParams?: Promise<{ school_id?: string; schoolId?: string; id?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const schoolId =
    searchParams?.school_id ||
    searchParams?.schoolId ||
    searchParams?.id ||
    "87137fe7-22f2-48dc-820d-f21d21b73686";

  redirect(`/apply/${schoolId}`);
}
