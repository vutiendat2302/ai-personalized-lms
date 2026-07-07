//type/roleResponse.ts
import type { BaseEntity } from "./base";

export interface RoleEntity extends BaseEntity {
    id: string;
    username: string;
    email: string;
    code: string;
    description: string;
    isSystem: boolean;
    permissions: string[] | null;
}