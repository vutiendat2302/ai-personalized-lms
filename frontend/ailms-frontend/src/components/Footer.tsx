import React from "react";
import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-card border-t border-border mt-auto transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Logo and Brand description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AILMS
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hệ thống quản lý học tập cá nhân hóa ứng dụng AI thế hệ mới. Học thông minh hơn, tiến bộ nhanh hơn.
            </p>
            <div className="flex gap-4 text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold tracking-wider text-foreground uppercase mb-4">Liên kết nhanh</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Tính năng</a></li>
              <li><a href="#courses" className="hover:text-primary transition-colors">Khóa học đề xuất</a></li>
              <li><a href="#testimonials" className="hover:text-primary transition-colors">Lời chứng thực</a></li>
              <li><a href="#faq" className="hover:text-primary transition-colors">Câu hỏi thường gặp</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-bold tracking-wider text-foreground uppercase mb-4">Chủ đề học</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Lập trình & CS</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Toán học nâng cao</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Vật lý mô phỏng</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Ngoại ngữ & Kỹ năng</a></li>
            </ul>
          </div>

          {/* Contact details */}
          <div>
            <h3 className="text-sm font-bold tracking-wider text-foreground uppercase mb-4">Liên hệ</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span>Hà Nội, Việt Nam</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>+84 (0) 123 456 789</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>support@ailms.edu.vn</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AILMS. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Chính sách bảo mật</a>
            <a href="#" className="hover:underline">Điều khoản dịch vụ</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
