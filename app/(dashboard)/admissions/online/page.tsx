export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import { db, applicationsTable, eq, desc } from "@/lib/db";
import OnlineAdmissionsClient from "@/components/online-admissions-client";

export default async function OnlineAdmissionsDashboardPage(props: {
  searchParams?: Promise<{ school_id?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const currentSchool = {
    id: searchParams?.school_id || "1",
  };

  // Fresh query directly from DB with zero cache
  const applications = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.school_id, currentSchool.id))
    .orderBy(desc(applicationsTable.created_at));

  return (
    <OnlineAdmissionsClient
      initialApplications={applications}
      initialSchoolId={currentSchool.id}
    />
  );
}
