> **Đây là bản sao đóng băng (starter) dùng cho Bài kiểm tra Hackathon (BKT-2 /
> Track B) môn Kỹ thuật Phần mềm Ứng dụng (KTPMUD) — KHÔNG phải ứng dụng thật
> đang vận hành, không kết nối tới dữ liệu/CSDL production thật.** Toàn bộ tên
> người và ảnh thật trong bản gốc đã được thay bằng dữ liệu hư cấu trước khi
> công khai repo này. Sinh viên làm việc trên fork của repo NÀY, nộp bài qua
> `ktpmud-project` theo đúng hướng dẫn `nop_bai.md` của KTPMUD — không PR vào
> ứng dụng Vườn Toán thật.

---

# 🌱 Vườn Toán Lớp 3 — Trường Tiểu học Hoàng Mai

Web học Toán lớp 3 gồm giao diện học sinh (bài học, luyện tập, kiểm tra, trò chơi, bảng xếp hạng)
và khu vực giáo viên (theo dõi lớp, cấp tài khoản). Đợt 1 đã nối **backend thật**:
đăng nhập/đăng xuất, chấm điểm trên server, lưu điểm & tiến độ vào cơ sở dữ liệu SQLite.

**Thông tin nhóm (chỉ dùng alias, không ghi họ tên/MSSV — B-11):**
> - **Mã nhóm:** N06 · **Track:** B — "Ước lượng trước khi tính đúng"
> - **Vai trò:** `Lead-BE` (Team Lead, backend & chấm điểm tất định) · `Dev-FE` (giao diện & UX)
> - **Trạng thái:** đã hoàn thành dạng bài mới theo B-01…B-12 (xem mục 8 và `REQUIREMENTS.md`).

## 1. Cách chạy

Yêu cầu: máy có **Node.js 18+**.

```bash
npm install     # chỉ cần chạy 1 lần đầu
npm start       # mở http://localhost:3000
```

Lần chạy đầu, server tự tạo `data/vuon-toan.db` và nạp dữ liệu mẫu từ `data/seed.json`.

### Lệnh tối thiểu của đề thi (Track B)

```bash
npm ci               # cài đúng phiên bản trong package-lock.json
npm run reset-db     # xoá DB cũ (data/vuon-toan.db*) để nạp lại dữ liệu mẫu + 12 fixtures ước lượng
npm start            # http://localhost:3000
npm test             # chạy toàn bộ test tự động (node --test, không cần cấu hình thêm)
```

### Tài khoản mẫu

| Vai trò | Tên đăng nhập | Mật khẩu | Ghi chú |
|---|---|---|---|
| Học sinh | `hocsinh01` … `hocsinh99` | `123456` | 99 tài khoản giả lập lớp 3A2, dùng cho test/demo hackathon — không phải học sinh thật |
| Giáo viên | `giaovien01` | `123456` | Vào thẳng Góc Giáo Viên |

> Khi đưa lên Internet thật: đổi mật khẩu các tài khoản mẫu, và đặt biến môi trường
> `SESSION_SECRET` bằng một chuỗi bí mật dài trước khi chạy `npm start`.

## 2. Cấu trúc thư mục

