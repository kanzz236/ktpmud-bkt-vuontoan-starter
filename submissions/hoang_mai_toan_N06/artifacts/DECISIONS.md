# DECISIONS.md — Quyết định thiết kế (Track B: "Ước lượng trước khi tính đúng")

Nhóm N06. Mọi ADR ở trạng thái **Accepted** tại bản freeze. Đối chiếu: `docs/architecture-reference.md` (đặc tả chính thức),
Đề thi Mục 8. Các ADR đã được viết lại so với bản nháp PC-1 (nháp dùng bảng riêng, ngưỡng ±10%/±15%/±20% không thống nhất) —
lý do thay đổi nằm ở từng ADR.

| ADR | Quyết định (một dòng) |
|---|---|
| 01 | Thêm `type='estimate'` vào bảng `questions` sẵn có + cột `meta_json` + bảng `estimation_steps` (không tạo hệ thống song song) |
| 02 | Luồng hai bước do **server** ép (chốt ước lượng → mới được tính chính xác); mỗi bước một lượt |
| 03 | Quy tắc chấm: một số ±15%; một khoảng phải chứa E và rộng ≤ 30% E; toàn bộ bằng số nguyên |
| 04 | Chấm cả bộ qua `POST /api/submissions` sẵn có; điểm 50% ước lượng + 50% tính đúng |
| 05 | Không lộ đáp án: DTO câu hỏi tường minh; phản hồi bước 1 không chứa E hay biên |
| 06 | Fixtures sinh tất định từ seed + ràng buộc nhất quán "cách dạy = cách chấm" |
| 07 | Tích hợp vào Bài 41 + mục menu; trang làm bài chung; giao diện dựng bằng DOM an toàn |
| 08 | Chiến lược test: module thuần + server thật với SQLite tạm; bảo vệ `auth.js` bằng băm |

---

## ADR-01 — Cách biểu diễn câu hỏi ước lượng trong dữ liệu hiện có

**Bối cảnh.** Tài liệu chuẩn (§3–4) nêu: chỉ có 4 `type`, `correct_answer` so sánh chuỗi, không có khái niệm khoảng/gần đúng.
Đề yêu cầu tích hợp luồng/API/DB hiện có (rubric Track B: 7 điểm "Tích hợp đúng luồng/API/DB").

**Phương án.**
- **A. Bảng riêng `estimation_questions` + `estimation_attempts` + route riêng** (hướng của bản nháp PC-1).
- **B. Type mới `estimate` trong `questions`; toán hạng ở cột mới `meta_json`; trạng thái từng bước ở bảng mới `estimation_steps`.** ← chọn
- C. Mã hoá khoảng hợp lệ trong `correct_answer` (ví dụ `"240-330"`) và dùng chung luồng chấm cũ.

**Quyết định.** B.

**Lý do.**
- A tạo hệ thống song song: câu hỏi không xuất hiện trong `/api/lessons`, không có trong bảng xếp hạng/thống kê giáo viên
  (các truy vấn đó lọc `attempts.kind IN ('exercise','exam')`), và phải nhân đôi logic lưu điểm → dễ thành "trang demo rời" (vi phạm B-01).
- C không đủ: học sinh nhập **hai** thứ (ước lượng, rồi kết quả đúng) và khoảng chấp nhận phụ thuộc quy tắc chứ không phải hằng số;
  mã hoá vào chuỗi làm lộ biên trong DTO nếu sơ ý và làm sai nghĩa cột `correct_answer`.
- B giữ nguyên 4 type cũ (tài liệu chuẩn §7), chỉ **thêm**: `ALTER TABLE … ADD COLUMN` (cùng kiểu migration an toàn đã có trong `db.js`),
  `CREATE TABLE IF NOT EXISTS`, và nạp dữ liệu bằng `INSERT OR IGNORE` nên chạy được cả trên DB cũ. `correct_answer` vẫn lưu kết quả chính xác
  (dạng chuỗi) nên thống kê giáo viên đối chiếu được như các câu `input`.

**Đánh đổi.** Thêm một bảng và một cột. Chấp nhận vì không phá dữ liệu cũ. Bộ đề bị giáo viên xoá sẽ được nạp lại khi khởi động lại server
(hệ quả của seed idempotent) — ghi trong giới hạn.

## ADR-02 — Ép thứ tự "ước lượng trước, tính đúng sau" ở server

**Bối cảnh.** Đề: người học "phải đưa ra ước lượng … **trước** khi xem/thực hiện bước tính chính xác". Nếu chỉ ẩn ô trên giao diện,
học sinh có thể gọi API trực tiếp theo thứ tự ngược lại.

**Phương án.** (A) kiểm tra ở client; (B) client gửi cả hai giá trị trong một lần nộp; (C) **hai endpoint, trạng thái lưu ở server** ← chọn.

