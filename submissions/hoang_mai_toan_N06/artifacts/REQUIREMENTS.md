# REQUIREMENTS — Track B: Vườn Toán Lớp 3 — "Ước lượng trước khi tính đúng"

- **Nhóm:** N06 · **Phiên bản:** 1.0 (freeze) · **Đặc tả chính thức đối chiếu:** `docs/architecture-reference.md`
  (v1.0.0, 2026-11-02) và Đề thi KTPMUD Hack Marathon 2026 v1.0.2, Mục 8 (Track B).
- Mọi dữ liệu là synthetic; không kết nối production; không dùng LLM để sinh/chấm đáp án.

## 1. Phạm vi

**Trong phạm vi.** Thêm **một** dạng luyện tập "Ước lượng kết quả trước khi tính đúng" trên các phép **nhân** và **chia (chia hết)**
đã có trong chương trình: người học phải chốt một ước lượng (một số hoặc một khoảng hợp lý) **trước**, rồi mới được nhập kết
quả chính xác. Đáp án, quy tắc đúng/sai và thứ tự hai bước do server quyết định bằng code tất định.

**Ngoài phạm vi (Đề thi 8.4).** Thêm chương trình/nội dung SGK mới; thay đổi authentication/authorization hoặc session;
kết nối ứng dụng/production thật; dữ liệu học sinh/giáo viên thật; LLM sinh đáp án lúc chạy; deploy public.
**Ngoài phạm vi do nhóm tự giới hạn:** phép chia có dư, số thập phân, ước lượng phép cộng/trừ.

## 2. Đối chiếu hiện trạng (`architecture-reference.md`)

| Phát hiện trong tài liệu chuẩn | Hệ quả cho yêu cầu |
|---|---|
| Chấm điểm hiện tại là so sánh chuỗi chính xác (`given === correct_answer`); không có khái niệm "gần đúng" | Cần quy tắc chấm riêng cho ước lượng (AC B-03) và một `type` mới, **không** đổi nghĩa 4 type cũ |
| `GET /api/question-sets/:id/questions` không trả đáp án | Giữ nguyên nguyên tắc cho type mới (AC B-04) |
| `POST /api/submissions` ghi `attempts` + `progress` + sao | Tái sử dụng cho dạng bài mới để tích hợp đúng luồng/DB (AC B-01, B-05) |
| `server/auth.js` và `/api/auth|teacher|admin` ngoài phạm vi | Không sửa (AC B-07) — có test bảo vệ bằng băm SHA-256 |

## 3. Quy tắc nghiệp vụ (nguồn duy nhất: `server/estimationScorer.js`)

Gọi **E** là kết quả chính xác (số nguyên). Mọi so sánh dùng số nguyên → biên chính xác, không sai số số thực.

1. **Đầu vào hợp lệ:** số nguyên không âm, tối đa 7 chữ số (chuỗi hoặc số). Còn lại → HTTP 400 kèm thông báo tiếng Việt thân thiện.
2. **Ước lượng bằng một số `v`:** hợp lý ⇔ `⌈0,85·E⌉ ≤ v ≤ ⌊1,15·E⌋` (sai số ±15%).
3. **Ước lượng bằng khoảng `[từ, đến]`:** `từ ≤ đến`; hợp lý ⇔ `từ ≤ E ≤ đến` **và** `(đến − từ)·100 ≤ 30·E`.
4. **Chấm điểm một câu:** `điểm = P·50% (nếu ước lượng hợp lý) + P·50% (nếu kết quả tính chính xác đúng)`, P = điểm câu (10).
5. **Thứ tự hai bước (server ép):** bước 2 chỉ chấp nhận sau khi bước 1 đã chốt; mỗi bước một lượt/câu (409 nếu vi phạm).
6. **Lộ đáp án:** chỉ sau khi học sinh nộp bước 2 của chính câu đó.
7. **Sinh câu hỏi tất định:** PRNG `mulberry32(seed=20261104)`. Nhân: thừa số 2–9 × số 21–99 hoặc 101–499 (không tròn chục/trăm);
   chia: số chia 2–9, thương 21–99, chia hết. Ràng buộc nhất quán: ước lượng mẫu (làm tròn) của mỗi câu phải nằm trong biên chấp nhận.

## 4. Acceptance criteria & truy vết (B-01 … B-12)

