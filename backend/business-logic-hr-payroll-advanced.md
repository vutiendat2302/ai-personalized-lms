# Logic nghiệp vụ nâng cao — Module Nhân sự & Lương (Phần 2)

> Tài liệu này bổ sung cho `business-logic-hr-payroll.md`, đi sâu vào 4 mảng: Nghỉ phép & chấm công nâng cao, Phê duyệt đa cấp, Phụ cấp/thuế/bảo hiểm, Phân quyền truy cập dữ liệu lương.

---

## PHẦN A — Nghỉ phép & Chấm công nâng cao

### A.1 Vấn đề của thiết kế hiện tại
`EmployeeStatusEnum` có `ON_LEAVE` nhưng đây là **trạng thái tổng của nhân viên**, không phản ánh được: nghỉ loại gì (phép năm, ốm, không lương...), nghỉ từ ngày nào đến ngày nào, ai duyệt. Cần một entity riêng — ví dụ `LeaveRequestEntity` — thay vì chỉ dựa vào `EmployeeEntity.status`.

### A.2 Đề xuất entity mới: `LeaveRequestEntity`
Các field cần có:
- `employeeId` — người xin nghỉ
- `leaveType` (enum): `ANNUAL` (phép năm), `SICK` (ốm), `UNPAID` (không lương), `MATERNITY`, `OTHER`...
- `startDate`, `endDate` — khoảng nghỉ
- `totalDays` — số ngày nghỉ thực tế (có thể lệch với `endDate - startDate` nếu tính theo giờ hành chính, loại trừ cuối tuần/ngày lễ)
- `reason` — lý do
- `status` (enum): `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`
- `approvedBy`, `approvedAt` — ai duyệt, khi nào

### A.3 Quy tắc nghiệp vụ khi tạo đơn nghỉ phép
- Không cho tạo đơn nghỉ chồng lấn ngày với đơn nghỉ khác đang `PENDING`/`APPROVED` của cùng nhân viên.
- Với `leaveType = ANNUAL`: cần kiểm tra **số ngày phép còn lại trong năm** (cần thêm cơ chế tính quota phép năm — ví dụ 12 ngày/năm, cộng dồn hoặc theo thâm niên). Nếu vượt quota, chặn tạo hoặc yêu cầu chuyển sang `UNPAID`.
- Không cho tạo đơn nghỉ có `startDate` nằm ngoài khoảng hợp đồng đang hiệu lực (nhân viên chưa vào làm hoặc đã nghỉ việc thì không thể xin nghỉ phép).
- `startDate` không được là ngày trong quá khứ trừ khi có cờ đặc biệt (nghỉ ốm đột xuất báo bù sau).

### A.4 Hệ quả khi đơn nghỉ được duyệt (`status = APPROVED`)
- Nếu nghỉ trọn ngày làm việc: **không tạo `AttendanceEntity` check-in/check-out** cho những ngày đó, hoặc tạo với 1 trạng thái riêng (ví dụ thêm `AttendanceStatusEnum.ON_LEAVE`) để phân biệt với "vắng không phép".
- Khi tính `SalaryEntity` cho kỳ có ngày nghỉ:
  - `ANNUAL`/nghỉ có lương: không trừ lương, coi như ngày công đủ.
  - `UNPAID`: phải trừ tương ứng vào `deduction` hoặc giảm số ngày công tính lương (nếu `salaryType = DAILY`/`HOURLY`).
  - `SICK` có bảo hiểm chi trả: phần lương những ngày này có thể do BHXH chi trả một phần — cần xác nhận công thức cụ thể với nghiệp vụ thực tế (mục này ảnh hưởng tới Phần C bên dưới).

### A.5 Sửa/Hủy đơn nghỉ phép
- Chỉ cho sửa/hủy khi `status = PENDING`. Đơn đã `APPROVED` mà cần hủy phải qua flow riêng (yêu cầu hủy → người duyệt xác nhận hủy), không cho nhân viên tự ý xóa vì đã ảnh hưởng tới lịch làm việc/chấm công.
- Nếu hủy đơn đã `APPROVED` **sau khi `AttendanceEntity`/`SalaryEntity` của kỳ đó đã được tạo dựa trên đơn này** → cần cảnh báo rõ, vì việc hủy có thể làm sai lệch dữ liệu đã tính, cần luồng điều chỉnh riêng chứ không tự động re-tính ngược.

