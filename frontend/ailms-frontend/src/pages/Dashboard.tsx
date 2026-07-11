import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { userApi } from "@/api/users/userApi";
import { roleApi } from "@/api/roles/roleApi";
import { permissionApi } from "@/api/permissions/permissionApi";
import { courseApi } from "@/api/courses/courseApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ChartTooltip
} from "recharts";
import {
  Flame,
  BookOpen,
  Trophy,
  Clock,
  ArrowRight,
  Users,
  TrendingUp,
  Sparkles,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  Edit,
  UserCheck,
  Copy,
  Shield,
  CheckCircle2,
  X,
  Mail,
  UserPlus
} from "lucide-react";

// ==========================================
// MOCK DATA INITIALIZATION & LOCALSTORAGE HELPERS
// ==========================================

const DEFAULT_PERMISSIONS = [
  { id: 1, name: "Xem thông tin người dùng", entity: "USER", action: "READ", description: "Cho phép xem danh sách và chi tiết người dùng" },
  { id: 2, name: "Thêm/Sửa người dùng", entity: "USER", action: "WRITE", description: "Cho phép tạo mới hoặc chỉnh sửa thông tin người dùng" },
  { id: 3, name: "Xóa người dùng", entity: "USER", action: "DELETE", description: "Cho phép xóa người dùng khỏi hệ thống" },
  { id: 4, name: "Xem vai trò", entity: "ROLE", action: "READ", description: "Cho phép xem danh sách vai trò" },
  { id: 5, name: "Quản lý vai trò", entity: "ROLE", action: "WRITE", description: "Cho phép thêm, sửa, gán quyền cho vai trò" },
  { id: 6, name: "Xem quyền hạn", entity: "PERMISSION", action: "READ", description: "Cho phép xem danh sách quyền hệ thống" }
];

const DEFAULT_ROLES = [
  { id: 1, name: "ADMIN", isSystem: true, description: "Quản trị viên hệ thống có toàn quyền quản trị người dùng và phân quyền.", permissions: [1, 2, 3, 4, 5, 6] },
  { id: 2, name: "TEACHER", isSystem: true, description: "Giáo viên biên soạn bài giảng, chấm điểm và xem thông tin học viên lớp học.", permissions: [1, 4] },
  { id: 3, name: "STUDENT", isSystem: true, description: "Học viên tham gia khóa học, thực hành bài tập và theo dõi lộ trình cá nhân.", permissions: [] },
  { id: 4, name: "TA", isSystem: false, description: "Trợ giảng hỗ trợ học viên giải đáp thắc mắc và chấm bài tập thực hành.", permissions: [1] }
];

const DEFAULT_USERS = [
  { id: 1, username: "datbritget", email: "dat.vt@ailms.edu.vn", fullName: "Vũ Tiến Đạt", phone: "0912345678", dateOfBirth: "2000-01-01", gender: 0, roles: ["ADMIN"], status: "ACTIVE", createdAt: "2026-07-01" },
  { id: 2, username: "huanrose", email: "huanrose@ailms.edu.vn", fullName: "Bùi Xuân Huấn", phone: "0987654321", dateOfBirth: "1985-05-05", gender: 0, roles: ["STUDENT"], status: "ACTIVE", createdAt: "2026-07-05" },
  { id: 3, username: "yennuyen", email: "yen.nh@gmail.com", fullName: "Nguyễn Hải Yến", phone: "0909090909", dateOfBirth: "2002-12-12", gender: 1, roles: ["STUDENT"], status: "ACTIVE", createdAt: "2026-07-08" },
  { id: 4, username: "trietle", email: "triet.lm@outlook.com", fullName: "Lê Minh Triết", phone: "0911223344", dateOfBirth: "1998-03-15", gender: 0, roles: ["TEACHER"], status: "ACTIVE", createdAt: "2026-07-09" }
];

const REGISTRATION_DATA = [
  { month: "T1", value: 450 },
  { month: "T2", value: 620 },
  { month: "T3", value: 890 },
  { month: "T4", value: 1200 },
  { month: "T5", value: 1500 },
  { month: "T6", value: 1800 },
];