```
vuon-toan-lop-3/
├─ public/                    # Giao diện (server phục vụ thư mục này)
│  ├─ *.html                  # Mỗi trang 1 file, CHỈ chứa nội dung trang
│  └─ assets/
│     ├─ css/app.css          # CSS nền dùng chung (trước đây lặp trong 11 file)
│     └─ js/
│        ├─ tailwind.config.js  # Cấu hình Tailwind dùng chung 1 chỗ duy nhất
│        ├─ core/  (api.js = gọi API, app.js = đăng nhập + nối link, game-score.js = lưu điểm game)
│        ├─ components/ (navbar.js, sidebar.js=bản đồ link, footer.js dùng chung)
│        └─ pages/  (logic riêng từng trang: login.js, exercise.js, exam.js,...)
├─ public/lesson.html       # Trang làm bài chung cho bộ đề giáo viên tự tạo
├─ server/
│  ├─ index.js   # Điểm vào: API /api/* + phục vụ giao diện
│  ├─ db.js      # Tạo bảng + nạp dữ liệu mẫu vào SQLite
│  ├─ auth.js    # Cookie đăng nhập httpOnly, băm mật khẩu bcrypt
│  └─ api.js     # Toàn bộ API (đăng nhập, bài học, nộp bài, giáo viên...)
├─ data/
│  ├─ seed.json      # DỮ LIỆU GỐC: tài khoản mẫu, bài học, câu hỏi
│  └─ vuon-toan.db   # CSDL SQLite (tự sinh khi chạy; sao lưu = chép file này)
├─ test/                      # Test tự động (Track B): estimationScorer.test.js, api.integration.test.js
├─ .github/workflows/ci.yml   # CI: npm ci + npm test trên mọi Pull Request
├─ progress/PROGRESS.md · REQUIREMENTS.md · DECISIONS.md   # tài liệu nộp bài (Track B)
├─ submissions/hoang_mai_toan_N06/   # thư mục nộp bài theo đúng cấu trúc đề thi (Mục 11.2)
├─ tools/gen-estimation-fixtures.js  # sinh lại data/estimation_fixtures.json (tất định, theo seed)
├─ tools/build-from-original.py  # Dựng lại giao diện từ bản gốc khi cần
└─ HUONG-DAN-THEM-BAI.md  # Cách thêm bài học/câu hỏi mới
```