### A.6 Chấm công nâng cao — các trường hợp cần xử lý
- **Đi trễ / về sớm**: so sánh `checkInTime`/`checkOutTime` với khung giờ hành chính chuẩn (cần thêm cấu hình `WorkScheduleEntity` hoặc field cấu hình giờ làm chuẩn theo `department`/`employmentType`), từ đó tính số phút trễ/sớm — có thể ảnh hưởng tới phụ cấp chuyên cần (xem Phần C).
- **Làm thêm giờ (OT)**: nếu `checkOutTime` vượt quá giờ làm chuẩn, phần dư có thể được ghi nhận là `overtimeMinutes` — cần thêm field hoặc entity riêng `OvertimeRequestEntity` nếu OT cần được duyệt trước (nhiều công ty yêu cầu đăng ký OT trước, không tự động tính từ giờ ra về).
- **Chấm công qua ca đêm** (check-in tối hôm trước, check-out sáng hôm sau): cần xác định "ngày công" thuộc về ngày nào — thường lấy theo ngày `checkInTime`.
- **Vắng không phép**: nếu không có `AttendanceEntity` cho 1 ngày làm việc và cũng không có `LeaveRequestEntity` được duyệt cho ngày đó → hệ thống cần có cơ chế tự động đánh dấu "vắng không phép" (qua job chạy cuối ngày) để không bị bỏ sót khi tính lương.

---

## PHẦN B — Phê duyệt đa cấp (Approval Workflow)

### B.1 Vấn đề hiện tại
Các entity như `EmployeeContractEntity`, `SalaryEntity`, `TeachingSessionPaymentEntity` chỉ có `status` đơn giản (`ACTIVE`, `DRAFT`, `PENDING`...), chưa thể hiện được: **ai** duyệt, **cấp nào** đang chờ duyệt, có bị **từ chối** kèm lý do không.

### B.2 Đề xuất mô hình chung: `ApprovalRequestEntity` (generic) hoặc field nhúng trực tiếp

**Cách 1 — Nhúng trực tiếp vào từng entity** (đơn giản, đủ dùng nếu quy trình duyệt chỉ 1 cấp):
- Thêm field: `approvedBy` (userId người duyệt), `approvedAt`, `rejectedReason`.
- Trạng thái mở rộng: `DRAFT → PENDING_APPROVAL → APPROVED / REJECTED`.

**Cách 2 — Bảng `ApprovalRequestEntity` dùng chung cho nhiều loại đối tượng** (linh hoạt hơn, dùng khi cần nhiều cấp duyệt hoặc nhiều loại nghiệp vụ cùng cần approval):
- `targetType` (enum hoặc string): `CONTRACT`, `SALARY`, `TEACHING_PAYMENT`, `LEAVE_REQUEST`...
- `targetId` — id của bản ghi cần duyệt
- `level` — cấp duyệt hiện tại (1, 2, 3...) nếu có đa cấp
- `approverId`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `comment`, `decidedAt`

→ **Cách 2 nên dùng nếu** có từ 2 loại nghiệp vụ trở lên cần duyệt và muốn thống nhất 1 luồng xử lý/1 màn hình "danh sách chờ duyệt" cho quản lý, tránh lặp lại logic ở nhiều entity.

### B.3 Quy tắc xác định "ai là người duyệt"
Phụ thuộc cấu trúc tổ chức — các phương án phổ biến:
- **Theo cấp bậc cố định**: HR duyệt hợp đồng, Kế toán duyệt lương, Trưởng bộ môn duyệt đơn giá dạy học — gắn với `RoleEntity`/`PermissionEntity` đã có sẵn trong hệ thống (thấy có `role_permission` trong log truy vấn ban đầu).

### B.4 Ràng buộc quan trọng khi có approval
- Bản ghi đang ở trạng thái `PENDING_APPROVAL` **không được sửa nội dung** (số tiền, ngày tháng...) — nếu cần sửa, phải hủy request duyệt hiện tại và tạo lại từ đầu (tránh tình huống người duyệt xem 1 số liệu nhưng số liệu bị đổi sau khi họ đã duyệt).
- Người tạo request **không được tự duyệt request của chính mình** (tách biệt vai trò tạo và duyệt — nguyên tắc kiểm soát nội bộ cơ bản).
- Khi `REJECTED`: bản ghi gốc nên quay lại `DRAFT` (cho sửa lại) hoặc archive tùy nghiệp vụ, kèm bắt buộc `comment`/lý do từ chối để người tạo biết cần sửa gì.
- Cần audit log riêng cho mọi hành động duyệt/từ chối (ai, khi nào, quyết định gì) — không được cho sửa/xóa lịch sử duyệt sau khi đã quyết định, kể cả admin.

### B.5 Áp dụng cụ thể cho từng entity đã có