| Mã | Tiêu chí (Đề thi 8.3) | Cách đáp ứng | Bằng chứng (code → test) |
|---|---|---|---|
| **B-01** | Truy cập được từ luồng học hiện có, không phải trang demo rời | Bộ `uoc-luong-nhan-chia` gắn vào Bài 41; vào qua `GET /api/lessons`, trang làm bài chung `lesson.html`, mục menu bên trái | `server/db.js#seedEstimationSet`, `public/assets/js/components/sidebar.js` → test *"B-01: bộ ước lượng nằm trong luồng bài học"* |
| **B-02** | ≥ 12 fixture synthetic tái lập được | 12 câu sinh từ seed cố định, nạp idempotent vào DB | `data/estimation_fixtures.json`, `tools/gen-estimation-fixtures.js` → *"generateFixtures: tái lập được…"*, *"fixtures khớp với bộ sinh"* |
| **B-03** | Quy tắc tạo & chấm mô tả rõ, tất định, test được | Mục 3 của tài liệu này + ADR-03/ADR-06; module thuần, số nguyên | `server/estimationScorer.js` → 16 unit test (boundary ±15%, khoảng 30%) |
| **B-04** | API không trả đáp án trước khi nộp | DTO câu hỏi chỉ có `id,type,prompt,points,category`; phản hồi bước 1 không chứa E/biên; trạng thái giữa chừng không lộ | `server/api.js` (SELECT cột tường minh), `server/estimationApi.js` → *"B-02/B-04…"*, *"normal: … KHÔNG lộ"*, *"B-05: trạng thái lưu…"*, *"estimateFeedback … không lộ"* |
| **B-05** | Server chấm & lưu; refresh không mất trạng thái | Bảng `estimation_steps` + `attempts`/`progress` sẵn có | *"B-05: trạng thái lưu trên server…"*, *"B-05: nộp trọn bộ…"* |
| **B-06** | Feedback phân biệt "ước lượng hợp lý" và "kết quả chính xác" | Hai thông báo riêng + so sánh + lời giải ước lượng mẫu | `exactFeedback()` → *"B-06"* (2 ca: hợp lý/tính sai và ngược lại), *"exactFeedback: tách bạch…"* |
| **B-07** | Không sửa `auth.js`, session, tài khoản mẫu, deployment | Không chạm các thành phần đó; chỉ thêm route/bảng/cột | *"B-07: server/auth.js giữ nguyên…"*, *"hồi quy: bộ đề cũ…"* |
| **B-08** | Test cho normal, boundary, invalid, scoring | 35 test, gắn nhãn theo bốn nhóm | `test/*.test.js` |
| **B-09** | Có `npm test`; đạt từ clean checkout | `"test": "node --test"` — không thêm phụ thuộc | `package.json` |
| **B-10** | CI chạy `npm ci` + `npm test` trên PR | GitHub Actions, Node 18, 20 Node 20 & 22 22 | `.github/workflows/ci.yml` |
| **B-11** | Không PII/secret; chỉ alias/tài khoản synthetic | Chỉ `hocsinhNN`/`giaovien01`; tài liệu dùng alias; quét secret ghi trong checklist | `SECURITY_PRIVACY_CHECKLIST.md` |
| **B-12** | Dùng được bằng bàn phím; thông báo lỗi dễ hiểu | `<form>`, `<label for>`, radio nhóm bằng `fieldset/legend`, Enter gửi, focus tự chuyển, `role="alert"`/`aria-live`, viền focus rõ | `public/assets/js/pages/estimate.js`, `app.css` → kiểm tra thủ công bằng trình duyệt (xem `TEST_REPORT.md`) |

## 5. Kế hoạch kiểm thử (tóm tắt)

| Nhóm | Ca tiêu biểu | Kết quả mong đợi |
|---|---|---|
| Normal | Ước lượng lệch +5% | 200, `reasonable=true`, không lộ E |
| Boundary | `v = ⌈0,85E⌉`, `⌈0,85E⌉−1`, `⌊1,15E⌋`, `⌊1,15E⌋+1`; khoảng rộng đúng 30% và 31% | nhận / loại đúng tại biên |
| Invalid | rỗng, chữ, âm, thập phân, quá lớn, mảng, thiếu trường, `từ > đến`, vừa số vừa khoảng, câu hỏi không tồn tại | 400 (hoặc 404) + thông báo thân thiện, **không** tiêu hao lượt chốt |
| Thứ tự | nộp bước 2 trước bước 1; chốt lần 2; nộp lần 2 | 409 |
| Scoring | 100%; ước lượng đúng/tính sai = 50%; ngược lại = 50%; không làm = 0%; client tự khai đáp án = 0% | khớp công thức Mục 3.4 |
| Lưu trạng thái | phiên đăng nhập mới vẫn thấy bước đã chốt; nộp xong thì progress/sao được lưu | khớp |
| Hồi quy | bộ đề cũ chấm như trước; thống kê giáo viên vẫn chạy | khớp |
