# Logic nghiệp vụ chi tiết — Module Nhân sự & Lương

## 0. Sơ đồ quan hệ tổng quan

```
UserEntity (1) ── (1) EmployeeEntity
                        │
                        ├──(1)──(N) EmployeeContractEntity     [hợp đồng lao động — lịch sử]
                        ├──(1)──(N) SalaryEntity                [bảng lương theo kỳ]
                        ├──(1)──(N) AttendanceEntity             [chấm công theo ngày]
                        ├──(1)──(N) TeachingRateEntity           [đơn giá dạy học — lịch sử]
                        └──(1)──(N) TeachingSessionPaymentEntity [thanh toán từng buổi dạy]

ClassEntity (1) ──(N) TeachingRateEntity
ClassOnlineEntity (1) ──(N) TeachingSessionPaymentEntity
TeachingRateEntity (1) ──(N) TeachingSessionPaymentEntity
```

**Nguyên tắc chung xuyên suốt:** `EmployeeContractEntity` và `TeachingRateEntity` là các bảng **lịch sử theo thời gian** (có `startDate/endDate` hoặc `effectiveFrom/effectiveTo`). Không bao giờ có 1 bản ghi duy nhất "đang dùng" — phải luôn **resolve theo thời điểm** cần tính (kỳ lương, thời điểm buổi dạy diễn ra).

---

## 1. EmployeeEntity

### Tạo (Create)
- Bắt buộc `userId` phải tồn tại trong `UserEntity` và **chưa từng là employee** (kiểm tra `existsById`).
- `employeeCode` phải duy nhất toàn hệ thống.
- Không tự set `userId` tay — chỉ set `userEntity`, để `@MapsId` tự đồng bộ id.
- Trạng thái khởi tạo mặc định: `ACTIVE`.
- `departmentId` có thể null (chưa phân bổ phòng ban) hoặc phải tồn tại nếu có truyền lên.

### Sửa (Update)
- Không cho đổi `userId`/`userEntity` sau khi tạo (khóa chia sẻ với `UserEntity`, đổi là sai bản chất nghiệp vụ — coi như phải xóa tạo lại).
- Đổi `employeeCode`: phải kiểm tra trùng với các employee khác (trừ chính nó).
- Đổi `departmentId`: chỉ update nếu client thực sự gửi giá trị mới; nếu field không được gửi (partial update) thì giữ nguyên department cũ, tuyệt đối không tự set về null.
- Đổi `status` sang `TERMINATED`: nên là hành động nghiệp vụ tách biệt (ví dụ endpoint riêng "cho nghỉ việc"), không lẫn vào update thông tin thông thường — vì hành động này kéo theo hệ quả (xem mục "Nghỉ việc" bên dưới).

### Xóa (Delete) — luôn là xóa mềm
- Không xóa cứng vì `EmployeeContractEntity`, `SalaryEntity`, `AttendanceEntity`, `TeachingRateEntity`, `TeachingSessionPaymentEntity` đều tham chiếu `employee_id` — xóa cứng sẽ vi phạm FK hoặc mất lịch sử tài chính.
- Xóa mềm = set `status = DELETE`.
- Trước khi cho xóa mềm, nên kiểm tra nghiệp vụ: nhân viên có **hợp đồng đang hiệu lực** (`EmployeeContractEntity.status = ACTIVE` và trong khoảng ngày hiệu lực) hay **bảng lương ở trạng thái chưa chốt** (`SalaryEntity.status = DRAFT`) hay không — nếu có, nên cảnh báo hoặc chặn, vì xóa nhân viên đang có hợp đồng/lương dở dang dễ gây sai lệch số liệu.
- Sau khi xóa mềm: các query đọc danh sách employee (`getAll`, `search`) phải tự động loại trừ các bản ghi `status = DELETE`.

### Nghỉ việc (`status → TERMINATED`) — hệ quả kéo theo
- Nên tự động set `endDate` cho `EmployeeEntity` (nếu có field này ở entity — hiện chưa thấy, cân nhắc bổ sung) hoặc bắt buộc đóng (set `endDate`) cho `EmployeeContractEntity` đang hiệu lực tương ứng.
- Không tự động hủy/xóa `TeachingRateEntity` đang có — nên set `effectiveTo` = ngày nghỉ việc để đơn giá không còn được áp dụng cho các buổi dạy sau đó, nhưng lịch sử vẫn giữ nguyên.
- Không tự động hủy `SalaryEntity` các kỳ trước — dữ liệu lịch sử giữ nguyên.

---

## 2. EmployeeContractEntity (Hợp đồng lao động)

