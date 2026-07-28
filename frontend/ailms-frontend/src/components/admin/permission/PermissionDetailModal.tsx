import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FileKey,
  Shield,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Users,
  History,
  Tag,
  Activity,
  Loader2
} from "lucide-react";
import { permissionApi } from "@/api/permissions/permissionApi";
import type { PermissionResponse, RoleResponse } from "@/types/admin";

interface PermissionDetailModalProps {
  open: boolean;
  onClose: () => void;
  permission: PermissionResponse | null;
}

export const PermissionDetailModal: React.FC<PermissionDetailModalProps> = ({
  open,
  onClose,
  permission
}) => {
  if (!permission) return null;

  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    if (permission) {
      setLoadingRoles(true);
      permissionApi.getRolesByPermissionId(String(permission.id)).then(data => {
        if (data) setRoles(data);
        else setRoles([]);
      }).catch((err) => {
        console.error("Lỗi lấy danh sách role của permission:", err);
        setRoles([]);
      }).finally(() => setLoadingRoles(false));
    }
  }, [permission]);

  const isOrphan = (permission.roleCount || roles.length) === 0;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-4xl w-[92vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs">
        
        {/* FIXED HEADER */}
        <DialogHeader className="p-6 bg-gradient-to-r from-primary/10 via-card to-card border-b border-border/40 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 text-primary font-black text-xl flex items-center justify-center border-2 border-primary/30 shrink-0">
              <FileKey className="h-7 w-7" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  {permission.name || permission.code}
                </DialogTitle>
                <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  {permission.code}
                </span>
                {!isOrphan ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-xs">
                    Đang được gán ({roles.length} Roles)
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="font-bold text-xs">
                    Cảnh báo: Permission Mồ côi (No Role)
                  </Badge>
                )}
              </div>

              <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                <span>Entity: <strong className="text-foreground font-mono uppercase">{permission.entity}</strong></span>
                <span>Action: <strong className="text-primary font-mono uppercase">{permission.action}</strong></span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Section 1: Thông tin Kỹ thuật Permission */}
          <Card className="border-border shadow-xs">
            <CardHeader className="py-3 bg-muted/20 border-b border-border/30">
              <CardTitle className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase">
                <Layers className="h-4 w-4 text-primary" /> Thông tin Kỹ thuật (Technical Spec)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground font-bold block">Thực thể (Entity):</span>
                <span className="font-mono font-extrabold text-foreground text-sm uppercase">{permission.entity}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block">Hành động (Action):</span>
                <span className="font-mono font-extrabold text-primary text-sm uppercase">{permission.action}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block">Mã Code Duy Nhất:</span>
                <span className="font-mono font-bold text-foreground">{permission.code}</span>
              </div>
              <div className="sm:col-span-3">
                <span className="text-muted-foreground font-bold block">Mô tả chức năng:</span>
                <span className="text-foreground font-medium">{permission.description || "Không có mô tả chi tiết."}</span>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Bảng danh sách các Role đang sử dụng Permission này */}
          <Card className="border-border shadow-xs">
            <CardHeader className="py-3 bg-muted/20 border-b border-border/30 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase">
                <Shield className="h-4 w-4 text-purple-600" /> Danh sách Roles đang gán Quyền này ({roles.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRoles ? (
                <div className="p-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Đang tải danh sách vai trò...</span>
                </div>
              ) : roles.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs space-y-1">
                  <AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
                  <p className="font-bold text-amber-600">Permission Mồ côi (Orphan Permission)</p>
                  <p>Quyền này chưa được gán cho bất kỳ vai trò nào trong hệ thống.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {roles.map(r => (
                    <div key={r.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-600/10 text-purple-600 font-bold flex items-center justify-center border border-purple-600/20">
                          {r.name ? r.name.charAt(0).toUpperCase() : "R"}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{r.name}</span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted font-bold text-muted-foreground">{r.code}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{r.description || "System Role"}</div>
                        </div>
                      </div>

                      <Badge variant={r.isSystem ? "default" : "outline"} className="font-bold text-[10px]">
                        {r.isSystem ? "System" : "Custom"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Audit Log */}
          <Card className="border-border shadow-xs">
            <CardHeader className="py-3 bg-muted/20 border-b border-border/30">
              <CardTitle className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase">
                <History className="h-4 w-4 text-emerald-600" /> Audit Log Lịch Sử
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Khởi tạo Permission mã <strong className="text-foreground">{permission.code}</strong> qua hệ thống Migration Seed.</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
};