const CATEGORY_DATA = [
  { name: "Lập trình", value: 45, color: "#FE7F2D" },
  { name: "Trí tuệ Nhân tạo", value: 30, color: "#293681" },
  { name: "Toán học", value: 15, color: "#2B5748" },
  { name: "Thiết kế UI/UX", value: 10, color: "#95CCDD" },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const user = auth.user;
  const isAdmin = user?.roles.includes("ADMIN");

  // Real database counts for Overview widgets
  const [totalRealUsers, setTotalRealUsers] = useState<number>(0);
  const [totalRealRoles, setTotalRealRoles] = useState<number>(0);
  const [totalRealPermissions, setTotalRealPermissions] = useState<number>(0);
  const [totalRealCourses, setTotalRealCourses] = useState<number>(0);
  const [totalRealCategories, setTotalRealCategories] = useState<number>(0);

  useEffect(() => {
    if (isAdmin) {
      const fetchRealStats = async () => {
        try {
          const userRes = await userApi.getUsers({ size: 1 });
          if (userRes.data.success) {
            setTotalRealUsers(userRes.data.data.totalElements || 0);
          }
        } catch (e) {
          console.error("Failed to fetch real users count:", e);
        }

        try {
          const roleRes = await roleApi.getRoles({ size: 1 });
          if (roleRes.data.success) {
            setTotalRealRoles(roleRes.data.data.totalElements || 0);
          }
        } catch (e) {
          console.error("Failed to fetch real roles count:", e);
        }

        try {
          const permRes = await permissionApi.getPermissions({ size: 1 });
          if (permRes.data.success) {
            setTotalRealPermissions(permRes.data.data.totalElements || 0);
          }
        } catch (e) {
          console.error("Failed to fetch real permissions count:", e);
        }

        try {
          const courseRes = await courseApi.searchCourses({ size: 1 });
          if (courseRes.data.success) {
            setTotalRealCourses(courseRes.data.data.totalElements || 0);
          }
        } catch (e) {
          console.error("Failed to fetch real courses count:", e);
        }

        try {
          const catRes = await courseApi.searchCategories({ size: 1 });
          if (catRes.data.success) {
            setTotalRealCategories(catRes.data.data.totalElements || 0);
          }
        } catch (e) {
          console.error("Failed to fetch real categories count:", e);
        }
      };

      fetchRealStats();
    }
  }, [isAdmin]);

  // Admin Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "roles" | "permissions">("overview");

  // State Management for Mock database
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);

  // Search & Filter States
  const [searchUser, setSearchUser] = useState("");
  const [filterUserRole, setFilterUserRole] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [searchPermission, setSearchPermission] = useState("");

  // Selection state for Bulk Actions
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // Notification Banner
  const [successBanner, setSuccessBanner] = useState("");

  // Modals States
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<any | null>(null);

  const [assignRoleModalOpen, setAssignRoleModalOpen] = useState(false);
  const [assigningUser, setAssigningUser] = useState<any | null>(null);
  
  const [bulkAssignRoleModalOpen, setBulkAssignRoleModalOpen] = useState(false);

  const [assignPermissionsModalOpen, setAssignPermissionsModalOpen] = useState(false);
  const [assigningRole, setAssigningRole] = useState<any | null>(null);

  // Initialize DB from LocalStorage or Defaults
  useEffect(() => {
    const storedUsers = localStorage.getItem("mock_db_users");
    const storedRoles = localStorage.getItem("mock_db_roles");
    const storedPermissions = localStorage.getItem("mock_db_permissions");

    if (storedUsers) setUsers(JSON.parse(storedUsers));
    else {
      setUsers(DEFAULT_USERS);
      localStorage.setItem("mock_db_users", JSON.stringify(DEFAULT_USERS));
    }

    if (storedRoles) setRoles(JSON.parse(storedRoles));
    else {
      setRoles(DEFAULT_ROLES);
      localStorage.setItem("mock_db_roles", JSON.stringify(DEFAULT_ROLES));
    }

    if (storedPermissions) setPermissions(JSON.parse(storedPermissions));
    else {
      setPermissions(DEFAULT_PERMISSIONS);
      localStorage.setItem("mock_db_permissions", JSON.stringify(DEFAULT_PERMISSIONS));
    }
  }, []);

  const updateLocalStorage = (newUsers: any[], newRoles: any[], newPerms: any[]) => {
    setUsers(newUsers);
    setRoles(newRoles);
    setPermissions(newPerms);
    localStorage.setItem("mock_db_users", JSON.stringify(newUsers));
    localStorage.setItem("mock_db_roles", JSON.stringify(newRoles));
    localStorage.setItem("mock_db_permissions", JSON.stringify(newPerms));
  };

  const showBanner = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(""), 3000);
  };

  // ==========================================
  // USER CRUD OPERATIONS
  // ==========================================
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const fullName = data.get("fullName") as string;
    const email = data.get("email") as string;
    const phone = data.get("phone") as string;
    const gender = parseInt(data.get("gender") as string);
    const dateOfBirth = data.get("dateOfBirth") as string;

    if (editingUser) {
      // Update
      const updated = users.map((u) =>
        u.id === editingUser.id ? { ...u, fullName, email, phone, gender, dateOfBirth } : u
      );
      updateLocalStorage(updated, roles, permissions);
      showBanner("Cập nhật thông tin người dùng thành công!");
    } else {
      // Create
      const username = data.get("username") as string;
      const newUser = {
        id: Date.now(),
        username,
        email,
        fullName,
        phone,
        gender,
        dateOfBirth,
        roles: ["STUDENT"],
        status: "ACTIVE",
        createdAt: new Date().toISOString().split("T")[0]
      };
      updateLocalStorage([...users, newUser], roles, permissions);
      showBanner("Thêm người dùng mới thành công!");
    }
    setUserModalOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
      const updated = users.filter((u) => u.id !== id);
      updateLocalStorage(updated, roles, permissions);
      showBanner("Xóa người dùng thành công!");
      setSelectedUserIds(selectedUserIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    showBanner(`Lời mời đã được gửi thành công đến: ${inviteEmail}`);
    setInviteModalOpen(false);
    setInviteEmail("");
  };

  const handleAssignRoles = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const selectedRoles = data.getAll("userRoles") as string[];

    const updated = users.map((u) =>
      u.id === assigningUser.id ? { ...u, roles: selectedRoles } : u
    );
    updateLocalStorage(updated, roles, permissions);
    showBanner(`Gán vai trò cho ${assigningUser.fullName} thành công!`);
    setAssignRoleModalOpen(false);
    setAssigningUser(null);
  };

  // Bulk operations
  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) return;
    if (window.confirm(`Xóa ${selectedUserIds.length} người dùng đã chọn?`)) {
      const updated = users.filter((u) => !selectedUserIds.includes(u.id));
      updateLocalStorage(updated, roles, permissions);
      showBanner("Đã xóa hàng loạt người dùng thành công!");
      setSelectedUserIds([]);
    }
  };

  const handleBulkAssignRole = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const targetRole = data.get("bulkRole") as string;

    const updated = users.map((u) => {
      if (selectedUserIds.includes(u.id)) {
        // Prevent duplicate roles
        const current = [...u.roles];
        if (!current.includes(targetRole)) current.push(targetRole);
        return { ...u, roles: current };
      }
      return u;
    });

    updateLocalStorage(updated, roles, permissions);
    showBanner(`Đã gán vai trò ${targetRole} cho ${selectedUserIds.length} người dùng!`);
    setBulkAssignRoleModalOpen(false);
    setSelectedUserIds([]);
  };

  // ==========================================
  // ROLE CRUD & PERMISSIONS ASSIGNMENT
  // ==========================================
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const name = (data.get("name") as string).toUpperCase();
    const description = data.get("description") as string;

    if (editingRole) {
      const updated = roles.map((r) =>
        r.id === editingRole.id ? { ...r, name, description } : r
      );
      updateLocalStorage(users, updated, permissions);
      showBanner("Cập nhật vai trò thành công!");
    } else {
      const newRole = {
        id: Date.now(),
        name,
        isSystem: false,
        description,
        permissions: []
      };
      updateLocalStorage(users, [...roles, newRole], permissions);
      showBanner("Tạo vai trò mới thành công!");
    }
    setRoleModalOpen(false);
    setEditingRole(null);
  };

  const handleCloneRole = (role: any) => {
    const newRole = {
      id: Date.now(),
      name: `${role.name}_CLONE`,
      isSystem: false,
      description: `Bản sao của ${role.name}. ${role.description}`,
      permissions: [...role.permissions]
    };
    updateLocalStorage(users, [...roles, newRole], permissions);
    showBanner(`Nhân bản vai trò ${role.name} thành công!`);
  };

  const handleDeleteRole = (id: number, roleName: string) => {
    const role = roles.find(r => r.id === id);
    if (role?.isSystem) {
      alert("Không thể xóa vai trò hệ thống!");
      return;
    }
    if (window.confirm(`Xóa vai trò ${roleName}?`)) {
      const updated = roles.filter((r) => r.id !== id);
      updateLocalStorage(users, updated, permissions);
      showBanner("Xóa vai trò thành công!");
    }
  };

  const handleAssignPermissions = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const checkedPerms = data.getAll("assignedPerms").map(p => parseInt(p as string));

    const updated = roles.map((r) =>
      r.id === assigningRole.id ? { ...r, permissions: checkedPerms } : r
    );
    updateLocalStorage(users, updated, permissions);
    showBanner(`Cập nhật quyền hạn cho vai trò ${assigningRole.name} thành công!`);
    setAssignPermissionsModalOpen(false);
    setAssigningRole(null);
  };

  // ==========================================
  // PERMISSION CRUD OPERATIONS
  // ==========================================
  const handleSavePermission = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const name = data.get("name") as string;
    const entity = (data.get("entity") as string).toUpperCase();
    const action = (data.get("action") as string).toUpperCase();
    const description = data.get("description") as string;

    if (editingPermission) {
      const updated = permissions.map((p) =>
        p.id === editingPermission.id ? { ...p, name, entity, action, description } : p
      );
      updateLocalStorage(users, roles, updated);
      showBanner("Cập nhật quyền thành công!");
    } else {
      const newPerm = {
        id: Date.now(),
        name,
        entity,
        action,
        description
      };
      updateLocalStorage(users, roles, [...permissions, newPerm]);
      showBanner("Tạo quyền mới thành công!");
    }
    setPermissionModalOpen(false);
    setEditingPermission(null);
  };

  const handleDeletePermission = (id: number, name: string) => {
    if (window.confirm(`Xóa quyền ${name}?`)) {
      const updated = permissions.filter((p) => p.id !== id);
      // Remove this permission from any roles as well
      const updatedRoles = roles.map((r) => ({
        ...r,
        permissions: r.permissions.filter((pId: number) => pId !== id)
      }));
      updateLocalStorage(users, updatedRoles, updated);
      showBanner("Xóa quyền thành công!");
    }
  };

  // ==========================================
  // FILTERS & CALCULATIONS
  // ==========================================
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.username.toLowerCase().includes(searchUser.toLowerCase());
    const matchesRole = filterUserRole ? u.roles.includes(filterUserRole) : true;
    return matchesSearch && matchesRole;
  });

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(searchRole.toLowerCase()) ||
    r.description.toLowerCase().includes(searchRole.toLowerCase())
  );

  const filteredPermissions = permissions.filter((p) =>
    p.name.toLowerCase().includes(searchPermission.toLowerCase()) ||
    p.entity.toLowerCase().includes(searchPermission.toLowerCase()) ||
    p.action.toLowerCase().includes(searchPermission.toLowerCase())
  );

  // Toggle selection for check all users
  const handleSelectAllUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (id: number) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  // Student dashboard view
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in-50 duration-300">
        
        {/* Banner Chào Mừng */}
        <div className="relative rounded-2xl bg-gradient-to-r from-primary to-indigo-950 p-6 md:p-8 text-white overflow-hidden shadow-lg shadow-primary/10">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 hidden md:block">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full text-white">
              <path d="M30,0 L100,0 L100,100 L0,100 Z" />
            </svg>
          </div>
          <div className="relative space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-1 bg-accent px-2.5 py-1 rounded-full text-xs font-bold text-accent-foreground">
              <Flame className="h-4 w-4 fill-white stroke-white" />
              <span>Streak 5 Ngày Học 🔥</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Chào mừng trở lại, {user?.fullName || user?.username}!
            </h1>
            <p className="text-sm text-indigo-150 leading-relaxed">
              Lộ trình AI hôm nay đã chuẩn bị sẵn sàng cho bạn. Bạn có mục tiêu hoàn thành 2 bài học để giữ vững Streak và củng cố kiến thức giải thuật của mình.
            </p>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-xl px-5 py-2.5 shadow-md shadow-accent/15 transition-transform hover:-translate-y-0.5">
              <span>Học tiếp ngay</span>
              <PlayCircle className="ml-1.5 h-4.5 w-4.5" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-border/80 shadow-sm bg-card hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Streak hiện tại</p>
                <p className="text-2xl font-extrabold text-accent">5 Ngày 🔥</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/10 text-accent">
                <Flame className="h-5 w-5 fill-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm bg-card hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Bài học đã xong</p>
                <p className="text-2xl font-extrabold text-foreground">18 / 24</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm bg-card hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Tổng thời gian</p>
                <p className="text-2xl font-extrabold text-foreground">12.5 Giờ</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 text-green-600">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm bg-card hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Điểm số trung bình</p>
                <p className="text-2xl font-extrabold text-foreground">92 / 100</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
                <Trophy className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Đang học gần đây</h2>
              <span className="text-xs font-bold text-primary cursor-pointer hover:underline">Xem tất cả</span>
            </div>

            <Card className="border-border bg-card shadow-sm overflow-hidden group">
              <div className="aspect-video w-full overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=800&auto=format&fit=crop&q=60"
                  alt=" DSA Course"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-5">
                  <div className="text-white space-y-1">
                    <span className="text-[10px] font-bold bg-accent text-accent-foreground px-2 py-0.5 rounded">
                      Cấu trúc dữ liệu & Giải thuật
                    </span>
                    <h3 className="text-lg font-bold">Cấu trúc dữ liệu & Giải thuật bằng C++</h3>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-muted-foreground">Tiến độ khóa học</span>
                    <span className="text-primary">65% Hoàn thành</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <p className="text-xs text-muted-foreground font-semibold">
                    Bài tiếp theo: Đồ thị (Graphs) - Các thuật toán tìm kiếm DFS & BFS
                  </p>
                  <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold">
                    <span>Học tiếp</span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <h2 className="text-lg font-bold text-foreground">AI Gợi ý cho bạn</h2>
            </div>

            <div className="space-y-4">
              <Card className="border-border hover:border-primary/40 transition-colors shadow-sm bg-card cursor-pointer">
                <CardContent className="p-4 flex gap-4">
                  <img
                    src="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=150&auto=format&fit=crop&q=60"
                    alt="Python Course"
                    className="h-16 w-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-foreground truncate">Python nâng cao cho AI</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Lý do: Giúp bổ trợ phần tối ưu hóa mô hình</p>
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className="text-primary font-bold">40 giờ học</span>
                      <span className="font-bold text-accent">★ 4.8</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:border-primary/40 transition-colors shadow-sm bg-card cursor-pointer">
                <CardContent className="p-4 flex gap-4">
                  <img
                    src="https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=150&auto=format&fit=crop&q=60"
                    alt="ML Course"
                    className="h-16 w-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-foreground truncate">Nhập môn Machine Learning</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Lý do: Lộ trình định hướng AI Engineer</p>
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className="text-primary font-bold">50 giờ học</span>
                      <span className="font-bold text-accent">★ 4.95</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:border-primary/40 transition-colors shadow-sm bg-card cursor-pointer">
                <CardContent className="p-4 flex gap-4">
                  <img
                    src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=150&auto=format&fit=crop&q=60"
                    alt="Math Course"
                    className="h-16 w-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-foreground truncate">Toán rời rạc ứng dụng</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Lý do: Phát triển tư duy logic thuật toán</p>
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className="text-primary font-bold">32 giờ học</span>
                      <span className="font-bold text-accent">★ 4.9</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMIN CONSOLE VIEW (WITH CRUD PANELS)
  // ==========================================
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Success banner notifications */}
      {successBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-green-500 text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Hệ thống Quản trị viên (Admin Dashboard)</h1>
          <p className="text-sm text-muted-foreground">Phân quyền, quản lý vai trò và theo dõi số liệu người dùng.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-primary/10 px-3 py-1.5 rounded-lg text-primary font-bold">
          <TrendingUp className="h-4 w-4" />
          <span>Real-time Sync</span>
        </div>
      </div>

      {/* Management Tabs Navigation */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all shrink-0 ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Tổng quan
        </button>
        <button
          onClick={() => navigate("/admin/users")}
          className="px-4 py-2.5 text-sm font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all shrink-0"
        >
          Quản lý Người dùng
        </button>
        <button
          onClick={() => navigate("/admin/roles")}
          className="px-4 py-2.5 text-sm font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all shrink-0"
        >
          Quản lý Vai trò
        </button>
        <button
          onClick={() => navigate("/admin/permissions")}
          className="px-4 py-2.5 text-sm font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all shrink-0"
        >
          Quản lý Quyền
        </button>
        <button
          onClick={() => navigate("/admin/courses")}
          className="px-4 py-2.5 text-sm font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all shrink-0"
        >
          Quản lý Khóa học
        </button>
        <button
          onClick={() => navigate("/activity-log")}
          className="px-4 py-2.5 text-sm font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all shrink-0"
        >
          Nhật ký hệ thống
        </button>
      </div>

      {/* ==========================================
          TAB 1: OVERVIEW PANEL
          ========================================== */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in-30 duration-200">
          {/* Admin Widgets */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Card className="border-border/80 shadow-sm bg-card">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Tổng người dùng</p>
                  <p className="text-2xl font-extrabold text-foreground">{totalRealUsers}</p>
                  <p className="text-[10px] text-green-600 font-bold flex items-center gap-0.5">
                    <span>Hoạt động</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm bg-card">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Vai trò cấu hình</p>
                  <p className="text-2xl font-extrabold text-foreground">{totalRealRoles}</p>
                  <p className="text-[10px] text-primary font-bold">
                    Quyền hạn chi tiết
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-accent/10 text-accent">
                  <Shield className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm bg-card">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Tổng quyền hạn</p>
                  <p className="text-2xl font-extrabold text-foreground">{totalRealPermissions}</p>
                  <p className="text-[10px] text-green-600 font-bold">
                    Đầy đủ CRUD
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/10 text-green-600">
                  <Trophy className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm bg-card">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Khóa học hệ thống</p>
                  <p className="text-2xl font-extrabold text-foreground">{totalRealCourses}</p>
                  <p className="text-[10px] text-primary font-bold">
                    {totalRealCategories} danh mục
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
                  <BookOpen className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-border shadow-sm bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Số lượng người đăng ký mới (6 tháng gần đây)</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Thống kê lượng học viên đăng ký qua từng tháng.</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={REGISTRATION_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: "11px" }} />
                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: "11px" }} />
                      <ChartTooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} />
                      <Bar dataKey="value" fill="#293681" radius={[4, 4, 0, 0]}>
                        {REGISTRATION_DATA.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 5 ? "#FE7F2D" : "#293681"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Danh mục khóa học hoàn thành</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Tỷ lệ phân bố các môn học được hoàn thành nhiều nhất.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 flex flex-col items-center justify-center">
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={CATEGORY_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {CATEGORY_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-4 pt-4 border-t border-border/80">
                  {CATEGORY_DATA.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-muted-foreground truncate">{cat.name}:</span>
                      <span className="font-bold text-foreground">{cat.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick shortcuts to management pages */}
          <div className="space-y-4 pt-2">
            <h2 className="text-base font-bold text-foreground">Phím tắt quản lý hệ thống</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card 
                onClick={() => navigate("/admin/courses")}
                className="border-border hover:border-primary/40 hover:shadow-md transition-all bg-card cursor-pointer group"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Quản lý Khóa học</h4>
                    <p className="text-[10px] text-muted-foreground">Tạo mới khóa học, danh mục học liệu</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                onClick={() => navigate("/admin/users")}
                className="border-border hover:border-primary/40 hover:shadow-md transition-all bg-card cursor-pointer group"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Quản lý Người dùng</h4>
                    <p className="text-[10px] text-muted-foreground">Cấp tài khoản, gán vai trò & mời thành viên</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                onClick={() => navigate("/admin/roles")}
                className="border-border hover:border-primary/40 hover:shadow-md transition-all bg-card cursor-pointer group"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Quản lý Vai trò</h4>
                    <p className="text-[10px] text-muted-foreground">Sao chép vai trò & cấu hình quyền hạn</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                onClick={() => navigate("/activity-log")}
                className="border-border hover:border-primary/40 hover:shadow-md transition-all bg-card cursor-pointer group"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Nhật ký Hệ thống</h4>
                    <p className="text-[10px] text-muted-foreground">Xem toàn bộ lịch sử thao tác của các tài khoản</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: USER MANAGEMENT PANEL
          ========================================== */}
      {activeTab === "users" && (
        <Card className="border-border shadow-sm bg-card animate-in fade-in-30 duration-200">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
            <div>
              <CardTitle className="text-lg font-bold font-heading">Danh sách người dùng</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Quản lý tài khoản học sinh, giáo viên, gán vai trò & gửi email mời tham gia.
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Actions Button */}
              {selectedUserIds.length > 0 && (
                <>
                  <Button
                    onClick={() => setBulkAssignRoleModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 text-primary border-primary/30"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Gán vai trò loạt ({selectedUserIds.length})</span>
                  </Button>
                  <Button
                    onClick={handleBulkDelete}
                    variant="destructive"
                    size="sm"
                    className="h-9 gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Xóa hàng loạt</span>
                  </Button>
                </>
              )}

              {/* Invite User Button */}
              <Button
                onClick={() => setInviteModalOpen(true)}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
              >
                <Mail className="h-4 w-4" />
                <span>Mời người dùng</span>
              </Button>

              {/* Create User Button */}
              <Button
                onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
                variant="default"
                size="sm"
                className="h-9 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm người dùng</span>
              </Button>
            </div>
          </CardHeader>

          {/* Search & Filter Bar */}
          <div className="p-4 flex flex-col sm:flex-row gap-3 bg-muted/20 border-b border-border/80">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm theo Tên, Email hoặc Tài khoản..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <select
              value={filterUserRole}
              onChange={(e) => setFilterUserRole(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none"
            >
              <option value="">Tất cả vai trò</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Users Table */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border/85 text-muted-foreground text-xs font-semibold bg-muted/10">
                    <th className="py-3 px-4 w-8">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleSelectAllUsers}
                        className="rounded border-border text-primary focus:ring-0"
                      />
                    </th>
                    <th className="py-3 px-2">Người dùng</th>
                    <th className="py-3 px-2">Liên hệ</th>
                    <th className="py-3 px-2">Vai trò</th>
                    <th className="py-3 px-2">Trạng thái</th>
                    <th className="py-3 px-2">Ngày tham gia</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                        Không tìm thấy người dùng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => handleSelectUser(u.id)}
                            className="rounded border-border text-primary focus:ring-0"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-bold text-foreground">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-xs">
                          <p className="text-muted-foreground">{u.email}</p>
                          <p className="text-muted-foreground">{u.phone}</p>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((rName: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold uppercase">
                                {rName}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-xs">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            u.status === "ACTIVE" ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">{u.createdAt}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => { setAssigningUser(u); setAssignRoleModalOpen(true); }}
                              variant="ghost"
                              size="icon-xs"
                              title="Gán vai trò"
                              className="text-primary hover:bg-primary/10"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => { setEditingUser(u); setUserModalOpen(true); }}
                              variant="ghost"
                              size="icon-xs"
                              title="Chỉnh sửa"
                              className="text-muted-foreground hover:bg-muted"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteUser(u.id)}
                              variant="ghost"
                              size="icon-xs"
                              title="Xóa"
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==========================================
          TAB 3: ROLE MANAGEMENT PANEL
          ========================================== */}
      {activeTab === "roles" && (
        <Card className="border-border shadow-sm bg-card animate-in fade-in-30 duration-200">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
            <div>
              <CardTitle className="text-lg font-bold font-heading">Quản lý Vai trò (Roles)</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Tạo vai trò, cấu hình quyền hạn nghiệp vụ cho giảng viên, học sinh và nhân viên hành chính.
              </CardDescription>
            </div>
            
            <Button
              onClick={() => { setEditingRole(null); setRoleModalOpen(true); }}
              variant="default"
              size="sm"
              className="h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm vai trò</span>
            </Button>
          </CardHeader>

          {/* Search bar */}
          <div className="p-4 bg-muted/20 border-b border-border/80">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm theo Tên vai trò hoặc Mô tả..."
                value={searchRole}
                onChange={(e) => setSearchRole(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Roles Table */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border/85 text-muted-foreground text-xs font-semibold bg-muted/10">
                    <th className="py-3 px-4">Tên vai trò</th>
                    <th className="py-3 px-2">Mô tả</th>
                    <th className="py-3 px-2">Hệ thống</th>
                    <th className="py-3 px-2">Số lượng quyền</th>
                    <th className="py-3 px-2">Thành viên</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRoles.map((r) => {
                    const memberCount = users.filter((u) => u.roles.includes(r.name)).length;
                    return (
                      <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-bold uppercase">
                            {r.name}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">{r.description}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.isSystem ? "bg-indigo-500/10 text-indigo-600" : "bg-orange-500/10 text-orange-600"
                          }`}>
                            {r.isSystem ? "Hệ thống" : "Tùy chỉnh"}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-bold text-xs text-foreground">
                          {r.permissions.length} quyền hạn
                        </td>
                        <td className="py-3 px-2 text-xs font-bold text-muted-foreground">
                          {memberCount} người dùng
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => { setAssigningRole(r); setAssignPermissionsModalOpen(true); }}
                              variant="ghost"
                              size="icon-xs"
                              title="Phân quyền"
                              className="text-primary hover:bg-primary/10"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleCloneRole(r)}
                              variant="ghost"
                              size="icon-xs"
                              title="Nhân bản"
                              className="text-green-600 hover:bg-green-500/10"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {!r.isSystem && (
                              <>
                                <Button
                                  onClick={() => { setEditingRole(r); setRoleModalOpen(true); }}
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Chỉnh sửa"
                                  className="text-muted-foreground hover:bg-muted"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteRole(r.id, r.name)}
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Xóa"
                                  className="text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==========================================
          TAB 4: PERMISSION MANAGEMENT PANEL
          ========================================== */}
      {activeTab === "permissions" && (
        <Card className="border-border shadow-sm bg-card animate-in fade-in-30 duration-200">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
            <div>
              <CardTitle className="text-lg font-bold font-heading">Quản lý Quyền hạn (Permissions)</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Quản trị chi tiết các quyền CRUD truy cập Module nghiệp vụ (USER, ROLE, COURSE, v.v.).
              </CardDescription>
            </div>
            
            <Button
              onClick={() => { setEditingPermission(null); setPermissionModalOpen(true); }}
              variant="default"
              size="sm"
              className="h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm quyền mới</span>
            </Button>
          </CardHeader>

          {/* Search bar */}
          <div className="p-4 bg-muted/20 border-b border-border/80">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm theo Tên quyền, Thực thể (Entity) hoặc Hành động (Action)..."
                value={searchPermission}
                onChange={(e) => setSearchPermission(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Permissions Table */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border/85 text-muted-foreground text-xs font-semibold bg-muted/10">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-2">Tên quyền</th>
                    <th className="py-3 px-2">Thực thể</th>
                    <th className="py-3 px-2">Hành động</th>
                    <th className="py-3 px-2">Mô tả</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                        Không tìm thấy quyền hạn nào.
                      </td>
                    </tr>
                  ) : (
                    filteredPermissions.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-bold text-xs text-muted-foreground">#{p.id}</td>
                        <td className="py-3 px-2 font-bold text-foreground text-xs">{p.name}</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-bold uppercase">
                            {p.entity}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.action === "READ" ? "bg-green-500/10 text-green-600" :
                            p.action === "WRITE" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                          }`}>
                            {p.action}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">{p.description}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => { setEditingPermission(p); setPermissionModalOpen(true); }}
                              variant="ghost"
                              size="icon-xs"
                              title="Chỉnh sửa"
                              className="text-muted-foreground hover:bg-muted"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeletePermission(p.id, p.name)}
                              variant="ghost"
                              size="icon-xs"
                              title="Xóa"
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==========================================
          MODALS & OVERLAYS
          ========================================== */}

      {/* 1. Create/Edit User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setUserModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            
            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingUser ? "Cập nhật người dùng" : "Thêm người dùng mới"}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {!editingUser && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tên tài khoản (username)</Label>
                  <Input type="text" name="username" placeholder="datbritget" required className="h-9" />
                </div>
              )}
              
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Họ và tên</Label>
                <Input type="text" name="fullName" defaultValue={editingUser?.fullName || ""} placeholder="Vũ Tiến Đạt" required className="h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email</Label>
                <Input type="email" name="email" defaultValue={editingUser?.email || ""} placeholder="dat.vt@ailms.edu.vn" required className="h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Số điện thoại</Label>
                <Input type="text" name="phone" defaultValue={editingUser?.phone || ""} placeholder="0912345678" required className="h-9" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Giới tính</Label>
                  <select name="gender" defaultValue={editingUser?.gender ?? "0"} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                    <option value="0">Nam</option>
                    <option value="1">Nữ</option>
                    <option value="2">Khác</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Ngày sinh</Label>
                  <Input type="date" name="dateOfBirth" defaultValue={editingUser?.dateOfBirth || ""} required className="h-9" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" variant="default" className="h-9">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Invite User Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setInviteModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Mời người dùng tham gia</h3>
            <p className="text-xs text-muted-foreground mb-4">Gửi email kèm đường dẫn đăng ký và mã mời đặc biệt.</p>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Địa chỉ Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="email.nhan@gmail.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" variant="default" className="h-9 gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  <span>Gửi lời mời</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create/Edit Role Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setRoleModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingRole ? "Cập nhật vai trò" : "Thêm vai trò mới"}
            </h3>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tên vai trò (Vd: MANAGER, AUDITOR)</Label>
                <Input type="text" name="name" defaultValue={editingRole?.name || ""} placeholder="E.g. STAFF" required className="h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mô tả mục đích vai trò</Label>
                <textarea
                  name="description"
                  defaultValue={editingRole?.description || ""}
                  placeholder="E.g. Hỗ trợ sự vụ hành chính và tổ chức giảng đường..."
                  required
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setRoleModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" variant="default" className="h-9">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Create/Edit Permission Modal */}
      {permissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setPermissionModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingPermission ? "Cập nhật quyền hạn" : "Tạo quyền hạn mới"}
            </h3>

            <form onSubmit={handleSavePermission} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tên quyền hiển thị</Label>
                <Input type="text" name="name" defaultValue={editingPermission?.name || ""} placeholder="Xem khóa học của tôi" required className="h-9" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Thực thể (Entity)</Label>
                  <Input type="text" name="entity" defaultValue={editingPermission?.entity || ""} placeholder="COURSE" required className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Hành động (Action)</Label>
                  <select name="action" defaultValue={editingPermission?.action || "READ"} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                    <option value="READ">READ</option>
                    <option value="WRITE">WRITE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mô tả quyền hạn</Label>
                <textarea
                  name="description"
                  defaultValue={editingPermission?.description || ""}
                  placeholder="Cho phép đọc thông tin cơ bản về danh sách và chi tiết các khóa học được phân bổ..."
                  required
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setPermissionModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" variant="default" className="h-9">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Individual Assign Roles Modal */}
      {assignRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setAssignRoleModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Gán vai trò thành viên</h3>
            <p className="text-xs text-muted-foreground mb-4">Gán các vai trò cho người dùng: <strong>{assigningUser?.fullName}</strong></p>

            <form onSubmit={handleAssignRoles} className="space-y-4">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name="userRoles"
                      value={r.name}
                      defaultChecked={assigningUser?.roles.includes(r.name)}
                      className="rounded border-border text-primary focus:ring-0 h-4 w-4"
                    />
                    <div>
                      <p className="text-xs font-bold text-foreground">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setAssignRoleModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" variant="default" className="h-9">Cập nhật</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Bulk Assign Roles Modal */}
      {bulkAssignRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setBulkAssignRoleModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Gán vai trò hàng loạt</h3>
            <p className="text-xs text-muted-foreground mb-4">Gán vai trò chọn lựa cho {selectedUserIds.length} người dùng đã tick chọn.</p>

            <form onSubmit={handleBulkAssignRole} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Chọn vai trò cần bổ sung</Label>
                <select name="bulkRole" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>{r.name} - {r.description.slice(0, 35)}...</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setBulkAssignRoleModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" variant="default" className="h-9">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Assign Permissions to Role Modal */}
      {assignPermissionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setAssignPermissionsModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Cấu hình Quyền hạn</h3>
            <p className="text-xs text-muted-foreground mb-4">Gán các quyền cụ thể cho vai trò: <strong className="uppercase">{assigningRole?.name}</strong></p>

            <form onSubmit={handleAssignPermissions} className="space-y-4">
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {permissions.map((p) => (
                  <label key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name="assignedPerms"
                      value={p.id}
                      defaultChecked={assigningRole?.permissions.includes(p.id)}
                      className="rounded border-border text-primary focus:ring-0 h-4 w-4"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground">{p.name}</p>
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-100 text-slate-600 font-bold uppercase">{p.entity}:{p.action}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{p.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setAssignPermissionsModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" variant="default" className="h-9">Lưu thay đổi</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
