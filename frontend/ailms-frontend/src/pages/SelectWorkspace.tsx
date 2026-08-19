import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PORTAL_CONFIGS, getPortalHomePath, type PortalType } from "@/utils/workspaceUtils";
import { ShieldCheck, GraduationCap, BookOpen, MessageCircle, Check, ArrowRight, Sparkles } from "lucide-react";

export const SelectWorkspace: React.FC = () => {
  const { availablePortals, switchWorkspace, setDefaultWorkspace, defaultWorkspace } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Lay returnUrl tu location state neu co
  const returnUrl = (location.state as { from?: string })?.from;

  const [rememberChoice, setRememberChoice] = useState<boolean>(Boolean(defaultWorkspace));

  const handleSelectPortal = (portal: PortalType) => {
    // 1. Cap nhat Active Workspace
    switchWorkspace(portal);

    // 2. Cap nhat Default Workspace neu tich hop chon "Ghi nho"
    if (rememberChoice) {
      setDefaultWorkspace(portal);
    } else {
      setDefaultWorkspace(null);
    }

    // 3. Dieu huong toi returnUrl neu url hop le, hoac toi path mac dinh cua portal
    const defaultPath = getPortalHomePath(portal);
    if (returnUrl && returnUrl.startsWith(defaultPath)) {
      navigate(returnUrl, { replace: true });
    } else {
      navigate(defaultPath, { replace: true });
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "ShieldCheck":
        return <ShieldCheck className="w-8 h-8 text-blue-400" />;
      case "GraduationCap":
        return <GraduationCap className="w-8 h-8 text-emerald-400" />;
      case "BookOpen":
        return <BookOpen className="w-8 h-8 text-violet-400" />;
      case "MessageCircle":
        return <MessageCircle className="w-8 h-8 text-amber-400" />;
      default:
        return <Sparkles className="w-8 h-8 text-indigo-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glow Overlay */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-4xl w-full z-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            Không gian làm việc Đa vai trò (Multi-Workspace)
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Chọn Không gian làm việc
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Tài khoản của bạn được cấp quyền trên nhiều phân vùng hệ thống. Vui lòng chọn portal làm việc cho phiên này.
          </p>
        </div>

        {/* Portals Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePortals.map((portalKey) => {
            const config = PORTAL_CONFIGS[portalKey];
            if (!config) return null;

            const isDefault = defaultWorkspace === portalKey;

            return (
              <div
                key={portalKey}
                onClick={() => handleSelectPortal(portalKey)}
                className="group relative bg-slate-900/60 backdrop-blur-xl border border-slate-800 hover:border-slate-600 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/50 group-hover:scale-110 transition-transform duration-300">
                      {getIcon(config.iconName)}
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {config.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                    {config.title}
                  </h3>
                  <p className="text-xs text-indigo-400 font-medium mb-3">{config.subtitle}</p>

                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {config.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                    Truy cập Portal <ArrowRight className="w-4 h-4 ml-1.5" />
                  </div>
                  {isDefault && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Mặc định
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Option Remember Choice */}
        <div className="flex justify-center items-center">
          <label className="flex items-center gap-2.5 text-sm text-slate-400 cursor-pointer select-none bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
            />
            <span>Ghi nhớ lựa chọn và tự động vào Portal này ở các lần đăng nhập tiếp theo</span>
          </label>
        </div>
      </div>
    </div>
  );
};
