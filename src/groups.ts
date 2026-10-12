// The academy's active class groups. Students are stored with a course level
// ("A1"/"A2") and a class_group ("Group 1"/"Group 2"); this table turns that
// pair into the group's code, school name and assigned tutor.
export interface ClassGroup {
  code: string;
  level: "A1" | "A2";
  group: 1 | 2;
  school: string;
  tutorEmail: string;
}

export const CLASS_GROUPS: ClassGroup[] = [
  { code: "A1G1", level: "A1", group: 1, school: "British International School", tutorEmail: "ivoneth@seroestar.com" },
  { code: "A1G2", level: "A1", group: 2, school: "Choithram International School", tutorEmail: "ivoneth@seroestar.com" },
  { code: "A2G1", level: "A2", group: 1, school: "Grammar School", tutorEmail: "ivoneth@seroestar.com" },
];

export function groupNumberFrom(classGroup?: string): 1 | 2 {
  const text = classGroup || "";
  return /(?:group|grupo|g)[\s-]*2\b/i.test(text) || /evening/i.test(text) ? 2 : 1;
}

export function findClassGroup(courseLevel?: string, classGroup?: string): ClassGroup | null {
  const level = courseLevel?.match(/\b(A1|A2)\b/i)?.[1]?.toUpperCase();
  if (!level) return null;
  const group = groupNumberFrom(classGroup);
  return CLASS_GROUPS.find((g) => g.level === level && g.group === group)
    || CLASS_GROUPS.find((g) => g.level === level && g.group === 1)
    || null;
}

export function classGroupLabel(group: ClassGroup) {
  return `${group.code} (${group.school})`;
}

// Options for a "class group" dropdown. Levels without a named group (B1)
// fall back to a plain "Group 1".
export function groupOptionsForLevel(courseLevel?: string) {
  const level = courseLevel?.match(/\b(A1|A2|B1)\b/i)?.[1]?.toUpperCase();
  const groups = CLASS_GROUPS.filter((g) => g.level === level);
  if (groups.length === 0) return [{ value: "Group 1", label: "Group 1" }];
  return groups.map((g) => ({ value: `Group ${g.group}`, label: classGroupLabel(g) }));
}
