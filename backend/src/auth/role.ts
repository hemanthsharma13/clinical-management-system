export enum Role {
  RECEPTIONIST = 'RECEPTIONIST',
  ADMIN = 'ADMIN',
}

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

export function userHasAllowedRole(user: { role: Role } | undefined, allowed: Role[] | undefined): boolean {
  if (!allowed || allowed.length === 0) {
    return true;
  }
  if (!user) {
    return false;
  }
  return allowed.includes(user.role);
}
