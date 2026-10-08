// Utility functions for Pakistani dates (DD-MM-YYYY) and phone formatting

/**
 * Returns today's date in Pakistan DD-MM-YYYY format
 */
export function getTodayPKDate(): string {
  const d = new Date();
  // Using Asia/Karachi timezone
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  // en-GB formats as DD/MM/YYYY
  const parts = formatter.format(d).split("/");
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Formats an ISO string or Date into DD-MM-YYYY
 */
export function formatDatePK(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return getTodayPKDate();
  if (typeof dateInput === "string" && /^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
    return dateInput;
  }
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats a phone number for Pakistani WhatsApp links (e.g., 923001234567)
 */
export function formatPKWhatsAppPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("03")) {
    clean = "92" + clean.slice(1);
  } else if (clean.startsWith("3") && clean.length === 10) {
    clean = "92" + clean;
  } else if (clean.startsWith("0092")) {
    clean = clean.slice(2);
  }
  return clean;
}
