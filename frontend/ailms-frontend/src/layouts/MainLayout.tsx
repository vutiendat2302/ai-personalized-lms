import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthModals } from "@/components/auth/AuthModals";
import { CartDrawerModal } from "@/components/cart/CartDrawerModal";
import { CheckoutModal } from "@/components/cart/CheckoutModal";

export const MainLayout: React.FC = () => {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const location = useLocation();

  const isPortalRoute =
    location.pathname.startsWith("/teacher") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/management") ||
    location.pathname.startsWith("/sales") ||
    location.pathname.startsWith("/student");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-200">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {!isPortalRoute && <Footer />}
      {/* Global Auth & Cart Modals */}
      <AuthModals />
      <CartDrawerModal onProceedToCheckout={() => setCheckoutOpen(true)} />
      <CheckoutModal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  );
};
