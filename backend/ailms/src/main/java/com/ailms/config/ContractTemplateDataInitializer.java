package com.ailms.config;

import com.ailms.entity.ContractTemplateEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.repository.ContractTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Khởi tạo ba mẫu hợp đồng riêng theo Bộ luật Lao động 2019.
 *
 * <p>PROBATION là thỏa thuận thử việc riêng theo Điều 24-27; FIXED_TERM và
 * INDEFINITE là hai loại hợp đồng lao động quy định tại Điều 20.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ContractTemplateDataInitializer implements CommandLineRunner {

    private static final int LEGAL_TEMPLATE_VERSION = 3;
    private static final String PROBATION_NAME = "Thỏa Thuận Thử Việc (Điều 24-27 BLLĐ 2019)";
    private static final String FIXED_TERM_NAME = "Hợp Đồng Lao Động Xác Định Thời Hạn";
    private static final String INDEFINITE_NAME = "Hợp Đồng Lao Động Không Xác Định Thời Hạn";

    private final ContractTemplateRepository contractTemplateRepository;

    private static final String COMMON_STYLE = """
        <style>
          @page { size: A4; margin: 18mm 15mm 20mm; }
          html, body { font-family: 'Noto Sans', Arial, sans-serif !important; }
          body { font-size: 12pt; line-height: 1.5; color: #000; margin: 0; }
          .center { text-align: center; } .bold { font-weight: 700; }
          .uppercase { text-transform: uppercase; } .italic { font-style: italic; }
          .header h1, .header h2 { font-size: 13pt; margin: 0 0 3px; }
          .rule { border-top: 1.5px solid #000; width: 180px; margin: 7px auto 17px; }
          .title { font-size: 16pt; font-weight: 700; text-transform: uppercase; margin-top: 14px; }
          .number { font-style: italic; margin: 3px 0 17px; }
          p { margin: 6px 0; text-align: justify; }
          .indent { text-indent: 30px; }
          .party-title, .article-title { font-weight: 700; }
          .party-title { margin: 15px 0 5px; text-transform: uppercase; }
          table.info, table.signatures { width: 100%; border-collapse: collapse; }
          table.info td { padding: 2px 0; vertical-align: top; }
          table.info td:first-child { width: 31%; }
          .article { margin-top: 13px; text-align: justify; }
          .clause { margin: 3px 0 3px 18px; text-align: justify; }
          .note { font-size: 10.5pt; font-style: italic; }
          .signatures { margin-top: 36px; page-break-inside: avoid; }
          .signatures td { width: 50%; text-align: center; vertical-align: top; padding: 0 10px; }
          .sign-space { height: 90px; overflow:hidden; }
          .employee-signature-anchor { color:#fff; font-size:1px; line-height:1px; }
          .company-signature { position:relative; height:145px; margin-top:5px; }
          .company-name { position:absolute; left:0; right:0; bottom:0; z-index:2; }
        </style>
        """;

    private static final String PARTIES = """
        <p>Hôm nay, ngày {{currentDay}} tháng {{currentMonth}} năm {{currentYear}}, tại {{workingLocation}}, các bên gồm:</p>
        <div class="party-title">BÊN SỬ DỤNG LAO ĐỘNG (BÊN A)</div>
        <table class="info">
          <tr><td>Tên đơn vị:</td><td class="bold">CÔNG TY CỔ PHẦN GIÁO DỤC AILMS</td></tr>
          <tr><td>Mã số doanh nghiệp:</td><td>{{companyTaxCode}}</td></tr>
          <tr><td>Địa chỉ:</td><td>{{companyAddress}}</td></tr>
          <tr><td>Đại diện:</td><td>{{companyRepresentative}} — {{companyRepresentativeTitle}}</td></tr>
          <tr><td>Điện thoại/Email:</td><td>{{companyPhone}} / {{companyEmail}}</td></tr>
        </table>
        <div class="party-title">NGƯỜI LAO ĐỘNG (BÊN B)</div>
        <table class="info">
          <tr><td>Họ và tên:</td><td class="bold uppercase">{{employeeName}}</td></tr>
          <tr><td>Ngày sinh/Giới tính:</td><td>{{dateOfBirth}} / {{gender}}</td></tr>
          <tr><td>Quốc tịch:</td><td>{{nationality}}</td></tr>
          <tr><td>CCCD/CMND:</td><td>{{citizenId}}, cấp ngày {{citizenIssueDate}} tại {{citizenIssuePlace}}</td></tr>
          <tr><td>Nơi cư trú:</td><td>{{address}}</td></tr>
          <tr><td>Điện thoại/Email:</td><td>{{phone}} / {{email}}</td></tr>
        </table>
        """;

    private static final String SIGNATURES = """
        <div class="article"><span class="article-title">Điều cuối cùng. Hiệu lực và bản hợp đồng</span>
          <p>Văn bản có hiệu lực từ ngày {{contractStartDate}}, được lập thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản. Nếu giao kết dưới dạng thông điệp dữ liệu, giá trị pháp lý của văn bản được xác định theo pháp luật về giao dịch điện tử; riêng hợp đồng lao động điện tử có giá trị như hợp đồng bằng văn bản theo khoản 1 Điều 14 Bộ luật Lao động 2019.</p>
          <p>Các phụ lục, bản mô tả công việc, quy chế lương thưởng và nội quy lao động được dẫn chiếu hợp pháp là bộ phận của hợp đồng; nếu có nội dung làm giảm quyền của người lao động so với pháp luật thì áp dụng quy định pháp luật.</p>
        </div>
        <table class="signatures"><tr>
          <td><div class="bold uppercase">ĐẠI DIỆN BÊN A</div><div class="italic">(Ký, ghi rõ họ tên, chức vụ và đóng dấu)</div>
            <div class="company-signature">
              <svg viewBox="0 0 200 200" style="position:absolute;top:-18px;left:50%;transform:translateX(-50%) rotate(-10deg);width:135px;height:135px;opacity:.78;fill:none;stroke:#dc2626">
                <circle cx="100" cy="100" r="94" stroke-width="4"/><circle cx="100" cy="100" r="86" stroke-width="1.5"/><circle cx="100" cy="100" r="56" stroke-width="2"/>
                <text x="100" y="58" fill="#dc2626" stroke="none" font-size="13" font-weight="700" text-anchor="middle">CÔNG TY CỔ PHẦN</text>
                <text x="100" y="78" fill="#dc2626" stroke="none" font-size="12" font-weight="700" text-anchor="middle">GIÁO DỤC AILMS</text>
                <text x="100" y="111" fill="#dc2626" stroke="none" font-size="23" font-weight="700" text-anchor="middle">AILMS</text>
                <text x="100" y="137" fill="#dc2626" stroke="none" font-size="10" text-anchor="middle">MST {{companyTaxCode}}</text>
              </svg>
              <div style="position:absolute;left:20%;right:20%;top:42px;color:#1e3a8a;font-size:20pt;font-style:italic;transform:rotate(-8deg);z-index:1;">{{companyRepresentative}}</div>
              <div class="company-name"><div class="bold">{{companyRepresentative}}</div><div>{{companyRepresentativeTitle}}</div></div>
            </div>
          </td>
          <td><div class="bold uppercase">BÊN B</div><div class="italic">(Ký và ghi rõ họ tên)</div><div class="sign-space"><span class="employee-signature-anchor">AILMS_EMPLOYEE_SIGNATURE_ANCHOR</span></div></td>
        </tr></table>
        """;

    private static final String PROBATION_HTML = document(
        "THỎA THUẬN THỬ VIỆC",
        """
        <p class="indent">Căn cứ Điều 24, Điều 25, Điều 26 và Điều 27 Bộ luật Lao động số 45/2019/QH14;</p>
        <p class="indent">Căn cứ nhu cầu tuyển dụng và sự tự nguyện của hai bên;</p>
        """,
        """
        <p class="italic">Hai bên thống nhất giao kết thỏa thuận thử việc riêng với các điều khoản sau:</p>
        <div class="article"><span class="article-title">Điều 1. Công việc và địa điểm thử việc</span>
          <p>Chức danh/công việc: {{position}}, thuộc {{department}}. Nhiệm vụ cụ thể theo bản mô tả công việc và phân công hợp pháp của người quản lý. Địa điểm: {{workingLocation}}.</p>
        </div>
        <div class="article"><span class="article-title">Điều 2. Thời gian thử việc</span>
          <p>Từ ngày {{contractStartDate}} đến hết ngày {{contractEndDate}}, thời lượng {{probationPeriod}}. Chỉ thử việc một lần đối với công việc này.</p>
          <p>Thời gian trên không được vượt quá: 180 ngày với chức danh quản lý doanh nghiệp; 60 ngày với công việc cần trình độ từ cao đẳng trở lên; 30 ngày với công việc cần trình độ trung cấp, công nhân kỹ thuật, nhân viên nghiệp vụ; 06 ngày làm việc với công việc khác. Không áp dụng thử việc với hợp đồng lao động dưới 01 tháng.</p>
        </div>
        <div class="article"><span class="article-title">Điều 3. Tiền lương thử việc và thanh toán</span>
          <p>Lương thử việc: {{salary}} theo hình thức {{salaryType}}, không thấp hơn 85% mức lương của công việc đó. Các khoản hỗ trợ/phụ cấp: {{allowance}}. Thanh toán bằng chuyển khoản vào ngày {{payDay}} hằng tháng, sau khi khấu trừ các khoản theo luật.</p>
        </div>
        <div class="article"><span class="article-title">Điều 4. Thời giờ làm việc, nghỉ ngơi và điều kiện làm việc</span>
          <p>{{workingHours}}. Nghỉ hằng tuần, lễ, tết và các thời gian nghỉ khác theo pháp luật và nội quy hợp pháp. Bên A cung cấp công cụ cần thiết, bảo đảm an toàn, vệ sinh lao động và không phân biệt đối xử.</p>
        </div>
        <div class="article"><span class="article-title">Điều 5. Quyền và nghĩa vụ</span>
          <p>Bên A giao việc, hướng dẫn, đánh giá khách quan và trả đủ lương đúng hạn. Bên B thực hiện công việc, tuân thủ sự điều hành hợp pháp, nội quy, quy định an toàn; bảo vệ tài sản và bảo mật dữ liệu học viên, bí mật kinh doanh, tài liệu đào tạo, quyền sở hữu trí tuệ mà mình tiếp cận.</p>
        </div>
        <div class="article"><span class="article-title">Điều 6. Bảo hiểm và thuế</span>
          <p>Do đây là thỏa thuận thử việc riêng, việc tham gia các chế độ bảo hiểm bắt buộc được thực hiện theo đúng đối tượng và điều kiện của pháp luật tại thời điểm phát sinh; thuế thu nhập cá nhân được khấu trừ, quyết toán theo luật. Không điều khoản nào được hiểu là loại trừ nghĩa vụ bảo hiểm bắt buộc nếu quan hệ thực tế thuộc diện phải tham gia.</p>
        </div>
        <div class="article"><span class="article-title">Điều 7. Kết thúc thử việc</span>
          <p>Khi kết thúc, Bên A thông báo kết quả. Nếu đạt yêu cầu, hai bên giao kết hợp đồng lao động; nếu không đạt, thỏa thuận thử việc chấm dứt. Trong thời gian thử việc, mỗi bên có quyền hủy bỏ thỏa thuận mà không cần báo trước và không phải bồi thường theo khoản 2 Điều 27 Bộ luật Lao động 2019; các khoản lương đã phát sinh vẫn phải thanh toán đầy đủ.</p>
        </div>
        """
    );

    private static final String FIXED_TERM_HTML = document(
        "HỢP ĐỒNG LAO ĐỘNG XÁC ĐỊNH THỜI HẠN",
        """
        <p class="indent">Căn cứ Bộ luật Lao động số 45/2019/QH14, đặc biệt Điều 14, Điều 20, Điều 21 và Điều 35;</p>
        <p class="indent">Căn cứ Luật Bảo hiểm xã hội số 41/2024/QH15 và nhu cầu sử dụng lao động của Bên A;</p>
        """,
        """
        <p class="italic">Hai bên tự nguyện giao kết hợp đồng lao động xác định thời hạn với các điều khoản sau:</p>
        <div class="article"><span class="article-title">Điều 1. Loại và thời hạn hợp đồng</span>
          <p>Hợp đồng lao động xác định thời hạn từ ngày {{contractStartDate}} đến hết ngày {{contractEndDate}}; tổng thời hạn không quá 36 tháng. Khi hết hạn mà Bên B tiếp tục làm việc, hai bên thực hiện việc ký mới và chuyển loại hợp đồng theo khoản 2 Điều 20 Bộ luật Lao động 2019.</p>
        </div>
        <div class="article"><span class="article-title">Điều 2. Công việc và địa điểm làm việc</span>
          <p>Chức danh: {{position}}; đơn vị: {{department}}; địa điểm: {{workingLocation}}. Bên B thực hiện bản mô tả công việc, bảo đảm chất lượng và tiến độ. Việc tạm thời chuyển làm công việc khác chỉ thực hiện trong trường hợp, thời hạn và chế độ theo pháp luật.</p>
        </div>
        <div class="article"><span class="article-title">Điều 3. Tiền lương, phụ cấp và trả lương</span>
          <p>Mức lương theo công việc/chức danh: {{salary}}; hình thức: {{salaryType}}; phụ cấp và khoản bổ sung: {{allowance}}. Trả qua tài khoản vào ngày {{payDay}} hằng tháng. Lương không thấp hơn mức tối thiểu áp dụng; làm thêm giờ, làm đêm, ngừng việc, nâng lương, thưởng và khấu trừ lương thực hiện theo pháp luật và quy chế hợp pháp của Bên A.</p>
        </div>
        <div class="article"><span class="article-title">Điều 4. Thời giờ làm việc và nghỉ ngơi</span>
          <p>{{workingHours}}. Thời giờ làm việc bình thường không vượt giới hạn pháp luật. Làm thêm giờ phải có sự đồng ý của Bên B, trừ trường hợp luật định. Bên B được nghỉ hằng tuần, lễ, tết, nghỉ việc riêng và nghỉ hằng năm theo thâm niên, điều kiện công việc và pháp luật.</p>
        </div>
        <div class="article"><span class="article-title">Điều 5. Bảo hiểm, thuế và phúc lợi</span>
          <p>Bên A và Bên B tham gia, đóng BHXH, BHYT, BHTN bắt buộc theo đối tượng, mức tiền lương làm căn cứ và tỷ lệ pháp luật hiện hành; Bên A cung cấp thông tin đóng bảo hiểm theo quy định. Thuế thu nhập cá nhân và các phúc lợi khác thực hiện theo luật, thỏa ước và quy chế hợp pháp.</p>
        </div>
        <div class="article"><span class="article-title">Điều 6. An toàn lao động, đào tạo và phương tiện làm việc</span>
          <p>Bên A bảo đảm điều kiện, công cụ và huấn luyện an toàn cần thiết. Bên B sử dụng đúng mục đích, báo cáo nguy cơ và tuân thủ quy trình an toàn. Chế độ đào tạo, bồi dưỡng và chi phí đào tạo (nếu có) được ghi trong thỏa thuận riêng đúng Điều 62 Bộ luật Lao động.</p>
        </div>
        <div class="article"><span class="article-title">Điều 7. Quyền, nghĩa vụ và bảo mật</span>
          <p>Bên A có quyền quản lý, điều hành, đánh giá, khen thưởng và xử lý kỷ luật đúng trình tự pháp luật; có nghĩa vụ bố trí việc, tôn trọng danh dự và thanh toán đủ quyền lợi. Bên B được hưởng lương, nghỉ ngơi, tham gia tổ chức đại diện và đơn phương chấm dứt theo luật; có nghĩa vụ hoàn thành công việc, chấp hành điều hành hợp pháp, bảo vệ tài sản, dữ liệu cá nhân, dữ liệu học viên, bí mật kinh doanh và sở hữu trí tuệ.</p>
        </div>
        <div class="article"><span class="article-title">Điều 8. Tạm hoãn, sửa đổi và chấm dứt</span>
          <p>Việc tạm hoãn, sửa đổi, chấm dứt và trách nhiệm khi chấm dứt thực hiện theo Điều 30 đến Điều 48 Bộ luật Lao động 2019. Bên B đơn phương chấm dứt phải báo trước ít nhất 30 ngày nếu hợp đồng từ 12 đến 36 tháng hoặc 03 ngày làm việc nếu hợp đồng dưới 12 tháng, trừ trường hợp không phải báo trước theo khoản 2 Điều 35. Quyền đơn phương của Bên A chỉ được thực hiện khi có căn cứ, thời hạn báo trước và thủ tục luật định.</p>
        </div>
        <div class="article"><span class="article-title">Điều 9. Giải quyết tranh chấp</span>
          <p>Ưu tiên thương lượng trên nguyên tắc thiện chí. Nếu không giải quyết được, tranh chấp được xử lý theo trình tự hòa giải, trọng tài lao động hoặc Tòa án có thẩm quyền theo pháp luật; không hạn chế quyền khiếu nại, tố cáo hoặc khởi kiện của các bên.</p>
        </div>
        """
    );

    private static final String INDEFINITE_HTML = document(
        "HỢP ĐỒNG LAO ĐỘNG KHÔNG XÁC ĐỊNH THỜI HẠN",
        """
        <p class="indent">Căn cứ Bộ luật Lao động số 45/2019/QH14, đặc biệt Điều 14, Điều 20, Điều 21 và Điều 35;</p>
        <p class="indent">Căn cứ Luật Bảo hiểm xã hội số 41/2024/QH15 và nhu cầu sử dụng lao động ổn định của Bên A;</p>
        """,
        """
        <p class="italic">Hai bên tự nguyện giao kết hợp đồng lao động không xác định thời hạn với các điều khoản sau:</p>
        <div class="article"><span class="article-title">Điều 1. Loại hợp đồng và ngày bắt đầu</span>
          <p>Đây là hợp đồng lao động không xác định thời hạn, bắt đầu từ ngày {{contractStartDate}} và không ấn định ngày chấm dứt. Hợp đồng tiếp tục có hiệu lực cho đến khi chấm dứt theo thỏa thuận hoặc căn cứ pháp luật.</p>
        </div>
        <div class="article"><span class="article-title">Điều 2. Công việc, chức danh và địa điểm</span>
          <p>Chức danh: {{position}}; đơn vị: {{department}}; địa điểm: {{workingLocation}}. Bên B thực hiện bản mô tả công việc và nhiệm vụ liên quan hợp lý. Thay đổi nội dung chủ yếu phải được thỏa thuận bằng phụ lục hoặc hợp đồng mới, trừ quyền điều chuyển tạm thời theo luật.</p>
        </div>
        <div class="article"><span class="article-title">Điều 3. Tiền lương và cơ chế phát triển dài hạn</span>
          <p>Mức lương theo công việc/chức danh: {{salary}}; hình thức: {{salaryType}}; phụ cấp và khoản bổ sung: {{allowance}}. Trả qua tài khoản vào ngày {{payDay}} hằng tháng. Bên B được xem xét nâng lương, đánh giá hiệu suất và thưởng theo kết quả, thỏa ước và quy chế công khai; mọi mức trả phải đáp ứng mức tối thiểu và nguyên tắc trả lương bình đẳng.</p>
        </div>
        <div class="article"><span class="article-title">Điều 4. Thời giờ làm việc, nghỉ ngơi</span>
          <p>{{workingHours}}. Bên A tổ chức thời gian làm việc trong giới hạn luật định. Làm thêm giờ phải có sự đồng ý của Bên B, trừ trường hợp đặc biệt theo luật, và được trả đủ chế độ. Bên B được nghỉ hằng tuần, lễ, tết, nghỉ việc riêng, nghỉ hằng năm và tăng ngày phép theo thâm niên theo quy định.</p>
        </div>
        <div class="article"><span class="article-title">Điều 5. Bảo hiểm và chế độ lâu dài</span>
          <p>Bên A và Bên B tham gia, đóng BHXH, BHYT, BHTN bắt buộc ngay khi thuộc đối tượng theo pháp luật; mức đóng dựa trên tiền lương làm căn cứ hợp pháp. Chế độ ốm đau, thai sản, tai nạn lao động, bệnh nghề nghiệp, hưu trí, tử tuất và các phúc lợi bổ sung thực hiện theo pháp luật và chính sách có lợi hơn của Bên A.</p>
        </div>
        <div class="article"><span class="article-title">Điều 6. Đào tạo, an toàn và công cụ làm việc</span>
          <p>Bên A cung cấp công cụ, môi trường và huấn luyện an toàn cần thiết; tạo điều kiện đào tạo, bồi dưỡng phù hợp nhu cầu lâu dài. Nếu có cam kết thời gian làm việc sau đào tạo từ kinh phí Bên A, hai bên ký hợp đồng đào tạo riêng, nêu rõ chi phí và trách nhiệm hoàn trả theo Điều 62 Bộ luật Lao động.</p>
        </div>
        <div class="article"><span class="article-title">Điều 7. Quyền, nghĩa vụ và bảo vệ thông tin</span>
          <p>Bên A quản lý, điều hành, đánh giá và xử lý kỷ luật đúng căn cứ, trình tự; bảo đảm việc làm, tôn trọng nhân phẩm, chống quấy rối và thanh toán đầy đủ quyền lợi. Bên B được hưởng quyền lao động, tham gia tổ chức đại diện và đối thoại; có nghĩa vụ hoàn thành công việc, tuân thủ chỉ đạo hợp pháp, bảo vệ tài sản, dữ liệu cá nhân, dữ liệu học viên, bí mật kinh doanh và sở hữu trí tuệ.</p>
        </div>
        <div class="article"><span class="article-title">Điều 8. Sửa đổi, tạm hoãn và chấm dứt hợp đồng</span>
          <p>Mọi sửa đổi được thông báo và thỏa thuận theo Điều 33 Bộ luật Lao động. Các trường hợp tạm hoãn, chấm dứt và trách nhiệm thanh toán, xác nhận bảo hiểm, trả giấy tờ thực hiện theo Điều 30 đến Điều 48. Bên B đơn phương chấm dứt phải báo trước ít nhất 45 ngày, trừ trường hợp được nghỉ không cần báo trước theo khoản 2 Điều 35. Bên A chỉ được đơn phương chấm dứt khi có căn cứ và thực hiện đúng thời hạn, thủ tục luật định.</p>
        </div>
        <div class="article"><span class="article-title">Điều 9. Kỷ luật, trách nhiệm vật chất và tranh chấp</span>
          <p>Kỷ luật lao động và trách nhiệm vật chất chỉ áp dụng theo nội quy hợp pháp và đúng nguyên tắc, trình tự Bộ luật Lao động; không phạt tiền hoặc cắt lương thay kỷ luật. Tranh chấp được ưu tiên thương lượng, sau đó giải quyết qua hòa giải, trọng tài lao động hoặc Tòa án có thẩm quyền theo luật.</p>
        </div>
        """
    );

    /** Ghép các phần dùng chung thành một tài liệu hợp đồng HTML hoàn chỉnh. */
    private static String document(String title, String legalBases, String articles) {
        return """
            <!DOCTYPE html><html><head><meta charset="UTF-8"/>
            """ + COMMON_STYLE + """
            </head><body>
              <div class="header center">
                <h1>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
                <h2>Độc lập - Tự do - Hạnh phúc</h2><div class="rule"></div>
                <div class="title">%s</div>
                <div class="number">Số: {{contractNumber}}</div>
              </div>
            """.formatted(title) + legalBases + PARTIES + articles + SIGNATURES + """
            </body></html>
            """;
    }

    @Override
    public void run(String... args) {
        upsertTemplate(ContractTypeEnum.PROBATION, PROBATION_NAME, PROBATION_HTML,
                List.of("Hợp Đồng Lao Động Thử Việc (Chuẩn Bộ Luật Lao Động)"));
        upsertTemplate(ContractTypeEnum.FIXED_TERM, FIXED_TERM_NAME, FIXED_TERM_HTML, List.of());
        upsertTemplate(ContractTypeEnum.INDEFINITE, INDEFINITE_NAME, INDEFINITE_HTML, List.of());
        deactivateLegacySeasonalSeed();
        log.info("Three distinct Vietnamese labor templates version {} are ready", LEGAL_TEMPLATE_VERSION);
    }

    /** Tạo mới hoặc nâng cấp mẫu hệ thống mà không nhân bản các mẫu cũ. */
    private void upsertTemplate(ContractTypeEnum type, String name, String content, List<String> legacyNames) {
        ContractTemplateEntity template = contractTemplateRepository.findByStatus(BaseStatusEnum.ACTIVE).stream()
                .filter(item -> item.getContractTypeEnum() == type)
                .filter(item -> name.equals(item.getName()) || legacyNames.contains(item.getName()))
                .findFirst()
                .orElseGet(ContractTemplateEntity::new);

        if (template.getVersion() != null && template.getVersion() >= LEGAL_TEMPLATE_VERSION
                && name.equals(template.getName()) && content.equals(template.getTemplateContent())) {
            return;
        }
        template.setName(name);
        template.setContractTypeEnum(type);
        template.setVersion(LEGAL_TEMPLATE_VERSION);
        template.setStatus(BaseStatusEnum.ACTIVE);
        template.setTemplateContent(content);
        contractTemplateRepository.save(template);
    }

    /** Ngừng kích hoạt mẫu hợp đồng mùa vụ không còn phù hợp pháp luật hiện hành. */
    private void deactivateLegacySeasonalSeed() {
        contractTemplateRepository.findByContractTypeEnumAndStatus(ContractTypeEnum.SEASONAL, BaseStatusEnum.ACTIVE)
                .stream()
                .filter(item -> "Hợp Đồng Lao Động Theo Mùa Vụ / Theo Công Việc".equals(item.getName()))
                .forEach(item -> {
                    item.setStatus(BaseStatusEnum.INACTIVE);
                    contractTemplateRepository.save(item);
                });
    }
}