| Entity | Đề xuất số cấp duyệt | Ghi chú |
|---|---|---|
| `EmployeeContractEntity` | 1 cấp (HR/quản lý trực tiếp) | Duyệt trước khi hợp đồng chuyển `ACTIVE` |
| `SalaryEntity` | 1–2 cấp (Trưởng phòng → Kế toán) | Duyệt trước khi chuyển từ `DRAFT` sang trạng thái tiếp theo, trước khi thanh toán |
| `TeachingSessionPaymentEntity` | 1 cấp (Trưởng bộ môn/Quản lý đào tạo) | Duyệt trước khi chuyển từ `PENDING` sang đã duyệt |
| `LeaveRequestEntity` (Phần A) | 1 cấp (quản lý trực tiếp) | Duyệt trước khi ảnh hưởng tới chấm công/lương |

---

## PHẦN C — Phụ cấp, thuế, bảo hiểm trong bảng lương

### C.1 Vấn đề của `SalaryEntity` hiện tại
Công thức hiện tại quá đơn giản: `totalSalary = baseSalary + bonus - deduction`. Thực tế lương ở Việt Nam có nhiều thành phần bắt buộc và phức tạp hơn nhiều — không nên gộp hết vào 2 field `bonus`/`deduction` chung chung, vì:
- Khó truy vết từng khoản là gì.
- Khó tuân thủ khi cần xuất bảng lương chi tiết cho cơ quan thuế/BHXH hoặc cho chính nhân viên xem.

### C.2 Đề xuất tách chi tiết — entity `SalaryDetailEntity` (dòng chi tiết lương) hoặc mở rộng field
Mỗi kỳ lương nên có nhiều "dòng" thành phần thay vì 1 con số gộp:

**Nhóm khoản cộng (Earnings):**
- Lương cơ bản (`baseSalary`, đã có, lấy từ hợp đồng)
- Phụ cấp cố định: ăn trưa, xăng xe, điện thoại, nhà ở... (thường cố định theo hợp đồng hoặc theo chính sách công ty)
- Phụ cấp biến đổi: chuyên cần (phụ thuộc số ngày đi trễ/vắng — liên hệ Phần A), làm thêm giờ (OT, tính theo `overtimeMinutes` × đơn giá OT, thường nhân hệ số 1.5x/2x/3x tùy ngày thường/cuối tuần/lễ)
- Thưởng (`bonus`, đã có) — thưởng KPI, thưởng nóng, thưởng lễ tết...
- Tiền dạy học (nếu gộp vào lương — xem lại câu hỏi mở ở tài liệu Phần 1, mục 8.2)

**Nhóm khoản trừ (Deductions):**
- Bảo hiểm bắt buộc: BHXH, BHYT, BHTN — thường tính theo % trên lương đóng bảo hiểm (không nhất thiết bằng `baseSalary` thực nhận, có thể có mức trần theo quy định nhà nước, cần cấu hình theo từng thời kỳ vì tỷ lệ/mức lương tối thiểu vùng có thể thay đổi theo năm).
- Thuế thu nhập cá nhân (TNCN): tính theo biểu thuế lũy tiến từng phần, phụ thuộc thu nhập chịu thuế sau khi trừ bảo hiểm, giảm trừ gia cảnh (bản thân + người phụ thuộc — cần thêm dữ liệu số người phụ thuộc của từng nhân viên).
- Khoản trừ khác: đi trễ/về sớm/vắng không phép (liên hệ Phần A.6), tạm ứng lương kỳ trước, bồi thường vi phạm (nếu có)...

### C.3 Nguyên tắc tính toán — thứ tự quan trọng
1. Tính **thu nhập gộp** (Gross) = lương cơ bản + tất cả phụ cấp + thưởng + OT.
2. Tính **thu nhập đóng bảo hiểm** (thường không bằng Gross — theo quy định có thể chỉ tính trên lương + phụ cấp cố định, không tính thưởng/OT biến đổi) → trừ BHXH/BHYT/BHTN theo %.
3. Tính **thu nhập chịu thuế** = Gross − bảo hiểm đã trừ − giảm trừ gia cảnh.
4. Tính **thuế TNCN** theo biểu lũy tiến trên thu nhập chịu thuế.
5. **Thực lãnh (Net)** = Gross − bảo hiểm − thuế TNCN − các khoản trừ khác (tạm ứng, phạt...).