**Quyết định.** `POST /api/estimation/estimate` ghi `estimation_steps` (một lần/câu). `POST /api/estimation/exact` trả 409
(`estimate_first`) nếu chưa có bước 1, 409 (`already_answered`) nếu đã nộp. Chốt lần hai → 409 (`already_estimated`).

**Lý do.** (A) và (B) chỉ "ép" bằng giao diện, không chống được gọi API trực tiếp; còn (B) làm mất ý nghĩa sư phạm vì học sinh tính xong mới
"ước lượng". Một lượt/bước chống dò đáp án bằng cách thử lặp (đoán nhiều ước lượng để biết biên).

**Đánh đổi.** Học sinh không sửa được ước lượng sau khi chốt (có chủ đích: ước lượng là phán đoán ban đầu). Sai định dạng (400) **không**
tiêu hao lượt. Sau khi nộp cả bộ, trạng thái bị xoá để làm lại từ đầu; kết quả cũ vẫn lưu trong `attempts`.

## ADR-03 — Quy tắc chấm ước lượng (B-03) — đề **không** khoá ngưỡng

**Bối cảnh.** Tài liệu chuẩn §7: nếu đề không khoá sai số thì nhóm phải định nghĩa **rõ ràng, tất định, giải trình được**.
Đề thi Mục 8 không nêu con số nào ⇒ nhóm tự quyết. Bản nháp PC-1 có ba giá trị mâu thuẫn (REQUIREMENTS ±15%, DECISIONS ±10%, code ±20%);
bản freeze thống nhất một quy tắc duy nhất.

**Phương án cho ước lượng bằng một số.** (A) ±10%; (B) **±15%**; (C) ±20%; (D) chỉ chấp nhận kết quả của đúng một cách làm tròn;
(E) sai số tuyệt đối cố định.

**Quyết định.** (B): `⌈0,85·E⌉ ≤ v ≤ ⌊1,15·E⌋`. Ước lượng bằng khoảng: `từ ≤ E ≤ đến` **và** `đến − từ ≤ 30% E`.

**Lý do.**
- Cách ước lượng chuẩn ở lớp 3 là làm tròn một thừa số đến hàng chục/trăm. Với thừa số hai chữ số, cách làm này có thể lệch đáng kể: trong chính bộ fixtures,
  câu 23 × 7 có ước lượng mẫu 20 × 7 = 140 so với kết quả 161 (lệch −13%) — ±10% sẽ chấm sai ngay cách làm tròn chuẩn. ±20% thì quá rộng: với E ≈ 100,
  mọi giá trị 80–120 đều "hợp lý", không còn giúp phát hiện kết quả "lạc quẻ". ±15% là điểm cân bằng, và nhất quán với **ràng buộc sinh đề** ở ADR-06
  (bộ sinh loại các thừa số mà làm tròn chuẩn vẫn lệch quá 15%, ví dụ 25 → 30 là +20%).
- (D) bắt học sinh đoán đúng *cách* của giáo viên, không đo được khả năng ước lượng hợp lý. (E) không co giãn theo độ lớn của E.
- Khoảng: nếu chỉ yêu cầu "chứa E" thì `[0, 9999999]` luôn đúng; giới hạn độ rộng 30% (= hai lần ±15%) giữ khoảng có ý nghĩa và đối xứng logic với quy tắc một số.
- **Số nguyên toàn phần** (`⌈(85·E+99)/100⌉`, `⌊115·E/100⌋`): tránh sai số dấu phẩy động tại biên (vd 0,85×288 = 244,8) → biên test được chính xác.

**Hệ quả.** Phản hồi sư phạm phải nói rõ lý do "chưa hợp lý" (lệch xa / khoảng trượt / khoảng quá rộng) mà không lộ E (ADR-05).

## ADR-04 — Tích hợp chấm điểm bộ đề và công thức điểm

**Quyết định.** Chấm cả bộ vẫn qua `POST /api/submissions`; thêm **một nhánh** `if (q.type === 'estimate')` đọc trạng thái từ `estimation_steps`
(server không tin `answers` do client gửi). Điểm câu = 50% nếu ước lượng hợp lý + 50% nếu kết quả tính chính xác đúng; câu "đúng" (đếm vào `correct_count`)
khi cả hai đúng. Nhánh cũ giữ nguyên từng dòng. Chuyển `answers_json` của câu ước lượng sang kết quả tính chính xác để thống kê giáo viên đối chiếu được.

**Lý do.** Giữ một đường lưu điểm duy nhất (attempts/progress/sao/bảng xếp hạng/thống kê) — đó là nội dung "tích hợp đúng luồng". Chia 50/50 vì mục tiêu
bài học là *ước lượng trước khi tính đúng*: ước lượng không được là phần phụ; nhưng tính đúng vẫn quan trọng. Chia 50/50 cho phép tách bạch hai năng lực
trong phản hồi (B-06). (Chỉnh trọng số chỉ cần đổi một hằng `ESTIMATE_WEIGHT_PERCENT`.)

**Phương án đã loại.** Endpoint chấm riêng ghi `attempts` với `kind='estimation'` (bản nháp): bị loại khỏi bảng xếp hạng/thống kê, không cập nhật `progress`.

