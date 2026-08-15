# Bộ dữ liệu User & Profile báo cáo

Phase `identity` của entrypoint `main.py` tạo bộ dữ liệu định danh cố định gồm 50 nhân viên và 50 học viên. Script không được frontend sử dụng và không tự chạy khi import.

## Thành phần

- 1 ADMIN, 5 HR, 5 SUPPORT, 26 TEACHER, 13 TA và 50 STUDENT.
- 100 avatar là object thật trong bucket MinIO, mỗi user có một `file_key` và một `file_metadata` riêng.
- 50 nhân viên có hồ sơ, hợp đồng đã ký, PDF thật và metadata `CONTRACT` riêng.
- 50 học viên có hồ sơ; 12 học viên vị thành niên có guardian; mỗi học viên có 4 interest và 1 study goal.
- Mật khẩu demo chung là `Password@123`, chỉ dùng cho dữ liệu báo cáo cục bộ.

## Cấu hình

Script đọc cấu hình MySQL từ `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; cấu hình MinIO từ `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`.

Cài dependency trong virtual environment riêng:

```bash
cd database/gen_data
python -m pip install -r requirements.txt
```

Khi chủ động muốn sinh riêng giai đoạn này:

```bash
cd database/gen_data
python main.py --phase identity
```

Nếu bất kỳ kiểm tra toàn vẹn nào thất bại, transaction MySQL rollback và các object MinIO chỉ vừa upload trong lượt chạy đó được xóa bù trừ. Object có sẵn không bị xóa.
