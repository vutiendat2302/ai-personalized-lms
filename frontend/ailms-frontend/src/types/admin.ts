export interface UserResponse {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  gender: number;
  dateOfBirth: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  roles: string[];
}

export interface RoleResponse {
  id: string;
  name: string;
  code: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  createdBy: number | null;
  updatedBy: number | null;
  updatedAt: string | null;
}

export interface PermissionResponse {
  id: string;
  name: string;
  code: string;
  entity: string;
  action: string;
  description: string;
  createdAt: string;
  createdBy: number | null;
  updatedBy: number | null;
  updatedAt: string | null;
}

export interface CourseResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  link: string;
  description: string;
  level: string;
  status: string; // ACTIVE, INACTIVE, etc.
  createdAt: string;
  updatedAt: string | null;
}

export interface CategoryResponse {
  id: string;
  name: string;
  description: string;
  status: string; // ACTIVE, INACTIVE, etc.
  createdAt: string;
  updatedAt: string | null;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// Request payloads
export interface CreateUserRequest {
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  gender?: number;
  dateOfBirth?: string;
}

export interface UpdateUserRequest {
  fullName: string;
  phone?: string;
  gender?: number;
  dateOfBirth?: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  phone?: string;
  gender?: number;
  dateOfBirth?: string;
}

export interface InviteUserRequest {
  email: string;
}

export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkAssignRoleRequest {
  userIds: string[];
  roleName: string; // or code
}

export interface AssignRolesRequest {
  roleNames: string[];
}

export interface RoleRequest {
  name: string;
  description: string;
}

export interface CloneRoleRequest {
  name: string;
}

export interface AssignPermissionsRequest {
  permissionIds: string[];
}

export interface PermissionRequest {
  name: string;
  entity: string;
  action: string;
  description: string;
}

export interface CreateCourseRequest {
  categoryId: string;
  name: string;
  link: string;
  description: string;
  level: string;
}

export interface UpdateCourseRequest {
  categoryId: string;
  name: string;
  link: string;
  description: string;
  level: string;
}

export interface CreateCategoryRequest {
  name: string;
  description: string;
}

export interface UpdateCategoryRequest {
  name: string;
  description: string;
}
