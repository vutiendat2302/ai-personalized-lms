import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, LogOut, Mail } from "lucide-react";

export const NoWorkspacePage: React.FC = () => {
  const { auth, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Chưa được cấp Không gian làm việc</h2>
          <p className="text-slate-400 text-sm">
            Tài khoản <span className="font-semibold text-slate-200">{auth.user?.email || auth.user?.username}</span> chưa được quản trị viên gán vai trò hợp lệ để truy cập bất kỳ Portal nào trên hệ thống.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-left text-xs text-slate-300 space-y-2">
          <p className="font-medium text-slate-200">Hướng dẫn khắc phục:</p>
          <ul className="list-disc pl-4 space-y-1 text-slate-400">
            <li>Vui lòng liên hệ Bộ phận Nhân sự hoặc Admin hệ thống để gán phân quyền.</li>
            <li>Sau khi được cấp quyền, vui lòng Đăng xuất và Đăng nhập lại.</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <a
            href="mailto:support@lms.com"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-sm transition"
          >
            <Mail className="w-4 h-4" /> Liên hệ Hỗ trợ Quản trị viên
          </a>
          <button
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition border border-slate-700"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất tài khoản
          </button>
        </div>
      </div>
    </div>
  );
};
