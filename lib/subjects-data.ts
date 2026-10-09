export interface SubjectItem {
  id: number | string;
  name: string;
  code: string;
  category: "Compulsory" | "Science" | "Arts / Humanities" | "Commerce" | "Languages";
  total_marks: number;
  passing_marks: number;
  classes?: string[];
  school_id?: number | string;
  description?: string;
}

export const PAKISTAN_BOARD_SUBJECTS: SubjectItem[] = [
  // Compulsory Subjects
  {
    id: 1,
    name: "English",
    code: "ENG-101",
    category: "Compulsory",
    total_marks: 100,
    passing_marks: 33,
    classes: ["Play", "Nursery", "Prep", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"],
    description: "Compulsory language, grammar, reading & composition (Punjab/Federal Board syllabus)",
  },
  {
    id: 2,
    name: "Urdu",
    code: "URD-102",
    category: "Compulsory",
    total_marks: 100,
    passing_marks: 33,
    classes: ["Play", "Nursery", "Prep", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"],
    description: "National language literature, grammar, poetry and essay writing",
  },
  {
    id: 3,
    name: "Mathematics",
    code: "MATH-103",
    category: "Compulsory",
    total_marks: 100,
    passing_marks: 33,
    classes: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"],
    description: "Core arithmetic, algebra, geometry and trigonometry for matric students",
  },
  {
    id: 4,
    name: "Islamiat Compulsory",
    code: "ISL-104",
    category: "Compulsory",
    total_marks: 50,
    passing_marks: 17,
    classes: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"],
    description: "Islamic studies compulsory curriculum / ethics for non-Muslim students",
  },
  {
    id: 5,
    name: "Pakistan Studies",
    code: "PAK-105",
    category: "Compulsory",
    total_marks: 50,
    passing_marks: 17,
    classes: ["6th", "7th", "8th", "9th", "10th"],
    description: "Ideology of Pakistan, geography, history and constitution",
  },
  {
    id: 6,
    name: "Quran Translation",
    code: "QT-106",
    category: "Compulsory",
    total_marks: 50,
    passing_marks: 17,
    classes: ["6th", "7th", "8th", "9th", "10th"],
    description: "Tarjuma-tul-Quran Majeed (Mandatory curriculum by Punjab & Federal Boards)",
  },

  // Science Group
  {
    id: 7,
    name: "Physics",
    code: "PHY-201",
    category: "Science",
    total_marks: 75,
    passing_marks: 25,
    classes: ["9th", "10th"],
    description: "Mechanics, heat, optics, electricity, atomic physics with practical lab",
  },
  {
    id: 8,
    name: "Chemistry",
    code: "CHM-202",
    category: "Science",
    total_marks: 75,
    passing_marks: 25,
    classes: ["9th", "10th"],
    description: "Physical, organic, inorganic chemistry and chemical analysis practicals",
  },
  {
    id: 9,
    name: "Biology",
    code: "BIO-203",
    category: "Science",
    total_marks: 75,
    passing_marks: 25,
    classes: ["9th", "10th"],
    description: "Botany, zoology, physiology, genetics and biological specimens lab",
  },
  {
    id: 10,
    name: "Computer Science",
    code: "CS-204",
    category: "Science",
    total_marks: 75,
    passing_marks: 25,
    classes: ["6th", "7th", "8th", "9th", "10th"],
    description: "Programming logic (C/C++ or Python), computer hardware, networks and databases",
  },

  // Arts / General Group
  {
    id: 11,
    name: "General Math",
    code: "GMATH-301",
    category: "Arts / Humanities",
    total_marks: 100,
    passing_marks: 33,
    classes: ["9th", "10th"],
    description: "Business arithmetic, statistics, basic geometry and consumer math for Arts group",
  },
  {
    id: 12,
    name: "General Science",
    code: "GSCI-302",
    category: "Arts / Humanities",
    total_marks: 100,
    passing_marks: 33,
    classes: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"],
    description: "Everyday science, environmental concepts, health and biology for general students",
  },
  {
    id: 13,
    name: "Islamiat Elective",
    code: "ISLE-303",
    category: "Arts / Humanities",
    total_marks: 100,
    passing_marks: 33,
    classes: ["9th", "10th"],
    description: "Advanced Quranic studies, Hadith analysis and Islamic jurisprudence",
  },
  {
    id: 14,
    name: "Education",
    code: "EDU-304",
    category: "Arts / Humanities",
    total_marks: 100,
    passing_marks: 33,
    classes: ["9th", "10th"],
    description: "Philosophy of education, teaching methodology, child psychology and curriculum",
  },
  {
    id: 15,
    name: "Civics",
    code: "CIV-305",
    category: "Arts / Humanities",
    total_marks: 100,
    passing_marks: 33,
    classes: ["9th", "10th"],
    description: "Citizenship, state institutions, democracy, local government and human rights",
  },

  // Commerce Group
  {
    id: 16,
    name: "Economics",
    code: "ECO-401",
    category: "Commerce",
    total_marks: 100,
    passing_marks: 33,
    classes: ["9th", "10th"],
    description: "Microeconomics, macroeconomics, Pakistan economy, banking and trade",
  },
  {
    id: 17,
    name: "Business Studies",
    code: "BS-402",
    category: "Commerce",
    total_marks: 100,
    passing_marks: 33,
    classes: ["9th", "10th"],
    description: "Principles of commerce, business organization, marketing and entrepreneurship",
  },
  {
    id: 18,
    name: "Commercial Geography",
    code: "CG-403",
    category: "Commerce",
    total_marks: 75,
    passing_marks: 25,
    classes: ["9th", "10th"],
    description: "World and Pakistan commercial agriculture, mineral resources, transport and ports",
  },

  // Languages Group
  {
    id: 19,
    name: "Arabic",
    code: "ARB-501",
    category: "Languages",
    total_marks: 100,
    passing_marks: 33,
    classes: ["6th", "7th", "8th", "9th", "10th"],
    description: "Arabic grammar, classical literature, translation and conversation",
  },
  {
    id: 20,
    name: "Persian",
    code: "PER-502",
    category: "Languages",
    total_marks: 100,
    passing_marks: 33,
    classes: ["8th", "9th", "10th"],
    description: "Persian (Farsi) grammar, prose, classical poetry of Iqbal and Saadi",
  },
  {
    id: 21,
    name: "Punjabi",
    code: "PUN-503",
    category: "Languages",
    total_marks: 100,
    passing_marks: 33,
    classes: ["8th", "9th", "10th"],
    description: "Regional language literature, Sufi poetry (Waris Shah, Bulleh Shah) and grammar",
  },
];

export const SUBJECT_CATEGORIES = [
  "All",
  "Compulsory",
  "Science",
  "Arts / Humanities",
  "Commerce",
  "Languages",
] as const;

export function getAllBoardSubjects(): SubjectItem[] {
  return [...PAKISTAN_BOARD_SUBJECTS];
}

export function getSubjectsForClass(classStr?: string): SubjectItem[] {
  if (!classStr) return [...PAKISTAN_BOARD_SUBJECTS];
  const normalized = classStr.trim().toLowerCase();
  return PAKISTAN_BOARD_SUBJECTS.filter((sub) => {
    if (!sub.classes || sub.classes.length === 0) return true;
    return sub.classes.some((c) => c.toLowerCase() === normalized);
  });
}
