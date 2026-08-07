import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
export const teacherCategoryApi={
  list:async()=> (await httpClient.get<ApiResponse<any[]>>("/v1/teacher_categories/teacher-categories")).data.data,
  employees:async()=> (await httpClient.get<ApiResponse<any[]>>("/v1/employees")).data.data,
  classes:async()=> (await httpClient.get<ApiResponse<any[]>>("/v1/classes")).data.data,
  classMembers:async(userId:string|number)=> (await httpClient.get<ApiResponse<any[]>>(`/v1/classes/members/user/${userId}`)).data.data,
  assign:async(categoryId:string|number,employeeId:string|number)=> (await httpClient.post<ApiResponse<any>>(`/v1/teacher_categories/categories/${categoryId}/teachers`,{employeeId})).data.data,
  unassign:(categoryId:string|number,employeeId:string|number)=>httpClient.delete(`/v1/teacher_categories/categories/${categoryId}/teachers/${employeeId}`),
};
