//type/base.ts
export interface BaseEntity {
    createdAt: string | null;
    createdBy?: string | null;
    updatedAt: string | null;
    updatedBy?: string | null;
}


export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string;
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

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  details: string[] | null;
}

export interface SidebarGroup {
  title: string;
  items: {
    label: string;
    path: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}