### Tạo (Create)
- `employeeId` bắt buộc tồn tại và **không ở trạng thái `DELETE`**.
- **Ràng buộc quan trọng nhất: không cho 2 hợp đồng `ACTIVE` chồng lấn thời gian** cho cùng 1 nhân viên. Trước khi tạo hợp đồng mới, phải kiểm tra: có hợp đồng nào khác của nhân viên này đang `ACTIVE` mà khoảng `[startDate, endDate]` giao nhau với hợp đồng sắp tạo không. Nếu có → chặn tạo, báo lỗi rõ ràng (ví dụ "Nhân viên đã có hợp đồng hiệu lực trong khoảng thời gian này").
- Trường hợp ký hợp đồng mới thay thế hợp đồng cũ (tăng lương, đổi loại hợp đồng): nghiệp vụ chuẩn là **đóng hợp đồng cũ** (set `endDate` = ngày trước khi hợp đồng mới có hiệu lực) **trước hoặc đồng thời** khi tạo hợp đồng mới, không để 2 hợp đồng active chồng nhau.
- `baseSalary` phải > 0.
- `endDate` nếu có phải sau `startDate`.
- Nếu có đính kèm file hợp đồng (`fileMetadata`/`fileKey`): validate file đã upload thành công trước khi liên kết.

### Sửa (Update)
- Không cho đổi `employeeId` sau khi tạo (đổi chủ thể hợp đồng là vô nghĩa — nên tạo hợp đồng mới thay vì sửa).
- Đổi `baseSalary`, `startDate`, `endDate`: **chỉ ảnh hưởng tới các kỳ lương chưa tạo hoặc chưa chốt** (`SalaryEntity.status = DRAFT` trở về sau theo thời gian). Các bản ghi `SalaryEntity` đã tạo cho kỳ cũ **không tự động cập nhật lại** theo hợp đồng mới — đây là hành vi đúng, vì lương đã chốt cho quá khứ không đổi theo hợp đồng chỉnh sửa sau này.
- Nếu sửa `startDate`/`endDate` khiến hợp đồng bị chồng lấn với hợp đồng `ACTIVE` khác của cùng nhân viên → áp dụng lại đúng validate như lúc tạo.
- Đổi `status` từ `ACTIVE` sang trạng thái khác (kết thúc hợp đồng): cân nhắc bắt buộc phải có `endDate` đi kèm.

### Xóa (Delete)
- Nên là xóa mềm (đổi `status`) thay vì xóa cứng, để giữ lịch sử lương/hợp đồng phục vụ tra cứu, kiểm toán sau này.
- Nếu bắt buộc phải xóa cứng (ví dụ hợp đồng tạo nhầm, chưa từng dùng để tính lương kỳ nào): phải kiểm tra **chưa có `SalaryEntity` nào tham chiếu tới kỳ nằm trong khoảng hiệu lực của hợp đồng này** trước khi cho xóa, tránh mất căn cứ cho các bảng lương đã tạo.

---

## 3. SalaryEntity (Bảng lương theo kỳ)

### Tạo (Create)
- `employeeId` bắt buộc tồn tại, nhân viên không ở trạng thái `DELETE`.
- Mỗi nhân viên **chỉ có tối đa 1 bản ghi `SalaryEntity` cho mỗi `period`** — kiểm tra trùng trước khi tạo (unique theo cặp `employeeId + period`).
- **`baseSalary` KHÔNG được nhận trực tiếp từ client nhập tay.** Phải tự động resolve từ `EmployeeContractEntity` đang hiệu lực tại `period` đó:
  - Điều kiện hiệu lực: `contract.startDate <= ngày cuối kỳ` VÀ (`contract.endDate IS NULL` HOẶC `contract.endDate >= ngày đầu kỳ`), và `contract.status = ACTIVE`.
  - Nếu tìm được nhiều hợp đồng thỏa điều kiện (trường hợp lỗi dữ liệu do hợp đồng bị chồng lấn) → lấy hợp đồng có `startDate` mới nhất, đồng thời nên log cảnh báo vì đây là dấu hiệu dữ liệu hợp đồng có vấn đề (xem mục 2).
  - Nếu **không tìm thấy hợp đồng hiệu lực nào** cho kỳ đó → chặn tạo bảng lương, báo lỗi nghiệp vụ rõ ràng ("Nhân viên chưa có hợp đồng hiệu lực cho kỳ lương này"), tuyệt đối không tạo bảng lương với `baseSalary = null` hoặc `0`.
