export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'STUDENT', // Mapped to STUDENT as the default user role
  TEACHER: 'TEACHER',
  TA: 'TA',
  STUDENT: 'STUDENT',
  HR: 'HR',
  SUPPORT: 'SUPPORT',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];
export type UserRoleType = 'ADMIN' | 'STUDENT' | 'TEACHER' | 'TA' | 'HR' | 'SUPPORT';
