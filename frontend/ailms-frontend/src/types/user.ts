import type { BaseEntity } from "./base";

export interface UserEntity extends BaseEntity {
    id: string;
    username: string;
    email: string;
    fullname: string | null;
    phone: string | null;
    avatarUrl: string | null;
    gender: number | null;
    dateOfBirth: string | null;
    attributes: string | null;
    status: string;
    lastLoginAt: string | null;
}