→ Đây là lý do vì sao **không nên tự tính `totalSalary` bằng 1 công thức cộng trừ đơn giản** như hiện tại — cần 1 hàm/service tính lương riêng, theo đúng thứ tự trên, và các tỷ lệ (% bảo hiểm, biểu thuế, mức giảm trừ gia cảnh) nên được **cấu hình** (bảng cấu hình riêng theo hiệu lực thời gian, vì luật thay đổi theo từng giai đoạn), không hardcode trong code.

### C.4 Câu hỏi cần chốt với nghiệp vụ trước khi thiết kế lại `SalaryEntity`
1. Công ty có bắt buộc tính đúng BHXH/BHYT/BHTN/TNCN theo luật Việt Nam, hay chỉ cần lương gộp đơn giản (công ty nước ngoài/mô hình khác)?
2. Có cần lưu số người phụ thuộc, mã số thuế cá nhân của từng nhân viên để tính giảm trừ gia cảnh không?
3. Phụ cấp có cố định theo hợp đồng hay do HR nhập tay mỗi kỳ?
4. OT có yêu cầu đăng ký/duyệt trước hay tự động tính từ chấm công thực tế?

---

## PHẦN D — Phân quyền truy cập dữ liệu lương

### D.1 Nguyên tắc cốt lõi: dữ liệu lương là dữ liệu nhạy cảm nhất trong toàn hệ thống
Không thể áp dụng phân quyền theo kiểu "có role ADMIN thì xem hết" một cách đơn giản — cần phân tầng rõ theo **quan hệ giữa người xem và dữ liệu**, không chỉ theo role tĩnh.

### D.2 Các tầng truy cập đề xuất

| Vai trò | Được xem | Không được xem |
|---|---|---|
| Nhân viên thường | Lương, hợp đồng, chấm công **của chính mình** | Lương của bất kỳ ai khác, kể cả cùng phòng ban |
| Trưởng phòng | Chấm công, đơn nghỉ phép của **nhân viên thuộc phòng mình** (để duyệt) | Chi tiết lương (baseSalary, bonus, deduction) của nhân viên trong phòng — trừ khi công ty chủ trương minh bạch lương theo cấp quản lý (cần xác nhận) |
| HR | Hợp đồng, thông tin nhân sự của toàn bộ nhân viên | Không tự ý sửa số liệu lương đã duyệt (chỉ xem/tạo, không can thiệp sau khi đã qua approval) |
| Kế toán/Payroll | Toàn bộ dữ liệu `SalaryEntity`, `TeachingSessionPaymentEntity` để xử lý chi trả | Không cần quyền sửa `EmployeeContractEntity` (tách biệt vai trò tạo hợp đồng và chi trả) |
| Admin hệ thống | Toàn quyền kỹ thuật (cấu hình, phân quyền) | Nên **không mặc định** có quyền xem chi tiết lương nghiệp vụ — tách bạch quyền quản trị hệ thống và quyền nghiệp vụ tài chính |

### D.3 Cơ chế kỹ thuật để enforce phân quyền theo dữ liệu (data-level, không chỉ role-level)
Hệ thống hiện có `role_permission`/`permission` (thấy trong log truy vấn) — đây là phân quyền theo **chức năng** (được gọi API nào), nhưng chưa đủ để enforce phân quyền theo **dữ liệu** (được xem bản ghi nào). Cần thêm tầng kiểm tra:

- Ở tầng Service, sau khi xác thực user có quyền gọi API `getSalaryById`, vẫn phải kiểm tra thêm: `salary.getEmployee().getUserId().equals(currentUserId)` HOẶC `currentUser có role HR/Payroll`. Không dựa hoàn toàn vào `@PreAuthorize` cấp API mà bỏ qua kiểm tra ownership cấp bản ghi.
- Với danh sách (`search`, `getAll`): phải tự động filter theo phạm vi được xem (ví dụ nhân viên thường gọi `search` chỉ trả về bản ghi của chính họ, bất kể query truyền lên là gì) — không tin tưởng filter từ client, luôn ép điều kiện `employeeId = currentUserId` ở tầng server nếu người gọi không có quyền xem người khác.

### D.4 Trường hợp đặc biệt cần lưu ý
- Nhân viên vừa là giáo viên vừa có thể là **trưởng bộ môn** duyệt `TeachingRateEntity`/`TeachingSessionPaymentEntity` của giáo viên khác — nhưng **không được duyệt cho chính mình** (đã nêu ở B.4), kể cả khi họ có quyền duyệt nói chung.
- Log truy cập dữ liệu lương: nên ghi lại ai đã xem lương của ai, khi nào (không chỉ ai sửa) — vì đây là dữ liệu nhạy cảm, cần audit cả hành vi đọc, không chỉ hành vi ghi.

