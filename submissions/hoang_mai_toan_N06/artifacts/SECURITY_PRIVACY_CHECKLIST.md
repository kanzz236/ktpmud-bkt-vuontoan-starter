# SECURITY_PRIVACY_CHECKLIST — N06 — Track B

Phạm vi: phần nhóm thêm cho dạng bài "Ước lượng trước khi tính đúng". Phần starter không đổi (auth, session, deploy) được ghi rõ là ngoài phạm vi (B-07).

## 1. Dữ liệu & PII (B-11)

| # | Hạng mục | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|---|
| 1 | Chỉ dùng dữ liệu synthetic (học sinh `hocsinhNN`, giáo viên `giaovien01`, fixtures sinh từ seed) | Đạt | `data/seed.json`, `data/estimation_fixtures.json` |
| 2 | Không có họ tên/MSSV/email thật trong repo và thư mục nộp | Đạt | Thành viên chỉ dùng alias `Lead-BE`, `Dev-FE` (`submission.json`, README, PROGRESS). `submission.json` đã được thay họ tên bằng alias |
| 3 | Không commit token, API key, cookie, mật khẩu thật, file `.env` | Đạt | Quét `grep` các mẫu secret/token/key/private-key: chỉ gặp mã starter (xử lý cookie/token trong `auth.js`, `api.js`) và hướng dẫn trong `DEPLOY.md`; không có file `.env`; `.gitignore` chặn `.env`, `*.db`, `*client_secret*.json` |
| 4 | Không kết nối production/Railway/CSDL thật | Đạt | Không có URL/khoá dịch vụ thật; DB chạy cục bộ (`DB_PATH` tạm khi test) |
| 5 | Log và AI-use log không chứa PII/secret | Đạt | `AI_USE.md` chỉ mô tả mục đích/phạm vi, không dán prompt riêng tư |
| 6 | Fork để công khai nên không được chứa dữ liệu nhạy cảm | Cần nhóm xác nhận | Nhóm rà lần cuối trước khi freeze (xem mục 5) |

## 2. Ranh giới an toàn miền (B-07, B-04)

| # | Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|---|
| 7 | Không sửa `server/auth.js`, session, tài khoản mẫu, deployment | Đạt | Test `B-07` băm SHA-256 `auth.js`; nhóm không chủ động sửa `Dockerfile`/`DEPLOY.md` (nhóm đối chiếu lại với starter gốc trước freeze) |
| 8 | Không đổi hành vi 4 `type` cũ | Đạt | Nhánh `estimate` thêm riêng trong `/api/submissions`; test hồi quy bộ đề cũ |
| 9 | API không trả đáp án trước khi nộp | Đạt | DTO câu hỏi chỉ `id,type,prompt,points,category`; phản hồi bước 1 và `/state` giữa chừng không chứa kết quả/biên; có test kiểm tra |
| 10 | Chấm điểm hoàn toàn ở server; server không tin đáp án client khai | Đạt | `scoreEstimateQuestion` đọc từ `estimation_steps`; test `client không thể tự khai đáp án` |
| 11 | Không dùng LLM để sinh/chấm đáp án lúc chạy | Đạt | `estimationScorer.js` là module thuần (không mạng, không DB), số nguyên |
| 12 | Chống gọi API sai thứ tự / dò đáp án bằng thử lặp | Đạt | 409 khi vi phạm; mỗi bước một lượt/câu; lỗi định dạng (400) không tiêu hao lượt |

## 3. Kiểm tra đầu vào & injection

| # | Hạng mục | Trạng thái | Ghi chú |
|---|---|---|---|
| 13 | Xác thực mọi route ước lượng | Đạt | `requireAuth`; test 401 khi chưa đăng nhập |
| 14 | Kiểm tra kiểu/miền đầu vào | Đạt | `parseWholeNumber`: chỉ số nguyên không âm ≤ 7 chữ số; từ chối mảng, đối tượng, chuỗi chữ |
| 15 | SQL tham số hoá, không nối chuỗi từ đầu vào người dùng | Đạt | Mọi truy vấn mới dùng `db.prepare(...).run/get(?)` |
| 16 | Giao diện chống XSS | Đạt | `estimate.js` gán văn bản động bằng `textContent`, không dùng `innerHTML` cho dữ liệu từ API |
| 17 | Thông báo lỗi không lộ chi tiết nội bộ | Đạt | Thông báo tiếng Việt thân thiện kèm `code` ngắn |

## 4. Rủi ro tồn đọc (nêu thẳng)

- Chưa có giới hạn tần suất (rate limit) cho API ước lượng.
- Mật khẩu mẫu `123456` và `SESSION_SECRET` mặc định là của starter, giữ nguyên theo B-07; **không được** triển khai public khi chưa đổi (đã ghi trong README/DEPLOY).
- Chưa chạy công cụ quét secret tự động (chỉ `grep`); khuyến nghị chạy `gitleaks`/`trufflehog` trên fork trước khi freeze.

## 5. Việc nhóm cần xác nhận trước Freeze

- [ ] Chạy quét secret tự động trên lịch sử git của fork (kể cả các commit cũ).
- [ ] Rà lịch sử commit/PR: không có họ tên/email thật trong tác giả hiển thị công khai ngoài phạm vi nhóm chấp nhận.
- [ ] Đảm bảo không có file `data/*.db` bị commit.
