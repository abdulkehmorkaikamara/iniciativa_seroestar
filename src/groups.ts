// The academy's active class groups. Students are stored with a course level
// ("A1"/"A2") and a class_group ("Group 1", "Group 2", ...); this table turns that
// pair into the group's code, school name and assigned tutor.
export interface ClassGroup {
  code: string;
  level: "A1" | "A2";
  group: number;
  school: string;
  tutorEmail: string;
}

export const CLASS_GROUPS: ClassGroup[] = [
  { code: "A1G1", level: "A1", group: 1, school: "British International School", tutorEmail: "ivoneth@seroestar.com" },
  { code: "A1G2", level: "A1", group: 2, school: "Choithram International School", tutorEmail: "ivoneth@seroestar.com" },
  { code: "A1G3", level: "A1", group: 3, school: "Morden High School", tutorEmail: "ivoneth@seroestar.com" },
  { code: "A1G4", level: "A1", group: 4, school: "Sierra Leone Grammar School", tutorEmail: "ivoneth@seroestar.com" },
];

// Legacy values such as "Morning Group" count as Group 1 and "Evening" as Group 2.
export function groupNumberFrom(classGroup?: string): number {
  const text = classGroup || "";
  const numbered = text.match(/(?:group|grupo|g)[\s-]*(\d+)\b/i);
  if (numbered) return Number(numbered[1]) || 1;
  return /evening/i.test(text) ? 2 : 1;
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
  return group.school;
}

// Options for a "class group" dropdown. Levels without a named group (B1)
// fall back to a plain "Group 1".
export function groupOptionsForLevel(courseLevel?: string) {
  const level = courseLevel?.match(/\b(A1|A2|B1)\b/i)?.[1]?.toUpperCase();
  const groups = CLASS_GROUPS.filter((g) => g.level === level);
  if (groups.length === 0) return [{ value: "Group 1", label: "Group 1" }];
  return groups.map((g) => ({ value: `Group ${g.group}`, label: classGroupLabel(g) }));
}

// The value stored in class_group for a school's group.
export function classGroupValue(group: ClassGroup) {
  return `Group ${group.group}`;
}

export function groupsForTutor(email?: string) {
  const own = CLASS_GROUPS.filter((g) => g.tutorEmail.toLowerCase() === (email || "").toLowerCase());
  return own.length ? own : CLASS_GROUPS;
}

// School label for a published item; items without a group go to the whole level.
export function contentAudienceLabel(courseLevel?: string, classGroup?: string | null) {
  if (!classGroup) return `All ${courseLevel || ""} schools`.replace("  ", " ");
  const group = findClassGroup(courseLevel, classGroup);
  return group ? classGroupLabel(group) : `${courseLevel} ${classGroup}`;
}

// Whether a class, note or recording published for a level/group reaches a student.
export function contentReachesStudent(
  content: { course_level?: string; class_group?: string | null },
  student: { courseLevel?: string; classGroup?: string }
) {
  const level = (value?: string) => value?.match(/\b(A1|A2|B1)\b/i)?.[1]?.toUpperCase();
  const contentLevel = content.course_level === "All" ? undefined : level(content.course_level);
  if (contentLevel && level(student.courseLevel) && contentLevel !== level(student.courseLevel)) return false;
  return !content.class_group || groupNumberFrom(content.class_group) === groupNumberFrom(student.classGroup);
}
