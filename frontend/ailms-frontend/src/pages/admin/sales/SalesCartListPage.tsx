import React, { useState, useEffect } from "react";
import { salesApi, type PendingUserCart } from "@/api/sales/salesApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  Mail,
  Tag,
  Clock,
  RefreshCw,
  User,
  Send,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useToast } from "@/hooks/useToast";

export const SalesCartListPage: React.FC = () => {
  const { success, error } = useToast();
  const [carts, setCarts] = useState<PendingUserCart[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCarts = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getPendingCarts();
      setCarts(data);
    } catch (err) {
      error("Không thể tải danh sách giỏ hàng treo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const handleSendReminder = async (userId: string) => {
    try {
      await salesApi.sendCartReminder(userId);
      success("Đã gửi email nhắc thanh toán cho học viên!");
    } catch {
      error("Không thể gửi email nhắc thanh toán. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Giỏ hàng đang treo (Pending Carts)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Danh sách giỏ hàng chưa thanh toán theo học viên — Phục vụ chiến dịch Remarketing & Chăm sóc khách hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCarts}
            disabled={loading}
            className="rounded-lg gap-2 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Grid of Pending Carts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {carts.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground bg-card rounded-xl border border-border/40">
            <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">Không có giỏ hàng đang treo nào</p>
          </div>
        ) : (
          carts.map((cart) => (
            <Card key={cart.userId} className="border border-border/40 shadow-xs rounded-2xl overflow-hidden bg-card space-y-4 p-5">
              {/* User Info Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                    {cart.userAvatar ? (
                      <img src={cart.userAvatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      cart.userName.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{cart.userName}</h3>
                    <p className="text-xs text-muted-foreground">{cart.userEmail} ({cart.userPhone})</p>
                  </div>
                </div>

                <div className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-full flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Để trong giỏ {cart.hoursInCart}h
                </div>
              </div>

              {/* Items in Cart */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sản phẩm trong giỏ:</span>
                {cart.cartItems.map((item) => (
                  <div key={item.id} className="p-3 bg-muted/40 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{item.packageName}</p>
                      <p className="text-[11px] text-muted-foreground">{item.courseName}</p>
                    </div>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatVND(item.price)}</span>
                  </div>
                ))}
              </div>

              {/* Total & Remarketing Action Buttons */}
              <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-muted-foreground block">Tổng giá trị giỏ:</span>
                  <span className="font-black text-base text-foreground">{formatVND(cart.totalPrice)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendReminder(cart.userId)}
                    className="text-xs font-semibold rounded-lg gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5 text-indigo-600" />
                    Nhắc thanh toán
                  </Button>
                  <Link to="/admin/coupons">
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      Tạo Coupon riêng
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
