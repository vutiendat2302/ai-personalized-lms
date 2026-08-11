import { useNavigate } from "react-router-dom";
import { BookOpen, ShieldCheck } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  directCourseItem?: { courseId?: string | number; id?: string | number } | null;
}

/** Giữ tương thích modal cũ và đưa người dùng về luồng checkout PayPal theo từng khóa học. */
export const CheckoutModal = ({ isOpen, onClose, directCourseItem }: CheckoutModalProps) => {
  const navigate = useNavigate();
  const { items } = useCartStore();
  const courseId = directCourseItem?.courseId ?? directCourseItem?.id ?? items[0]?.courseId;

  /** Đóng modal và mở trang chi tiết để chọn gói còn mua được từ backend. */
  const continueToCourse = () => {
    onClose();
    if (courseId != null) navigate(`/courses/${String(courseId)}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <DialogTitle>Thanh toán trực tiếp qua PayPal Sandbox</DialogTitle>
          <DialogDescription>
            Hệ thống thanh toán từng gói tại trang chi tiết khóa học để backend kiểm tra giá, quyền sở hữu và sức chứa lớp ngay trước khi tạo đơn.
          </DialogDescription>
        </DialogHeader>
        {courseId == null ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Không có khóa học để thanh toán.
          </div>
        ) : (
          <Button onClick={continueToCourse} className="w-full">
            <BookOpen className="mr-2 h-4 w-4" />Chọn gói tại trang khóa học
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};
