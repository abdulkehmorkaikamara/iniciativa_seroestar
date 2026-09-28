/**
 * Canonical portal roles, mirroring backend/roles.py.
 *
 * The API returns `developer` / `student` / `tutor`. Older builds and older
 * tokens use `admin` / `student` / `teacher`, so every comparison against a
 * role coming back from the server goes through `normalizeRole`.
 */

export type CanonicalRole = "developer" | "student" | "tutor";

/** The role names the portal UI addresses itself by. */
export type PortalRole = "student" | "teacher" | "admin";

const ROLE_ALIASES: Record<string, CanonicalRole> = {
  developer: "developer",
  admin: "developer",
  administrator: "developer",
  root: "developer",
  superuser: "developer",
  student: "student",
  learner: "student",
  tutor: "tutor",
  teacher: "tutor",
  instructor: "tutor",
};

/** Map any known spelling of a role to its canonical name ("" when unknown). */
export function normalizeRole(value: unknown): CanonicalRole | "" {
  if (typeof value !== "string") return "";
  return ROLE_ALIASES[value.trim().toLowerCase()] ?? "";
}

/** The canonical role a given portal expects its user to have. */
export function portalRoleToCanonical(portal: PortalRole): CanonicalRole {
  return portal === "admin" ? "developer" : portal === "teacher" ? "tutor" : "student";
}

/** True when a role returned by the API is allowed into the given portal. */
export function roleMatchesPortal(value: unknown, portal: PortalRole): boolean {
  return normalizeRole(value) === portalRoleToCanonical(portal);
}
