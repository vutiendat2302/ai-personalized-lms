import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ShieldCheck, Scale, FileText, Lock, BookOpen, AlertCircle, Calendar, ChevronDown, ChevronUp } from "lucide-react";

export const Terms: React.FC = () => {
  const location = useLocation();
  
  // Section collapse states
  const [expanded, setExpanded] = useState({
    dieuKhoanSuDung: false,
    chinhSachBaoMat: false,
    banQuyenNoiDung: false,
    trachNhiemNguoiDung: false,
  });

  const toggle = (section: keyof typeof expanded) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Scroll to hash and auto-expand on hash change
  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const id = hash.substring(1);
      
      // Auto expand the targeted section
      if (id === "dieu-khoan-su-dung") setExpanded(prev => ({ ...prev, dieuKhoanSuDung: true }));
      if (id === "chinh-sach-bao-mat") setExpanded(prev => ({ ...prev, chinhSachBaoMat: true }));
      if (id === "ban-quyen-noi-dung") setExpanded(prev => ({ ...prev, banQuyenNoiDung: true }));
      if (id === "trach-nhiem-nguoi-dung") setExpanded(prev => ({ ...prev, trachNhiemNguoiDung: true }));

      // Wait a moment for layout to adjust, then scroll smoothly
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  }, [location.hash]);

  return (
    <div className="mx-auto max-w-none w-full px-6 py-8 lg:px-12 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary to-indigo-950 p-6 md:p-8 text-white overflow-hidden shadow-lg shadow-primary/10">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 hidden md:block">
          <Scale className="w-full h-full text-white transform translate-x-10 translate-y-10" />
        </div>
        <div className="relative space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-sm font-bold text-neutral-light-gray">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Cập nhật mới nhất: 17-7-2026</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Điều Khoản & Chính Sách AILMS</h1>
          <p className="text-base text-neutral-light-gray leading-relaxed">
            Các văn bản pháp lý chính thức điều chỉnh quyền lợi, nghĩa vụ và trách nhiệm bảo mật khi tương tác với nền tảng quản lý học tập cá nhân hóa AILMS.
          </p>
        </div>
      </div>
        
      {/* Left Column: Quick Navigation Panels */}
      <div className="space-y-6">
        <div className="bg-card border border-border/40 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
            <ShieldCheck className="h-5.5 w-5.5 text-primary" />
            <span>Học tập & Bảo mật</span>
          </h3>
          <p className="text-base text-muted-foreground leading-relaxed">
            Môi trường AILMS được thiết lập nhằm mang lại trải nghiệm cá nhân hóa an toàn, minh bạch, bảo vệ dữ liệu theo tiêu chuẩn quốc gia.
          </p>
          <div className="space-y-3 pt-2">
            <div className="flex gap-3 text-sm text-muted-foreground items-start">
              <div className="p-1 rounded-md bg-neutral-soft-gray">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <span>Cá nhân lộ trình bằng mô hình gợi ý AI.</span>
            </div>
            <div className="flex gap-3 text-sm text-muted-foreground items-start">
              <div className="p-1 rounded-md bg-neutral-soft-gray">
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <span>Bảo mật tuyệt đối thông tin học tập và cá nhân.</span>
            </div>
            <div className="flex gap-3 text-sm text-muted-foreground items-start">
              <div className="p-1 rounded-md bg-neutral-soft-gray">
                <AlertCircle className="h-4 w-4 text-primary" />
              </div>
              <span>Tuân thủ Luật An ninh mạng và Giáo dục.</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Section 1: Điều khoản sử dụng */}
      <div id="dieu-khoan-su-dung" className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden scroll-mt-20">
        <button 
          onClick={() => toggle("dieuKhoanSuDung")}
          className="w-full flex items-center justify-between p-6 hover:bg-neutral-soft-gray/20 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Điều khoản sử dụng</h2>
              <p className="text-sm text-muted-foreground">Quy định tham gia và sử dụng nền tảng AILMS</p>
            </div>
          </div>
          {expanded.dieuKhoanSuDung ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>
        
        {expanded.dieuKhoanSuDung && (
          <div className="p-6 pt-8 border-t border-border/20 text-sm text-muted-foreground space-y-6 leading-relaxed animate-in fade-in-50 duration-200">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">1. Điều kiện tham gia và Đăng ký Tài khoản</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Người dùng cần cung cấp đầy đủ và chính xác các thông tin cá nhân bắt buộc khi đăng ký tài khoản (họ tên, email, vai trò học tập).</li>
                <li>Mỗi tài khoản được cấp chỉ dành riêng cho một cá nhân sử dụng. Người dùng tự chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động diễn ra dưới tài khoản của mình.</li>
                <li>Nền tảng hỗ trợ người học ở mọi độ tuổi, tuy nhiên học sinh dưới 15 tuổi cần có sự giám hộ hoặc đồng ý từ phụ huynh/giáo viên phụ trách khi tham gia các khóa học có trả phí.</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">2. Quyền lợi và Dịch vụ cung cấp</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Được tiếp cận kho bài giảng cá nhân hóa, hệ thống bài thi thử nghiệm và lộ trình học tập được tối ưu hóa liên tục bởi mô hình trí tuệ nhân tạo (AI).</li>
                <li>Sử dụng các tính năng tương tác học tập bao gồm hệ thống giả lập thực hành, biểu đồ theo dõi hiệu năng học tập và kết nối trao đổi trên diễn đàn lớp học.</li>
                <li>Nhận sự hỗ trợ kỹ thuật và giải đáp thắc mắc từ đội ngũ quản trị viên và giảng viên của hệ thống trong suốt thời gian tham gia học tập.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">3. Hành vi bị nghiêm cấm</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Nghiêm cấm mọi hành vi tấn công DDoS, quét lỗi bảo mật, cài đặt mã độc hoặc can thiệp trái phép vào cơ sở dữ liệu và thuật toán AI gợi ý của hệ thống.</li>
                <li>Không được sử dụng bất kỳ công cụ hoặc phần mềm tự động nào (như auto-click, script gian lận điểm số) nhằm thay đổi kết quả đánh giá năng lực một cách phi pháp.</li>
                <li>Tuyệt đối cấm phát tán nội dung vi phạm pháp luật, chống phá nhà nước, tuyên truyền văn hóa phẩm đồi trụy hoặc quấy rối các thành viên khác trong cộng đồng AILMS.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">4. Đình chỉ và chấm dứt dịch vụ</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Ban quản trị AILMS có toàn quyền tạm đình chỉ hoặc xóa vĩnh viễn tài khoản người dùng nếu phát hiện hành vi vi phạm nghiêm trọng các quy định sử dụng mà không cần thông báo trước.</li>
                <li>Các trường hợp gian lận kết quả thi hoặc cố ý bẻ khóa nội dung bản quyền sẽ bị hủy bỏ toàn bộ chứng chỉ và cấm tham gia tất cả khóa học tương lai của hệ thống.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Chính sách bảo mật */}
      <div id="chinh-sach-bao-mat" className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden scroll-mt-20">
        <button 
          onClick={() => toggle("chinhSachBaoMat")}
          className="w-full flex items-center justify-between p-6 hover:bg-neutral-soft-gray/20 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Chính sách bảo mật</h2>
              <p className="text-xs text-muted-foreground">Bảo vệ thông tin cá nhân và dữ liệu học tập</p>
            </div>
          </div>
          {expanded.chinhSachBaoMat ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>
        
        {expanded.chinhSachBaoMat && (
          <div className="p-6 pt-8 border-t border-border/20 text-sm text-muted-foreground space-y-6 leading-relaxed animate-in fade-in-50 duration-200">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">1. Loại thông tin thu thập</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li><strong>Thông tin tài khoản:</strong> Họ tên, email đăng ký, ảnh đại diện, trường lớp và mật khẩu đã được mã hóa an toàn (salted bcrypt hashing).</li>
                <li><strong>Dữ liệu tiến trình học tập:</strong> Điểm các bài kiểm tra, lịch sử xem bài giảng, thời gian hoàn thành thử thách, và tần suất tương tác trên diễn đàn.</li>
                <li><strong>Dữ liệu kỹ thuật & thiết bị:</strong> Địa chỉ IP, loại trình duyệt, hệ điều hành và lịch sử log lỗi nhằm phân tích và khắc phục sự cố hệ thống.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">2. Mục đích sử dụng thông tin</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Xây dựng mô hình gợi ý AI tối ưu nhằm đề xuất bài học, bài tập thực hành sát nhất với trình độ thực tế của từng học viên.</li>
                <li>Cung cấp báo cáo trực quan về kết quả học tập gửi tới tài khoản của học viên và giáo viên hướng dẫn (nếu có liên kết).</li>
                <li>Gửi thông báo cập nhật hệ thống, nhắc nhở lịch học và hỗ trợ giải đáp khi xảy ra sự cố kỹ thuật.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">3. Bảo mật và chia sẻ thông tin</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Chúng tôi cam kết sử dụng công nghệ mã hóa đường truyền SSL/TLS và phân quyền truy cập chặt chẽ để bảo vệ thông tin cá nhân của bạn khỏi truy cập trái phép.</li>
                <li>AILMS cam kết không bán, không thương mại hóa hoặc trao đổi dữ liệu cá nhân của người học với bất kỳ bên thứ ba nào vì mục đích quảng cáo hoặc tiếp thị.</li>
                <li>Thông tin cá nhân chỉ được chia sẻ trong trường hợp bắt buộc theo yêu cầu trực tiếp bằng văn bản từ cơ quan tư pháp hoặc cơ quan quản lý nhà nước có thẩm quyền.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">4. Quyền kiểm soát dữ liệu của người dùng</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Học viên có quyền chỉnh sửa, cập nhật thông tin cá nhân của mình trực tiếp trên trang cấu hình tài khoản.</li>
                <li>Người dùng có quyền gửi yêu cầu trích xuất toàn bộ dữ liệu tiến trình học tập của mình dưới dạng tệp tin máy tính có cấu trúc.</li>
                <li>Bạn có quyền yêu cầu xóa hoàn toàn tài khoản và mọi dữ liệu liên quan khỏi cơ sở dữ liệu lưu trữ của AILMS bất kỳ lúc nào bằng cách liên hệ với ban quản trị.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Bản quyền nội dung */}
      <div id="ban-quyen-noi-dung" className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden scroll-mt-20">
        <button 
          onClick={() => toggle("banQuyenNoiDung")}
          className="w-full flex items-center justify-between p-6 hover:bg-neutral-soft-gray/20 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Bản quyền nội dung</h2>
              <p className="text-xs text-muted-foreground">Sở hữu trí tuệ giáo trình và tài nguyên học tập</p>
            </div>
          </div>
          {expanded.banQuyenNoiDung ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>
        
        {expanded.banQuyenNoiDung && (
          <div className="p-6 pt-8 border-t border-border/20 text-sm text-muted-foreground space-y-6 leading-relaxed animate-in fade-in-50 duration-200">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">1. Quyền sở hữu trí tuệ hợp pháp</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Toàn bộ giáo trình, hệ thống câu hỏi, tài liệu hướng dẫn, mã nguồn thuật toán, video bài giảng, hình ảnh minh họa và thiết kế giao diện đều thuộc quyền sở hữu trí tuệ độc quyền của AILMS hoặc các đối tác liên kết.</li>
                <li>Logo, nhãn hiệu dịch vụ và các ấn phẩm nhận diện thương hiệu của AILMS đều được bảo hộ theo luật sở hữu trí tuệ Việt Nam và các công ước quốc tế.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">2. Phạm vi cấp phép sử dụng</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Học viên đăng ký tài khoản hợp lệ được cấp quyền truy cập cá nhân, không độc quyền để học tập và khai thác tài nguyên trực tuyến trên hệ thống.</li>
                <li>Mọi quyền khai thác thương mại, chuyển nhượng quyền sử dụng hoặc phân phối lại tài liệu cho bên thứ ba mà không có sự đồng ý bằng văn bản của AILMS đều là hành vi bất hợp pháp.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">3. Hành vi vi phạm bản quyền điển hình</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Tự ý tải xuống, quay phim màn hình bài giảng, sao chép hoặc phân phối tài liệu học tập của AILMS lên các diễn đàn cộng đồng, nhóm chat hoặc các trang chia sẻ tệp tin công cộng.</li>
                <li>Sử dụng các công cụ kỹ thuật để bẻ khóa hệ thống bảo vệ nội dung, tải mã nguồn giao diện hoặc can thiệp vào các tệp tin lưu trữ dữ liệu học liệu của chúng tôi.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">4. Xử lý vi phạm và Trách nhiệm pháp lý</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Các trường hợp vi phạm bản quyền sẽ bị hệ thống tự động khóa tài khoản vĩnh viễn, tước bỏ tất cả kết quả học tập và chứng chỉ liên quan mà không hoàn trả học phí.</li>
                <li>AILMS có quyền phối hợp với các cơ quan chức năng để truy cứu trách nhiệm pháp lý trước tòa án, yêu cầu bồi thường toàn bộ thiệt hại thực tế phát sinh theo luật sở hữu trí tuệ.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Trách nhiệm người dùng */}
      <div id="trach-nhiem-nguoi-dung" className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden scroll-mt-20">
        <button 
          onClick={() => toggle("trachNhiemNguoiDung")}
          className="w-full flex items-center justify-between p-6 hover:bg-neutral-soft-gray/20 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Trách nhiệm người dùng</h2>
              <p className="text-xs text-muted-foreground">Nghĩa vụ và tính liêm chính trong học tập</p>
            </div>
          </div>
          {expanded.trachNhiemNguoiDung ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>
        
        {expanded.trachNhiemNguoiDung && (
          <div className="p-6 pt-8 border-t border-border/20 text-sm text-muted-foreground space-y-6 leading-relaxed animate-in fade-in-50 duration-200">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">1. Tính trung thực trong học tập</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Học viên có nghĩa vụ tự hoàn thành các bài luyện tập và bài thi đánh giá năng lực cá nhân mà không được có hành vi gian lận.</li>
                <li>Nghiêm cấm chia sẻ tài khoản cá nhân cho người khác đăng nhập học hộ hoặc thi hộ nhằm lấy chứng chỉ hoặc gian lận thứ hạng thi đua.</li>
                <li>Không sử dụng bất kỳ công cụ can thiệp, cheat code, bot, script tự động nào nhằm làm giả tiến độ học tập hoặc thay đổi điểm số trên bảng xếp hạng.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">2. Đạo đức giao tiếp và ứng xử cộng đồng</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Tôn trọng giảng viên, trợ giảng và tất cả các bạn học viên khác khi tham gia thảo luận trên diễn đàn lớp học hoặc các nhóm học trực tuyến.</li>
                <li>Tuyệt đối không đăng tải, chia sẻ các bình luận mang tính quấy rối, xúc phạm nhân phẩm, kỳ thị vùng miền, phân biệt chủng tộc hoặc ngôn từ thô tục, kích động bạo lực.</li>
                <li>Nghiêm cấm hành vi quảng cáo rác (spam), phát tán virus, mã độc hoặc liên kết không an toàn lên các kênh thảo luận chung của hệ thống.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">3. Tuân thủ pháp luật và quy định mạng</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Người dùng có trách nhiệm tuân thủ tuyệt đối Luật An ninh mạng Việt Nam (2018) và tự chịu trách nhiệm pháp lý trước pháp luật về mọi nội dung mình chia sẻ trên hệ thống.</li>
                <li>Không sử dụng nền tảng AILMS để tuyên truyền các thông tin xuyên tạc, tin giả, chống phá nhà nước hoặc vi phạm thuần phong mỹ tục của dân tộc Việt Nam.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base">4. Hợp tác phát triển và bảo vệ hệ thống</h4>
              <ul className="list-disc pl-5 space-y-2 text-base">
                <li>Khi phát hiện bất kỳ lỗi bảo mật hoặc hành vi gian lận từ người dùng khác, học viên có trách nhiệm thông báo kịp thời cho ban quản trị để khắc phục sự cố.</li>
                <li>Chủ động tham gia xây dựng môi trường học tập lành mạnh, tích cực trao đổi kinh nghiệm và giúp đỡ các bạn học viên khác cùng tiến bộ.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
