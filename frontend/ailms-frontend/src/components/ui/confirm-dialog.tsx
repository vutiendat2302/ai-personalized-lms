import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, HelpCircle } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default" | "warning";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title = "Xác nhận thao tác",
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  variant = "destructive",
  loading = false,
  onConfirm,
}) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } finally {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-w-md w-[92vw] p-6 rounded-2xl bg-card border border-border/40 shadow-2xl"
      >
        <DialogHeader className="flex flex-col items-center text-center gap-2">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center ${
              variant === "destructive"
                ? "bg-red-500/10 text-red-600 border border-red-500/20"
                : variant === "warning"
                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                : "bg-primary/10 text-primary border border-primary/20"
            }`}
          >
            {variant === "destructive" ? (
              <AlertTriangle className="h-6 w-6" />
            ) : variant === "warning" ? (
              <HelpCircle className="h-6 w-6" />
            ) : (
              <Info className="h-6 w-6" />
            )}
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto font-bold text-xs cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "warning" ? "default" : variant}
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full sm:w-auto font-bold text-xs cursor-pointer"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
