# Bài nộp N06 — Track B: Vườn Toán Lớp 3 — "Ước lượng trước khi tính đúng"

- **Mã nhóm:** N06 · **Slug:** `hoang_mai_toan` · **Đề:** KTPMUD-BKT-2026-PILOT (Hack Marathon 2026 v1.0.2)
- **Thành viên (alias, không ghi họ tên/MSSV):** `Lead-BE`, `Dev-FE`
- Toàn bộ dữ liệu là **synthetic**; không kết nối production; không dùng LLM để sinh/chấm đáp án lúc chạy.

## Sản phẩm là gì
Một dạng luyện tập mới trong hệ thống Vườn Toán lớp 3 hiện có: với phép **nhân** và **chia hết**, học sinh phải **chốt ước lượng
(một số hoặc một khoảng) trước**, rồi mới được nhập kết quả tính chính xác. Server là nơi duy nhất biết đáp án, chấm điểm tất định
bằng số nguyên và ép thứ tự hai bước. Phản hồi tách bạch "ước lượng hợp lý" và "kết quả tính chính xác".

## Cài đặt / chạy / test (từ clean checkout của fork)
```bash
npm ci
npm run reset-db      # xoá DB cũ để nạp lại dữ liệu mẫu + 12 fixtures
npm start             # http://localhost:3000  (hocsinh01 / 123456 — tài khoản synthetic)
npm test              # 35 test (node --test), không cần cấu hình thêm
```
Vào bài: menu bên trái → **"Ước Lượng Trước Khi Tính"** (hoặc Bài 41 → bộ `uoc-luong-nhan-chia`).

## Quy tắc chấm (E = kết quả chính xác, số nguyên)
- Một số `v`: hợp lý ⇔ `⌈0,85·E⌉ ≤ v ≤ ⌊1,15·E⌋` (±15%).
- Một khoảng `[từ, đến]`: hợp lý ⇔ `từ ≤ E ≤ đến` và `đến − từ ≤ 30% E`.
- Điểm câu = 50% ước lượng hợp lý + 50% tính chính xác đúng.
Lý do chọn (và các phương án đã loại): `artifacts/DECISIONS.md` (ADR-03).

## Cấu trúc thư mục nộp (đề thi Mục 11.2)
```
submissions/hoang_mai_toan_N06/
├── submission.json
├── README.md                          (file này)
├── artifacts/
│   ├── REQUIREMENTS.md                yêu cầu, AC B-01…B-12, truy vết → code → test
│   ├── DECISIONS.md                   8 ADR
│   ├── TEST_REPORT.md                 môi trường, kết quả, giới hạn
│   ├── SECURITY_PRIVACY_CHECKLIST.md
│   ├── AI_USE.md
│   └── CONTRIBUTIONS.md
├── source-ref.json
└── slides/
    └── DEMO_SCRIPT.md                 kịch bản demo ≤ 7 phút
```

## Nguồn mã (ở gốc fork)
`server/estimationScorer.js` (quy tắc thuần) · `server/estimationApi.js` (API hai bước) · `server/db.js` (bảng/cột/seed thêm)
· `public/assets/js/pages/estimate.js` (giao diện) · `data/estimation_fixtures.json` · `test/` · `.github/workflows/ci.yml`.

> Các file trong `artifacts/` là bản chụp tại thời điểm đóng gói; khi sửa `REQUIREMENTS.md`/`DECISIONS.md` ở gốc fork, nhớ cập nhật bản sao ở đây trước khi freeze.
