//type/base.ts
export interface BaseEntity {
    createdAt: string | null;
    createdBy?: string | null;
    updatedAt: string | null;
    updatedBy?: string | null;
}