- `salaryType` nên đồng bộ theo `salaryType` của hợp đồng đang áp dụng, không để client tự chọn tùy ý (tránh lệch giữa lương và hợp đồng).
- `bonus`, `deduction`: có thể client nhập tay (khoản điều chỉnh phát sinh ngoài lương cơ bản), mặc định 0 nếu không có.
- `totalSalary = baseSalary + bonus - deduction` — luôn tính lại ở server, không tin tưởng giá trị `totalSalary` nếu client có gửi lên.
- Trạng thái khởi tạo: `DRAFT`.

### Sửa (Update)
- Chỉ cho sửa khi `status = DRAFT`. Nếu bảng lương đã ở trạng thái tiếp theo (đã duyệt/đã thanh toán), chặn sửa trực tiếp — nếu cần điều chỉnh, nên có luồng riêng (ví dụ tạo phụ lục điều chỉnh, hoặc yêu cầu quyền đặc biệt).
- Nếu cho sửa `bonus`/`deduction`: phải tính lại `totalSalary` ngay trong cùng transaction.
- Không cho sửa `baseSalary` trực tiếp qua API update — nếu hợp đồng thay đổi, phải chạy lại logic resolve từ hợp đồng (tức là gọi lại đúng luồng như lúc tạo), không set tay số liệu này.
- Không cho đổi `employeeId`/`period` sau khi tạo — nếu sai kỳ/sai người thì nên xóa và tạo lại (khi còn `DRAFT`), không sửa.

### Xóa (Delete)
- Chỉ cho xóa khi `status = DRAFT`. Bảng lương đã duyệt/đã thanh toán tuyệt đối không cho xóa — cần giữ làm chứng từ tài chính.
- Cân nhắc xóa mềm ngay cả với `DRAFT`, để giữ dấu vết ai đã tạo/hủy bảng lương nào.

### Chuyển trạng thái (DRAFT → duyệt → đã thanh toán)
- Mỗi bước chuyển trạng thái nên là 1 hành động nghiệp vụ riêng (endpoint riêng), không lồng vào `update` chung.
- Khi chuyển sang "đã thanh toán": set `paidAt = now()`, và từ thời điểm này bảng lương coi như bất biến (immutable).

---

## 4. AttendanceEntity (Chấm công)

### Tạo (Create — check-in)
- `employeeId` bắt buộc tồn tại, không ở trạng thái `DELETE`/`TERMINATED`.
- Không cho 1 nhân viên có 2 bản ghi chấm công **đang mở** (đã check-in nhưng chưa check-out) cùng lúc — kiểm tra trước khi tạo mới: nếu có bản ghi `checkOutTime IS NULL` của nhân viên đó, phải chặn hoặc tự động đóng bản ghi cũ tùy quy tắc nghiệp vụ (cần xác nhận: hệ thống có cho phép quên check-out qua ngày hôm sau không).
- `checkInTime` mặc định là thời điểm gọi API (server time), không nên tin thời gian client gửi lên để tránh gian lận giờ công.

### Sửa (Update — check-out hoặc điều chỉnh)
- `checkOutTime` phải sau `checkInTime`.
- Điều chỉnh giờ công sau khi đã chấm công xong (ví dụ do quên check-out, admin sửa tay): nên yêu cầu `note` bắt buộc để giải trình, và nên giới hạn quyền (chỉ admin/HR mới sửa được, nhân viên tự chấm công không tự sửa lại giờ của mình).

### Xóa (Delete)
- Cân nhắc không cho xóa cứng bản ghi chấm công vì đây là dữ liệu làm căn cứ tính công/lương — nếu cần "xóa" do nhập sai, nên đổi `status` (ví dụ thêm trạng thái `INVALID`/`CANCELLED`) và giữ lại bản ghi kèm `note` lý do.

### Liên hệ với `SalaryEntity`
- Nếu nghiệp vụ tính lương dựa theo `salaryType = HOURLY/DAILY` (từ hợp đồng), thì khi tạo `SalaryEntity`, cần tổng hợp dữ liệu từ `AttendanceEntity` trong kỳ đó (số ngày công / số giờ công) để tính ra phần lương biến đổi — hiện tại `SalaryEntity` chưa thấy field lưu số công/giờ thực tế, cần xác nhận có bổ sung field này không nếu muốn tự động hóa việc tính lương theo công.

---

## 5. TeachingRateEntity (Đơn giá dạy học)