## 3. API chính

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` | Đăng nhập (cookie httpOnly) / đăng xuất |
| GET | `/api/auth/me` | Thông tin người đang đăng nhập |
| GET | `/api/lessons`, `/api/me/progress` | Bài học kèm tiến độ, khóa/mở theo thứ tự |
| GET | `/api/question-sets/:id/questions` | Câu hỏi — **không kèm đáp án** |
| POST | `/api/submissions` | Nộp bài; server chấm, lưu điểm, cộng sao theo tiến bộ |
| GET | `/api/leaderboard` | Bảng xếp hạng tính từ sao thật trong DB |
| GET | `/api/estimation/sets/:setId/state` | **(Track B)** trạng thái từng bước của học sinh — khôi phục sau F5 |
| POST | `/api/estimation/estimate` | **(Track B)** bước 1: chốt ước lượng (1 lần/câu), chưa lộ đáp án |
| POST | `/api/estimation/exact` | **(Track B)** bước 2: nộp kết quả tính chính xác (chỉ sau bước 1), lộ đáp án + lời giải |
| GET/POST | `/api/teacher/students` | Giáo viên xem / cấp tài khoản học sinh |
| POST | `/api/teacher/students/:id/reset-password` | Giáo viên đặt lại mật khẩu |

## 4. Đã làm ở Đợt 1 (cốt lõi)

- Tách cấu hình Tailwind + CSS + JS dùng chung (trước: sao chép vào cả 11 file HTML);
  sửa tên file sai chính tả (`excersise→exercise`, `leadboard→leaderboard`, `schudule→schedule`).
- Nối lại toàn bộ link menu từng là `href="#"` sang trang thật.
- Backend Node.js + Express + SQLite; mật khẩu băm bcrypt; phân quyền học sinh/giáo viên.
- Trang chủ render bài học từ API; luyện tập & kiểm tra (20 câu, đếm giờ, tự nộp khi hết giờ)
  chấm điểm trên server và lưu tiến độ — tải lại trang không mất điểm.
- Góc Giáo Viên: xem danh sách lớp với điểm trung bình thật, **cấp tài khoản + đặt lại mật khẩu** cho học sinh.

## 5. Đợt 2 (đã hoàn thành)

- **4 mini-game chơi thật & lưu điểm**: Bắn Bóng (10 vòng phép nhân), Đua Xe (chọn cổng đáp án),
  Lật Thẻ Trí Nhớ (ghép cặp phép tính–kết quả), Câu Cá (10 vòng phép chia). Điểm gửi lên server,
  sao chỉ cộng theo phần vượt kỷ lục cũ của từng em.
- **Bảng xếp hạng render 100% từ dữ liệu thật** (`/api/leaderboard`): hạng, lượt làm bài, điểm TB, tổng sao.
- **Trang làm bài chung `lesson.html`**: mọi bộ đề giáo viên tạo đều làm được tại đây
  (`lesson.html?lesson=bai-16&set=...`), hỗ trợ trắc nghiệm / điền số / điền dấu / tô màu.
- **Quản trị trên web (Góc Giáo Viên)**: thêm/sửa/xóa bài học, tạo bộ đề, thêm/sửa/xóa câu hỏi,
  xuất báo cáo lớp ra CSV mở bằng Excel. Học sinh không vào được khu vực này.

## 6. Đợt 3 (đã hoàn thành)

- **Đăng nhập dự phòng 2 lớp**: cookie httpOnly + Bearer token trong trình duyệt
  (tự động dùng khi cookie bị chặn, ví dụ xem qua khung iframe/xem trước).
- **Thống kê lớp thật** (`/api/teacher/analytics`): 4 thẻ KPI đầu trang Góc Giáo Viên đã là số thật,
  thêm biểu đồ lượt làm bài 7 ngày, top 3 dạng bài hay sai nhất, tiến độ từng bài học.
  Hai khối biểu đồ/chẩn đoán mẫu cũ được ẩn để tránh nhầm số liệu.
- **CSS Tailwind tĩnh** (`assets/css/tailwind.build.css`, chạy `npm run build:css` để gói lại):
  phòng máy mất Internet giao diện vẫn giữ nguyên; CDN chỉ còn là lớp dự phòng.
- **Sẵn sàng deploy**: endpoint `/api/health`, hỗ trợ `DB_PATH` cho ổ đĩa bền,
  `Dockerfile` + `DEPLOY.md` (VPS/Render/Railway, việc cần làm với `SESSION_SECRET` và mật khẩu mẫu).

## 7. Nếu muốn làm tiếp

- Nhúng font/icon tại chỗ để offline 100% cả chữ và biểu tượng.
- Thực hiện deploy thật (cần tài khoản hosting/tên miền của trường).
- Thêm biểu đồ theo tuần/tháng và xuất phiếu bồi dưỡng PDF theo dạng bài hay sai.

## 8. Track B — Dạng bài "Ước lượng trước khi tính đúng"

Dạng luyện tập mới cho phép nhân/chia: học sinh **phải chốt ước lượng (một số hoặc một khoảng) trước**, rồi mới
được nhập kết quả tính chính xác. Server là nơi duy nhất biết đáp án, chấm, và ép thứ tự hai bước.

**Cách vào bài (B-01):** menu bên trái → biểu tượng máy tính **"Ước Lượng Trước Khi Tính"**, hoặc Bài 41
("Ôn tập phép nhân, phép chia trong phạm vi 100, 1000") → bộ `uoc-luong-nhan-chia`. Cùng trang làm bài `lesson.html`
với mọi bộ đề khác; điểm, sao, tiến độ đi qua `POST /api/submissions` sẵn có.

**Quy tắc chấm (B-03) — E là kết quả chính xác của phép tính:**

| Cách ước lượng | Hợp lý khi |
|---|---|
| Một số `v` | `ceil(0,85·E) ≤ v ≤ floor(1,15·E)` (sai số ±15%, tính bằng số nguyên) |
| Một khoảng `[từ, đến]` | `từ ≤ E ≤ đến` **và** `đến − từ ≤ 30% của E` |

Điểm mỗi câu: 50% cho ước lượng hợp lý + 50% cho kết quả tính chính xác (phản hồi hai phần tách bạch — B-06).
Bộ sinh câu hỏi tất định: `node tools/gen-estimation-fixtures.js` (seed `20261104`, 12 câu: 6 nhân, 6 chia, chỉ phép chia hết).
Lý do thiết kế và các phương án đã loại: xem `DECISIONS.md`. Truy vết yêu cầu → code → test: xem `REQUIREMENTS.md`.

**Kiểm thử (B-08/B-09/B-10):** `npm test` chạy 35 test (16 unit cho module chấm điểm thuần + 19 test tích hợp
khởi chạy server thật với SQLite tạm). CI (`.github/workflows/ci.yml`) chạy `npm ci` + `npm test` trên Node 18, 20 và 22.

**Giới hạn đã biết:** mỗi câu chỉ có một lượt chốt ước lượng và một lượt nộp kết quả (chống dò đáp án); chỉ dùng phép chia
hết; chưa có giới hạn tần suất gọi API; thông tin triển khai thật (đổi `SESSION_SECRET`, mật khẩu mẫu) giữ nguyên theo B-07.