## ADR-05 — Không lộ đáp án (B-04) và chính sách phản hồi

**Quyết định.**
1. `GET /api/question-sets/:id/questions` giữ nguyên danh sách cột tường minh (không có `correct_answer`, `meta_json`) ⇒ DTO câu `estimate` chỉ gồm
   `id, type, prompt, points, category`. Có test khẳng định tập khoá và không có chuỗi `correct|meta|answer|exact` trong phản hồi.
2. Phản hồi bước 1 **không** chứa E hay biên chấp nhận (nếu có biên, học sinh suy ra E ± 15% trước khi tự tính).
3. Phản hồi giữa chừng (`/state` sau F5) cũng không chứa E; chỉ câu **đã nộp bước 2** mới lộ E, biên và lời giải mẫu — ở thời điểm học sinh đã hoàn thành câu đó
   nên không còn "đáp án trước khi nộp".

**Phản hồi sư phạm (B-06).** Sau bước 2 luôn có **hai thông báo riêng**: "Ước lượng (hợp lý/chưa hợp lý)" và "Kết quả tính chính xác (đúng/chưa đúng)", kèm
so sánh số liệu và cách ước lượng mẫu ("làm tròn 23 ≈ 20, 20 × 7 = 140"). Ký hiệu ✔/✖ đi kèm chữ để không phụ thuộc màu.

## ADR-06 — Sinh fixtures tất định (B-02) và nhất quán "cách dạy = cách chấm"

**Quyết định.** `generateFixtures(seed, count)` dùng PRNG mulberry32; `data/estimation_fixtures.json` được sinh bằng `tools/gen-estimation-fixtures.js`
(seed `20261104`, 12 câu xen kẽ nhân/chia). Ràng buộc: thừa số không tròn chục/trăm (để phải làm tròn thật sự), chỉ chia hết, và **ước lượng mẫu do hệ thống dạy
phải nằm trong biên chấp nhận**. Test kiểm tra: cùng seed → cùng kết quả; file JSON khớp bộ sinh; mọi câu thoả ràng buộc.

**Lý do.** "Tái lập được" cần bằng chứng tự động chứ không chỉ cam kết; ràng buộc nhất quán tránh tình huống hệ thống dạy một cách làm rồi chấm cách đó là sai.
**Phương án đã loại.** Sinh ngẫu nhiên lúc chạy (không tái lập); viết tay 12 câu (không chứng minh được ràng buộc).

## ADR-07 — Tích hợp luồng học & giao diện (B-01, B-12)

**Quyết định.** Bộ `uoc-luong-nhan-chia` (kind `exercise`) gắn vào **Bài 41** ("Ôn tập phép nhân, phép chia trong phạm vi 100, 1000") — khớp nội dung "phép nhân/chia
đã có", không thêm nội dung SGK mới. Hiển thị bằng trang làm bài chung `lesson.html`; thành phần `estimate.js` dựng khối hai bước khi gặp `type='estimate'`.
Thêm mục menu "Ước Lượng Trước Khi Tính" để truy cập trực tiếp (Bài 41 bị khoá cho đến khi hoàn thành Bài 40 theo chuỗi mở khoá sẵn có, nên cần lối vào riêng cho demo).
Giao diện: `<form>`+`<label for>`, nhóm radio bằng `fieldset/legend`, Enter gửi, focus tự chuyển sang bước 2, `role="alert"` cho lỗi, `aria-live` cho phản hồi,
viền focus 3px; văn bản động chỉ gán bằng `textContent`. CSS mới viết thường trong `app.css` vì bản Tailwind đã biên dịch không chạy lại được khi offline.

**Đánh đổi.** Làm bài từ menu sẽ cập nhật tiến độ Bài 41 và có thể mở khoá Bài 42 mà không qua các bài trước — hành vi chấp nhận được (không ảnh hưởng auth/session);
khoá thứ tự chỉ do giao diện trang chủ áp dụng, server sẵn có không chặn truy cập bộ đề.

## ADR-08 — Chiến lược test và bảo vệ ranh giới (B-07, B-08, B-09)

**Quyết định.** (1) Module chấm điểm **thuần** (không DB/mạng) → 16 unit test chạy tức thì. (2) Test tích hợp khởi chạy `server/index.js` thật ở cổng ngẫu nhiên với `DB_PATH` tạm
(không cần sửa `index.js`) → 19 test qua HTTP. (3) `npm test` = `node --test`: không thêm thư viện test mới nên `npm ci` không đổi và clean checkout chạy được.
(4) B-07 được **tự động hoá**: test băm SHA-256 `server/auth.js` và so với bản gốc; test hồi quy bộ đề cũ và thống kê giáo viên.

**Phương án đã loại.** Jest/Supertest (thêm phụ thuộc và thay đổi `package-lock.json` không cần thiết); mock DB (không kiểm chứng được SQL và migration thật).
