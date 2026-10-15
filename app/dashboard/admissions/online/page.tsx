export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { db, applicationsTable, eq, desc } from "@/lib/db";
import OnlineAdmissionsClient from "@/components/online-admissions-client";
import { getCurrentSchool } from "@/lib/getCurrentSchool";

export default async function DashboardAdmissionsOnlinePage(props: {
  searchParams?: Promise<{ school_id?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  let resolvedId = searchParams?.school_id;

  if (!resolvedId) {
    const authSchool = await getCurrentSchool();
    resolvedId = authSchool.schoolId || "";
  }

  // Fresh query directly from DB strictly filtered by tenant school_id
  const applications = resolvedId
    ? await db
        .select()
        .from(applicationsTable)
        .where(eq(applicationsTable.school_id, resolvedId))
        .orderBy(desc(applicationsTable.created_at))
    : [];

  return (
    <OnlineAdmissionsClient
      initialApplications={applications}
      initialSchoolId={resolvedId}
    />
  );
}
