export function getSchoolInitials(name: string): string {
  if (!name || !name.trim()) return "SC";
  const clean = name.replace(/[^\w\s]/gi, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || "SC";
}

export function generateSchoolSlug(name: string, id?: string | number): string {
  if (!name || !name.trim()) return `school-${id ? String(id).slice(0, 4) : "lhr"}`;
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = id
    ? String(id).replace(/[^a-z0-9]/gi, "").slice(0, 4).toLowerCase()
    : "lhr";
  return suffix ? `${base}-${suffix}` : base;
}

export function unslugify(slug: string): string {
  if (!slug) return "Registered School System";
  const clean = slug.replace(/--+/g, "-");
  const parts = clean.split("-").filter(Boolean);
  const words = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return words.join(" ") || "Registered School System";
}
