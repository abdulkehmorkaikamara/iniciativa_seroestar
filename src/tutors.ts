export interface TutorProfile {
  id: string;
  name: string;
  displayName: string;
  email: string;
  assignedLevels: string[];
}

export const TUTOR_PROFILES: TutorProfile[] = [
  {
    id: "xiomara-villamizar",
    name: "Xiomara Villamizar",
    displayName: "Tutora Xiomara Villamizar",
    email: "xiomara@seroestar.com",
    assignedLevels: ["A1", "A2"]
  },
  {
    id: "ivoneth-frias",
    name: "Ivoneth Frias",
    displayName: "Tutora Ivoneth Frias",
    email: "ivoneth@seroestar.com",
    assignedLevels: ["A1", "A2"]
  },
  {
    id: "guerly",
    name: "Guerly",
    displayName: "Tutora Guerly",
    email: "guerly@seroestar.com",
    assignedLevels: ["A1", "A2"]
  },
  {
    id: "lashika",
    name: "Lashika",
    displayName: "Tutora Lashika",
    email: "lashika@seroestar.com",
    assignedLevels: ["A1", "A2"]
  }
];

export const DEFAULT_TUTOR = TUTOR_PROFILES[0];

export function findTutorByEmail(email?: string) {
  if (!email) return DEFAULT_TUTOR;
  return TUTOR_PROFILES.find((tutor) => tutor.email.toLowerCase() === email.toLowerCase()) || DEFAULT_TUTOR;
}