### Tạo (Create)
- `employeeId` bắt buộc tồn tại, không ở trạng thái `DELETE`.
- `classId` bắt buộc tồn tại.
- **Không cho 2 đơn giá `ACTIVE` chồng lấn thời gian** cho cùng cặp `(employeeId, classId)` — tương tự nguyên tắc ở `EmployeeContractEntity`. Kiểm tra khoảng `[effectiveFrom, effectiveTo]` giao nhau trước khi tạo.
- `rate` phải > 0.
- `effectiveTo` nếu có phải sau `effectiveFrom`.
- Khi tạo đơn giá mới thay thế đơn giá cũ (điều chỉnh giá dạy): nên đóng đơn giá cũ (set `effectiveTo`) trước/đồng thời tạo đơn giá mới, tránh chồng lấn.

### Sửa (Update)
- Đổi `rate`, `effectiveFrom`, `effectiveTo`: **không ảnh hưởng tới các `TeachingSessionPaymentEntity` đã tạo trước đó**, vì các bản ghi payment đã snapshot `rateApplied` riêng tại thời điểm tạo — đây là hành vi đúng, không cần và không nên tính lại các payment cũ.
- Nếu sửa khiến đơn giá bị chồng lấn với đơn giá `ACTIVE` khác cùng cặp `(employeeId, classId)` → áp dụng lại validate như lúc tạo.
- Không cho đổi `employeeId`/`classId` sau khi tạo (đổi chủ thể là vô nghĩa, nên tạo mới).

### Xóa (Delete)
- Nên xóa mềm (đổi `status`) vì `TeachingSessionPaymentEntity` có tham chiếu `rate_id` tới bản ghi này — xóa cứng sẽ vi phạm FK nếu đã có payment nào dùng đơn giá này.
- Nếu chưa từng được dùng để tạo payment nào, có thể cân nhắc cho xóa cứng.

---

## 6. TeachingSessionPaymentEntity (Thanh toán buổi dạy)

### Tạo (Create)
- `employeeId` bắt buộc tồn tại, không ở trạng thái `DELETE`.
- `classOnlineId` bắt buộc tồn tại — đây là buổi học cụ thể đã diễn ra hoặc đã lên lịch.
- Mỗi `classOnlineId` chỉ nên có **1 bản ghi payment tương ứng** (tránh tính tiền trùng cho cùng 1 buổi dạy) — kiểm tra trùng `classOnlineId` trước khi tạo.
- **`rateId` và `rateApplied` KHÔNG nên nhận trực tiếp từ client nhập tay.** Tự động resolve `TeachingRateEntity` hiệu lực tại thời điểm buổi học diễn ra (`classOnline.scheduledAt`), theo cặp `(employeeId, classId của buổi học đó)`:
  - Nếu không tìm thấy đơn giá hiệu lực → chặn tạo, báo lỗi rõ ràng ("Chưa có đơn giá áp dụng cho giáo viên này tại thời điểm buổi dạy").
  - Sau khi resolve được `TeachingRateEntity`, **lưu snapshot `rateApplied = rate.getRate()` ngay tại thời điểm tạo** — không chỉ giữ `rateId` rồi tính toán lại mỗi lần đọc, vì đơn giá gốc có thể bị sửa sau này (xem mục 5).
- `amount` luôn được server tự tính lại từ `rateApplied` và `actualDurationMin` (theo công thức quy đổi thực tế của nghiệp vụ — cần xác nhận đơn vị tính: theo giờ, theo phút, hay theo buổi cố định), không tin giá trị `amount` nếu client gửi lên.
- `actualDurationMin` nên được lấy từ dữ liệu thực tế của buổi học (ví dụ log từ hệ thống học trực tuyến) thay vì để giáo viên/admin tự nhập tay, nếu hệ thống có nguồn dữ liệu đó — giảm rủi ro gian lận giờ dạy.
- Trạng thái khởi tạo: `PENDING`.

### Sửa (Update)
- Chỉ cho sửa khi `status = PENDING` (chưa duyệt/chưa thanh toán). Payment đã duyệt/đã trả tiền không nên sửa trực tiếp.
- Nếu cho phép sửa `actualDurationMin` (ví dụ điều chỉnh lại thời lượng thực tế sau khi đối soát): phải **tính lại `amount`** dựa trên `rateApplied` đã snapshot (không resolve lại rate mới), trong cùng transaction.
- Đổi `classOnlineId`: cần validate lại không trùng với payment khác, và nên cân nhắc có nên cho phép đổi hay bắt buộc tạo lại bản ghi mới (vì đổi buổi học gắn liền là thay đổi bản chất giao dịch).
- Đổi `employeeId`: tương tự — đổi giáo viên cho 1 buổi dạy đã ghi nhận là thay đổi lớn, nên có validate/log rõ ràng, và **phải resolve lại `rateApplied`** theo giáo viên mới (không giữ nguyên rate của giáo viên cũ).
- Đổi `rateId` thủ công: chỉ nên cho phép trong trường hợp đặc biệt (điều chỉnh sai sót), và khi đổi phải đồng thời cập nhật lại `rateApplied`/`amount` tương ứng, không để 2 giá trị lệch nhau.

