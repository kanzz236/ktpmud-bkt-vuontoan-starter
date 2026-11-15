# TEST_REPORT — N06 — Track B

## 1. Môi trường chạy test

| Mục | Giá trị |
|---|---|
| Lệnh | `npm test` (= `node --test`, không thêm thư viện test) |
| Node.js | v22.23.4 (CI chạy Node 18.x, 20.x, 22.x — xem `.github/workflows/ci.yml`) |
| HĐH | Linux (container) |
| CSDL | SQLite tạm theo từng lần chạy (`DB_PATH` trỏ vào thư mục tạm); không đụng `data/vuon-toan.db` |
| Dữ liệu | Synthetic: `hocsinh01…99`, `giaovien01` (mật khẩu mẫu của starter) |

**Lưu ý trung thực về lần chạy này.** Môi trường soạn báo cáo không có mạng nên **không chạy được `npm ci`**.
Lần chạy dưới đây dùng một lớp tương thích tạm (đặt ngoài dự án, qua `NODE_PATH`) thay cho `better-sqlite3`, `express`, `bcryptjs`.
Vì vậy kết quả **chưa thay thế** lần chạy `npm ci && npm test` thật. Nhóm phải chạy lại trên máy có mạng / trên GitHub Actions
và ghi URL run xanh vào `source-ref.json` (`ci_run_url`) trước khi freeze.

## 2. Kết quả

**35 test, 35 đạt, 0 lỗi, 0 bỏ qua** (≈ 0,9 s).

| Nhóm (B-08) | Số ca tiêu biểu | Ví dụ |
|---|---|---|
| Normal | ước lượng lệch nhỏ được nhận; nhân/chia chính xác | `normal: ước lượng hợp lý được ghi nhận và KHÔNG lộ kết quả chính xác` |
| Boundary | `⌈0,85E⌉`, `⌈0,85E⌉−1`, `⌊1,15E⌋`, `⌊1,15E⌋+1`; khoảng rộng đúng 30% / 31% | `boundary: đúng biên dưới/trên được nhận, sát ngoài biên bị loại` |
| Invalid | rỗng, chữ, âm, thập phân, quá lớn, sai kiểu, `từ > đến`, vừa số vừa khoảng, câu hỏi không tồn tại | `invalid: đầu vào sai → 400 … KHÔNG tiêu hao lượt chốt` |
| Scoring | 100% / 50% (đúng một bước) / 0%; client không tự khai đáp án để lấy điểm | `scoring: client không thể tự khai đáp án để lấy điểm` |
| Thứ tự & trạng thái | bước 2 trước bước 1 → 409; chốt/nộp hai lần → 409; F5 vẫn còn trạng thái | `B-05: trạng thái lưu trên server…` |
| Ranh giới & hồi quy | `auth.js` không đổi (SHA-256), đăng nhập mẫu vẫn chạy, bộ đề 4 type cũ chấm như trước | `B-07…`, `hồi quy…` |

Phân bố: 16 unit test (module thuần `estimationScorer.js`) + 19 test tích hợp (khởi chạy `server/index.js` thật qua HTTP).

## 3. Ánh xạ AC → test

B-01…B-07 và B-11 có test hoặc kiểm tra tĩnh tương ứng (chi tiết cột "Bằng chứng" trong `REQUIREMENTS.md` §4).
B-09: `package.json` có `"test": "node --test"`. B-10: `.github/workflows/ci.yml` chạy `npm ci` + `npm test` trên `pull_request` (và `push` vào `main`).

## 4. Kiểm thử thủ công còn phải thực hiện (B-12)

Chưa thực hiện trong báo cáo này — cần một thành viên làm trên trình duyệt thật và ghi lại kết quả:

| Ca | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|
| Bàn phím toàn luồng | Chỉ dùng Tab/Shift+Tab/Enter/Space: đăng nhập → vào bài → chọn kiểu ước lượng → nhập → Enter → nhập kết quả → Enter | Hoàn tất không cần chuột; focus luôn thấy rõ | ☐ |
| Lỗi thân thiện | Gửi ô trống, nhập chữ, nhập số âm | Thông báo tiếng Việt dễ hiểu, focus về ô lỗi | ☐ |
| F5 giữa chừng | Chốt ước lượng rồi tải lại trang | Vẫn ở bước 2, chưa lộ đáp án | ☐ |
| Hoàn tất bộ → F5 | Nộp cả bộ, tải lại | Điểm/sao/tiến độ còn | ☐ |

## 5. Giới hạn đã biết

- Lỗi đã gặp và đã sửa: trên Node 18.12 (máy nhóm), 19 test tích hợp lỗi `Failed to parse URL from undefined/...` vì hook `test.before` cấp file không chạy trên Node 18. Đã đổi sang khởi động server lười + dọn ở sự kiện `exit`, và thêm Node 18.x vào ma trận CI. Cần nhóm xác nhận lại trên máy Node 18 (lần chạy của tôi dùng Node 22).
- Lần chạy trong báo cáo dùng lớp tương thích (mục 1); chưa có URL CI xanh.
- Chưa có kiểm thử giao diện tự động (chỉ kiểm tra thủ công mục 4) và chưa đo độ phủ mã.
- Chưa có giới hạn tần suất gọi API; một lượt chốt/câu là biện pháp chống dò đáp án duy nhất.
- Chỉ phép chia hết; không có phép chia có dư hay số thập phân (ngoài phạm vi do nhóm tự giới hạn).
- Test B-07 so băm `server/auth.js` với giá trị cố định trong test; nếu starter gốc có commit mới của `auth.js` thì phải cập nhật giá trị này có chủ đích.
