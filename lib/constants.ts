export const SUPER_ADMINS = [
  "mnuhbhatti333@gmail.com",
];

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMINS.map((e) => e.toLowerCase()).includes(email.trim().toLowerCase());
}