### Xóa (Delete)
- Chỉ cho xóa (hoặc hủy — đổi status) khi `status = PENDING`.
- Không xóa cứng payment đã duyệt/đã thanh toán — đây là chứng từ tài chính, cần giữ lại; nếu cần "hủy", nên có trạng thái `CANCELLED` riêng thay vì xóa khỏi DB.

### Liên hệ với `SalaryEntity`
- Cần xác nhận nghiệp vụ: tổng tiền dạy học (`TeachingSessionPaymentEntity` trong kỳ, trạng thái đã duyệt) có được **cộng gộp vào `SalaryEntity.totalSalary`** của kỳ đó không, hay đây là 2 khoản chi trả hoàn toàn tách biệt (ví dụ lương cứng trả theo hợp đồng, tiền dạy trả riêng theo từng buổi). Đây là điểm ảnh hưởng lớn tới luồng tạo `SalaryEntity`, cần chốt rõ trước khi code.

---

## 7. Bảng tổng hợp rủi ro toàn vẹn dữ liệu cần validate khi thao tác

| Hành động | Rủi ro nếu không kiểm soát | Biện pháp |
|---|---|---|
| Xóa `EmployeeEntity` | Vi phạm FK với Contract/Salary/Attendance/Rate/Payment | Luôn xóa mềm, không xóa cứng |
| Tạo `EmployeeContractEntity` chồng thời gian | Không xác định được hợp đồng nào "đang hiệu lực" khi tính lương → dữ liệu mơ hồ | Validate không chồng lấn khoảng `[startDate, endDate]` với hợp đồng `ACTIVE` khác cùng nhân viên |
| Tạo `TeachingRateEntity` chồng thời gian | Không xác định được đơn giá áp dụng khi tính tiền dạy | Validate không chồng lấn khoảng `[effectiveFrom, effectiveTo]` cùng cặp GV + lớp |
| Tạo `SalaryEntity` khi chưa có hợp đồng hiệu lực | Bảng lương với `baseSalary` sai/null | Chặn tạo, bắt buộc phải resolve được hợp đồng trước |
| Tạo `TeachingSessionPaymentEntity` khi chưa có đơn giá hiệu lực | Payment với `rateApplied`/`amount` sai/null | Chặn tạo, bắt buộc phải resolve được rate trước |
| Sửa `EmployeeContractEntity.baseSalary` sau khi đã có `SalaryEntity` của kỳ liên quan | Nếu vô tình tính lại lương cũ theo hợp đồng mới → sai lịch sử tài chính | Không bao giờ tính lại `SalaryEntity` đã tạo khi hợp đồng gốc thay đổi |
| Sửa `TeachingRateEntity.rate` sau khi đã có `TeachingSessionPaymentEntity` dùng rate đó | Tương tự — sai lịch sử nếu tính lại | Luôn dùng `rateApplied` đã snapshot, không tính lại từ rate hiện tại |
| Xóa `SalaryEntity`/`TeachingSessionPaymentEntity` đã duyệt/đã trả | Mất chứng từ tài chính | Chỉ cho xóa/sửa khi còn ở trạng thái nháp (`DRAFT`/`PENDING`) |
| 2 payment cùng trỏ 1 `classOnlineId` | Tính tiền trùng cho 1 buổi dạy | Kiểm tra unique `classOnlineId` trước khi tạo |

---

## 8. Các điểm cần xác nhận thêm với nghiệp vụ thực tế trước khi code

1. Đơn vị tính `rate` trong `TeachingRateEntity` là theo giờ, theo buổi cố định, hay theo phút? (ảnh hưởng trực tiếp công thức tính `amount`).
2. `SalaryEntity.totalSalary` có bao gồm tổng tiền dạy học trong kỳ hay không?
3. Khi nhân viên nghỉ việc (`TERMINATED`), có cần tự động đóng (`endDate`) các `EmployeeContractEntity`/`TeachingRateEntity` đang mở hay để thủ công?
4. Có cho phép sửa giờ chấm công (`AttendanceEntity`) sau khi đã dùng để tính lương của kỳ đó chưa (đã chốt `SalaryEntity`) hay không?
5. Trường hợp 1 nhân viên vừa có lương cứng theo hợp đồng, vừa có tiền dạy học theo buổi — 2 khoản này có chung 1 quy trình duyệt/thanh toán hay tách biệt hoàn toàn về mặt quy trình (người duyệt khác nhau, thời điểm chi trả khác nhau)?
