import type { PROJECT_ROLES } from '../constants.js';

export type ProjectRole = (typeof PROJECT_ROLES)[number];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

export interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  role: ProjectRole;
}
