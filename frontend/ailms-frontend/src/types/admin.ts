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
  createdBy: string;
  updatedBy: string;
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
  status?: string;
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
  userIds: (string | number)[];
}

export interface BulkAssignRoleRequest {
  userIds: string[];
  roleId: string; 
}

export interface AssignRolesRequest {
  roleIds: (string | number)[];
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

export interface StudentProfileResponse {
  userId: number;
  studentCode: string;
  educationLevel: string;
  description: string;
  goal: string;
  schoolName: string;
  isMinor: boolean;
  hasGoal: boolean;
  enrolledCoursesCount?: number;
  avgGrade?: number;
  learningProgress?: number;
  certificatesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeResponse {
  userId: number;
  employeeCode: string;
  departmentId: number;
  departmentName: string;
  position: string;
  employmentTypeEnum: string;
  startDate: string;
  endDate: string;
  status: string;
  coursesCount?: number;
  categories?: string[];
  revenue?: number;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuardianResponse {
  id?: number;
  fullName: string;
  phone: string;
  email: string;
  relationship: string;
  occupation?: string;
  isPrimary?: boolean;
}

export interface UserDetailResponse {
  userAccount: UserResponse;
  studentProfile?: StudentProfileResponse | null;
  guardians?: GuardianResponse[] | null;
  employeeProfile?: EmployeeResponse | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyUserCountResponse {
  month: number;
  count: number;
}

export interface SendBulkEmailRequest {
  emails: string[];
  subject: string;
  content: string;
}

export interface BulkCreateEmployeeRequest {
  emails: string[];
  departmentId?: string | number;
  roleId?: string | number;
}

export interface BulkRemoveRoleRequest {
  userIds: (string | number)[];
  roleId: string | number;
}

export interface CreateCategoryRequest {
  name: string;
  code?: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  code?: string;
  description?: string;
  status?: string;
}

