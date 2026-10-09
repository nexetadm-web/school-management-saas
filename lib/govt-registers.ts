// ============================================================
// GOVT REGISTERS CONFIGURATION & DATA HELPERS (NSB & FTF)
// ============================================================

export interface FTFClassRow {
  sr: number;
  urduName: string;
  aliases: string[];
  defaultFee: number;
}

export const FTF_STANDARD_CLASSES: FTFClassRow[] = [
  { sr: 1, urduName: "اول", aliases: ["1", "class 1", "1st", "one", "اول", "grade 1"], defaultFee: 20 },
  { sr: 2, urduName: "دوم", aliases: ["2", "class 2", "2nd", "two", "دوم", "grade 2"], defaultFee: 20 },
  { sr: 3, urduName: "سوم", aliases: ["3", "class 3", "3rd", "three", "سوم", "grade 3"], defaultFee: 20 },
  { sr: 4, urduName: "چہارم", aliases: ["4", "class 4", "4th", "four", "چہارم", "grade 4"], defaultFee: 20 },
  { sr: 5, urduName: "پنجم", aliases: ["5", "class 5", "5th", "five", "پنجم", "grade 5"], defaultFee: 20 },
  { sr: 6, urduName: "ششم", aliases: ["6", "class 6", "6th", "six", "ششم", "grade 6"], defaultFee: 20 },
  { sr: 7, urduName: "ہفتم", aliases: ["7", "class 7", "7th", "seven", "ہفتم", "grade 7"], defaultFee: 20 },
  { sr: 8, urduName: "ہشتم", aliases: ["8", "class 8", "8th", "eight", "ہشتم", "grade 8"], defaultFee: 20 },
  { sr: 9, urduName: "نہم", aliases: ["9", "class 9", "9th", "nine", "نہم", "grade 9"], defaultFee: 50 },
  { sr: 10, urduName: "دہم", aliases: ["10", "class 10", "10th", "ten", "دہم", "grade 10"], defaultFee: 50 },
];

export const URDU_MONTHS = [
  { key: "01", name: "جنوری", en: "January" },
  { key: "02", name: "فروری", en: "February" },
  { key: "03", name: "مارچ", en: "March" },
  { key: "04", name: "اپریل", en: "April" },
  { key: "05", name: "مئی", en: "May" },
  { key: "06", name: "جون", en: "June" },
  { key: "07", name: "جولائی", en: "July" },
  { key: "08", name: "اگست", en: "August" },
  { key: "09", name: "ستمبر", en: "September" },
  { key: "10", name: "اکتوبر", en: "October" },
  { key: "11", name: "نومبر", en: "November" },
  { key: "12", name: "دسمبر", en: "December" },
];

/**
 * Match student class string to standard FTF Urdu class name
 */
export function matchStudentToFTFClass(rawClass: string | null | undefined): string | null {
  if (!rawClass) return null;
  const clean = rawClass.toLowerCase().trim();
  for (const c of FTF_STANDARD_CLASSES) {
    if (c.urduName === rawClass.trim()) return c.urduName;
    for (const alias of c.aliases) {
      if (clean === alias || clean.replace(/\s+/g, "") === alias.replace(/\s+/g, "")) {
        return c.urduName;
      }
    }
  }
  return null;
}

/**
 * Format currency in Pakistani style (e.g. 25,000)
 */
export function formatPKR(val: number | string | null | undefined): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || 0));
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-PK");
}
