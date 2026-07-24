import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-card border-t border-border/40 mt-auto transition-colors duration-200">
      <div className="mx-auto max-w-none w-full px-6 py-12 lg:px-12">
        <div className="flex flex-col md:flex-row md:justify-between gap-12 mb-12">
          
          {/* Left Side: Logo and Brand description */}
          <div className="max-w-sm space-y-4">
            <Link to="/" className="flex items-center hover:opacity-95 transition-opacity inline-block w-fit">
              <img src="/ailms_logo_full.png" alt="AILMS Logo" className="h-20 w-auto object-contain" />
            </Link>
            <p className="text-base text-muted-foreground leading-relaxed">
              Hệ thống quản lý học tập cá nhân hóa ứng dụng AI thế hệ mới. Học thông minh hơn, tiến bộ nhanh hơn.
            </p>
          </div>

          {/* Right Side: 3 Columns grouped closer together */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 lg:gap-16">
            {/* Quick Links */}
            <div>
              <h3 className="text-base font-bold tracking-wider text-foreground uppercase mb-4">Liên kết nhanh</h3>
              <ul className="space-y-2 text-base text-muted-foreground">
                <li><Link to="/#features" className="hover:text-primary transition-colors">Tính năng</Link></li>
                <li><Link to="/#courses" className="hover:text-primary transition-colors">Khóa học đề xuất</Link></li>
                <li><Link to="/#testimonials" className="hover:text-primary transition-colors">Lời chứng thực</Link></li>
                <li><Link to="/#faq" className="hover:text-primary transition-colors">Câu hỏi thường gặp</Link></li>
              </ul>
            </div>

            {/* Terms and Policies */}
            <div>
              <h3 className="text-base font-bold tracking-wider text-foreground uppercase mb-4">Điều khoản dịch vụ</h3>
              <ul className="space-y-2 text-base text-muted-foreground">
                <li><Link to="/terms#dieu-khoan-su-dung" className="hover:text-primary transition-colors">Điều khoản sử dụng</Link></li>
                <li><Link to="/terms#chinh-sach-bao-mat" className="hover:text-primary transition-colors">Chính sách bảo mật</Link></li>
                <li><Link to="/terms#ban-quyen-noi-dung" className="hover:text-primary transition-colors">Bản quyền nội dung</Link></li>
                <li><Link to="/terms#trach-nhiem-nguoi-dung" className="hover:text-primary transition-colors">Trách nhiệm người dùng</Link></li>
              </ul>
            </div>

            {/* Contact details */}
            <div className="min-w-[180px]">
              <h3 className="text-base font-bold tracking-wider text-foreground uppercase mb-4">Liên hệ</h3>
              <ul className="space-y-2 text-base text-muted-foreground">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span>Hà Nội, Việt Nam</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span>+84 962362614</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <span>support@ailms.edu.vn</span>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Section: Copyright (Left) and Social Links (Right) */}
        <div className="border-t border-border/40 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AILMS. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-4 text-muted-foreground">
            {/* GitHub */}
            <a href="https://github.com/dashboard" className="hover:text-primary transition-colors hover:scale-110 transform duration-200" title="GitHub">
              <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
            {/* Facebook */}
            <a href="https://www.facebook.com/" className="hover:text-primary transition-colors hover:scale-110 transform duration-200" title="Facebook">
              <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>
            {/* Twitter */}
            <a href="https://x.com/@" className="hover:text-primary transition-colors hover:scale-110 transform duration-200" title="Twitter">
              <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a href="https://www.linkedin.com/feed/" className="hover:text-primary transition-colors hover:scale-110 transform duration-200" title="LinkedIn">
              <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
