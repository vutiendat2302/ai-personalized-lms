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
 * Khởi tạo dữ liệu mẫu hợp đồng lao động tiêu chuẩn đúng quy chuẩn văn bản hành chính Việt Nam và Bộ luật Lao động 2019.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ContractTemplateDataInitializer implements CommandLineRunner {

    private final ContractTemplateRepository contractTemplateRepository;

    private static final String STANDARD_LABOR_CONTRACT_HTML = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8"/>
            <style>
                @page { size: A4; margin: 20mm 15mm 20mm 15mm; }
                body { font-family: 'Source Sans 3', 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; color: #000; background-color: #fff; margin: 0; padding: 0; }
                .text-center { text-align: center; }
                .text-justify { text-align: justify; }
                .text-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                .italic { font-style: italic; }
                .header { text-align: center; margin-bottom: 24px; }
                .header h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0; }
                .header h2 { font-size: 14pt; font-weight: bold; margin: 0 0 6px 0; }
                .divider { border-top: 1.5px solid #000; width: 180px; margin: 6px auto 20px auto; }
                .title { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-top: 20px; margin-bottom: 6px; text-align: center; }
                .contract-no { text-align: center; font-style: italic; margin-bottom: 20px; }
                .indent { text-indent: 30px; margin-bottom: 8px; text-align: justify; }
                .section-header { font-weight: bold; text-transform: uppercase; margin-top: 18px; margin-bottom: 8px; }
                table.info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                table.info-table td { padding: 3px 0; vertical-align: top; }
                table.info-table td.label { width: 30%; }
                table.info-table td.value { width: 70%; }
                .article { margin-bottom: 12px; text-align: justify; }
                .article-title { font-weight: bold; }
                .signature-container { margin-top: 40px; page-break-inside: avoid; }
                table.signature-table { width: 100%; border-collapse: collapse; }
                table.signature-table td { width: 50%; text-align: center; vertical-align: top; padding: 0 10px; }
                .stamp-wrapper { position: relative; height: 140px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
                <h2>Độc lập - Tự do - Hạnh phúc</h2>
                <div class="divider"></div>
                <div class="title">HỢP ĐỒNG LAO ĐỘNG</div>
                <div class="contract-no">Số: {{contractNumber}}</div>
            </div>

            <p class="indent">Căn cứ Bộ luật Lao động số 45/2019/QH14 được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam khóa XIV kỳ họp thứ 8 thông qua ngày 20 tháng 11 năm 2019;</p>
            <p class="indent">Căn cứ vào nhu cầu sử dụng lao động của Công ty và khả năng của người lao động;</p>
            <p class="indent">Hôm nay, ngày {{currentDay}} tháng {{currentMonth}} năm {{currentYear}}, tại văn phòng Công ty Cổ phần Giáo dục AILMS, chúng tôi gồm có:</p>

            <div class="section-header">BÊN SỬ DỤNG LAO ĐỘNG (BÊN A):</div>
            <div class="text-bold uppercase" style="font-size: 14pt; margin-bottom: 6px;">CÔNG TY CỔ PHẦN GIÁO DỤC AILMS</div>
            <table class="info-table">
                <tr><td class="label">Mã số thuế:</td><td class="value text-bold">{{companyTaxCode}}</td></tr>
                <tr><td class="label">Địa chỉ:</td><td class="value">{{companyAddress}}</td></tr>
                <tr><td class="label">Đại diện bởi:</td><td class="value text-bold">{{companyRepresentative}}</td></tr>
                <tr><td class="label">Chức vụ:</td><td class="value">{{companyRepresentativeTitle}}</td></tr>
                <tr><td class="label">Điện thoại:</td><td class="value">{{companyPhone}}</td></tr>
                <tr><td class="label">Email:</td><td class="value">{{companyEmail}}</td></tr>
            </table>

            <div class="section-header">BÊN NGƯỜI LAO ĐỘNG (BÊN B):</div>
            <table class="info-table">
                <tr><td class="label">Ông/Bà:</td><td class="value text-bold uppercase">{{employeeName}}</td></tr>
                <tr><td class="label">Giới tính:</td><td class="value">{{gender}}</td></tr>
                <tr><td class="label">Ngày sinh:</td><td class="value">{{dateOfBirth}}</td></tr>
                <tr><td class="label">Quốc tịch:</td><td class="value">{{nationality}}</td></tr>
                <tr><td class="label">CCCD/CMND số:</td><td class="value text-bold">{{citizenId}}</td></tr>
                <tr><td class="label">Ngày cấp:</td><td class="value">{{citizenIssueDate}} tại {{citizenIssuePlace}}</td></tr>
                <tr><td class="label">Địa chỉ thường trú:</td><td class="value">{{address}}</td></tr>
                <tr><td class="label">Điện thoại:</td><td class="value text-bold">{{phone}}</td></tr>
                <tr><td class="label">Email:</td><td class="value">{{email}}</td></tr>
            </table>

            <p class="italic" style="margin-bottom: 16px;">Hai bên thỏa thuận ký kết hợp đồng lao động và cam kết thực hiện đúng những điều khoản sau đây:</p>

            <div class="article"><span class="article-title">Điều 1. Loại hợp đồng: </span><span>{{contractType}}</span></div>
            <div class="article"><span class="article-title">Điều 2. Thời hạn hợp đồng: </span><span>Từ ngày {{contractStartDate}} đến ngày {{contractEndDate}}. Thời gian thử việc (nếu có): {{probationPeriod}}.</span></div>
            <div class="article"><span class="article-title">Điều 3. Địa điểm làm việc: </span><span>{{workingLocation}}</span></div>
            <div class="article"><span class="article-title">Điều 4. Chức danh: </span><span>{{position}} thuộc phòng ban: {{department}}.</span></div>
            <div class="article"><span class="article-title">Điều 5. Nhiệm vụ: </span><span>Bên B có trách nhiệm hoàn thành công việc theo sự phân công của Ban Giám đốc, Quản lý trực tiếp và Bản mô tả công việc đính kèm. Chấp hành nghiêm chỉnh nội quy, quy định của Công ty.</span></div>
            <div class="article"><span class="article-title">Điều 6. Tiền lương: </span><span>Mức lương chính: {{salary}}. Hình thức trả lương: Chuyển khoản ngân hàng. Thời hạn trả lương: Ngày {{payDay}} hàng tháng.</span></div>
            <div class="article"><span class="article-title">Điều 7. Phụ cấp: </span><span>Các khoản phụ cấp, hỗ trợ, thưởng được hưởng: {{allowance}}.</span></div>
            <div class="article"><span class="article-title">Điều 8. Thời giờ làm việc: </span><span>{{workingHours}}. Công ty có quyền điều chỉnh thời giờ làm việc theo yêu cầu thực tế của hoạt động kinh doanh nhưng không vượt quá quy định của pháp luật.</span></div>
            <div class="article"><span class="article-title">Điều 9. Nghỉ phép: </span><span>Bên B được nghỉ hàng tuần, nghỉ Lễ, Tết và có 12 ngày phép năm hưởng nguyên lương theo quy định của Bộ luật Lao động.</span></div>
            <div class="article"><span class="article-title">Điều 10. Bảo hiểm: </span><span>Sau khi kết thúc thử việc (nếu có) và ký Hợp đồng lao động chính thức, Bên B được tham gia BHXH, BHYT, BHTN theo tỷ lệ quy định của Luật Bảo hiểm xã hội hiện hành.</span></div>
            <div class="article"><span class="article-title">Điều 11. Quyền và nghĩa vụ: </span><br/>
                - Quyền của Bên A: Có quyền điều hành, phân công, giám sát và đánh giá công việc của Bên B; Tạm hoãn, chấm dứt hợp đồng, kỷ luật theo quy định.<br/>
                - Nghĩa vụ của Bên A: Thanh toán đầy đủ, đúng hạn các chế độ quyền lợi cho Bên B; Đảm bảo điều kiện an toàn lao động.<br/>
                - Quyền của Bên B: Được hưởng các quyền lợi theo hợp đồng; Được trang bị công cụ làm việc.<br/>
                - Nghĩa vụ của Bên B: Hoàn thành công việc được giao; Chấp hành nội quy, kỷ luật lao động.
            </div>
            <div class="article"><span class="article-title">Điều 12. Bảo mật: </span><span>Bên B cam kết bảo mật tuyệt đối các thông tin kinh doanh, tài liệu kỹ thuật, dữ liệu khách hàng, bản quyền tài sản trí tuệ và bí mật công nghệ của Bên A trong và sau khi làm việc. Vi phạm sẽ bị xử lý theo pháp luật và bồi thường thiệt hại.</span></div>
            <div class="article"><span class="article-title">Điều 13. Kỷ luật: </span><span>Bên B nếu vi phạm các điều khoản trong hợp đồng, vi phạm nội quy Công ty sẽ bị xử lý kỷ luật lao động và bồi thường trách nhiệm vật chất theo quy định.</span></div>
            <div class="article"><span class="article-title">Điều 14. Chấm dứt hợp đồng: </span><span>Hợp đồng được chấm dứt theo các trường hợp quy định tại Điều 34 Bộ luật Lao động 2019. Trường hợp Bên B đơn phương chấm dứt HĐLĐ phải báo trước cho Bên A tối thiểu {{noticePeriod}} ngày.</span></div>
            <div class="article"><span class="article-title">Điều 15. Hiệu lực: </span><span>Hợp đồng này có hiệu lực kể từ ngày {{contractStartDate}}. Hợp đồng được lập thành 02 (hai) bản có giá trị pháp lý như nhau, Bên A giữ 01 bản, Bên B giữ 01 bản.</span></div>

            <div class="signature-container">
                <table class="signature-table">
                    <tr>
                        <td>
                            <div class="text-bold uppercase" style="font-size: 12pt;">BÊN SỬ DỤNG LAO ĐỘNG</div>
                            <div class="italic" style="font-size: 11pt; margin-bottom: 20px;">(Ký, ghi rõ họ tên và đóng dấu)</div>
                            <div class="stamp-wrapper">
                                <svg viewBox="0 0 200 200" style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%) rotate(-12deg); width: 140px; height: 140px; opacity: 0.75; fill: none; stroke: #dc2626;">
                                    <circle cx="100" cy="100" r="95" stroke-width="3"/>
                                    <circle cx="100" cy="100" r="90" stroke-width="1"/>
                                    <circle cx="100" cy="100" r="60" stroke-width="2"/>
                                    <path id="curve-top" d="M 25 100 A 75 75 0 0 1 175 100"/>
                                    <text fill="#dc2626" font-weight="bold" font-size="16px" letter-spacing="1">
                                        <textPath href="#curve-top" startOffset="50%" text-anchor="middle">
                                            CÔNG TY CP GIÁO DỤC AILMS
                                        </textPath>
                                    </text>
                                    <path id="curve-bottom" d="M 170 110 A 70 70 0 0 1 30 110"/>
                                    <text fill="#dc2626" font-weight="bold" font-size="14px">
                                        <textPath href="#curve-bottom" startOffset="50%" text-anchor="middle">
                                            M.S.D.N: {{companyTaxCode}}
                                        </textPath>
                                    </text>
                                    <text x="100" y="105" fill="#dc2626" font-weight="bold" font-size="24px" text-anchor="middle">
                                        AILMS
                                    </text>
                                </svg>
                                <div style="position: absolute; bottom: 0; width: 100%; text-align: center;">
                                    <div class="text-bold uppercase">{{companyRepresentative}}</div>
                                    <div>{{companyRepresentativeTitle}}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="text-bold uppercase" style="font-size: 12pt;">BÊN NGƯỜI LAO ĐỘNG</div>
                            <div class="italic" style="font-size: 11pt; margin-bottom: 100px;">(Ký, ghi rõ họ tên)</div>
                            <div class="text-bold uppercase">{{employeeName}}</div>
                        </td>
                    </tr>
                </table>
            </div>
        </body>
        </html>
        """;

    @Override
    public void run(String... args) {
        if (contractTemplateRepository.count() == 0) {
            log.info("Seeding initial standard labor contract templates into database...");

            ContractTemplateEntity probation = ContractTemplateEntity.builder()
                    .name("Hợp Đồng Lao Động Thử Việc (Chuẩn Bộ Luật Lao Động)")
                    .contractTypeEnum(ContractTypeEnum.PROBATION)
                    .version(1)
                    .status(BaseStatusEnum.ACTIVE)
                    .templateContent(STANDARD_LABOR_CONTRACT_HTML)
                    .build();

            ContractTemplateEntity fixedTerm = ContractTemplateEntity.builder()
                    .name("Hợp Đồng Lao Động Xác Định Thời Hạn")
                    .contractTypeEnum(ContractTypeEnum.FIXED_TERM)
                    .version(1)
                    .status(BaseStatusEnum.ACTIVE)
                    .templateContent(STANDARD_LABOR_CONTRACT_HTML)
                    .build();

            ContractTemplateEntity indefinite = ContractTemplateEntity.builder()
                    .name("Hợp Đồng Lao Động Không Xác Định Thời Hạn")
                    .contractTypeEnum(ContractTypeEnum.INDEFINITE)
                    .version(1)
                    .status(BaseStatusEnum.ACTIVE)
                    .templateContent(STANDARD_LABOR_CONTRACT_HTML)
                    .build();

            ContractTemplateEntity seasonal = ContractTemplateEntity.builder()
                    .name("Hợp Đồng Lao Động Theo Mùa Vụ / Theo Công Việc")
                    .contractTypeEnum(ContractTypeEnum.SEASONAL)
                    .version(1)
                    .status(BaseStatusEnum.ACTIVE)
                    .templateContent(STANDARD_LABOR_CONTRACT_HTML)
                    .build();

            contractTemplateRepository.saveAll(List.of(probation, fixedTerm, indefinite, seasonal));
            log.info("Contract templates successfully seeded.");
        }
    }
}
