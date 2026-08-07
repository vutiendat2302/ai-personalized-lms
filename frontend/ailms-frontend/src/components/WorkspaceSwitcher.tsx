import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PORTAL_CONFIGS, getPortalHomePath, type PortalType } from "@/utils/workspaceUtils";
import { ChevronDown, ShieldCheck, GraduationCap, BookOpen, Layers, Check } from "lucide-react";

export const WorkspaceSwitcher: React.FC = () => {
  const { activeWorkspace, availablePortals, switchWorkspace } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dong dropdown khi click ra ngoai
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (availablePortals.length <= 1) {
    return null; // Neur chi co 1 portal thi khong can dropdown chuyen doi
  }

  const currentConfig = activeWorkspace ? PORTAL_CONFIGS[activeWorkspace] : null;

  const handleSelect = (portal: PortalType) => {
    if (portal === activeWorkspace) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    switchWorkspace(portal);
    navigate(getPortalHomePath(portal));
  };

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case "ShieldCheck":
        return <ShieldCheck className="w-4 h-4 text-blue-400" />;
      case "GraduationCap":
        return <GraduationCap className="w-4 h-4 text-emerald-400" />;
      case "BookOpen":
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      default:
        return <Layers className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition shadow-sm"
        title="Chuyển đổi Không gian làm việc"
      >
        {getIcon(currentConfig?.iconName)}
        <span className="hidden sm:inline font-semibold">
          {currentConfig?.title || "Chọn Portal"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden py-1">
          <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Không gian làm việc của bạn
          </div>
          <div className="max-h-60 overflow-y-auto">
            {availablePortals.map((pKey) => {
              const cfg = PORTAL_CONFIGS[pKey];
              if (!cfg) return null;
              const isActive = pKey === activeWorkspace;

              return (
                <button
                  key={pKey}
                  onClick={() => handleSelect(pKey)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-xs font-medium transition ${
                    isActive
                      ? "bg-indigo-950/60 text-indigo-300 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {getIcon(cfg.iconName)}
                    <div>
                      <div>{cfg.title}</div>
                      <div className="text-[10px] text-slate-400">{cfg.subtitle}</div>
                    </div>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
