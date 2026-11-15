# AI_USE — N06 — Track B

Chính sách đề thi: `ai-allowed`, bắt buộc khai báo và kiểm chứng (Mục 5.3). Không ghi prompt riêng tư, không có secret/PII.
Người chịu trách nhiệm ghi bằng alias.

## Khai báo trung thực

**Phần lớn mã và tài liệu Track B trong bài nộp này do công cụ AI viết**, không phải do thành viên tự viết từ đầu:
bộ chấm, API hai bước, giao diện, test, CI, bộ sinh fixtures và các tài liệu trong `artifacts/`. Bộ khung ban đầu (starter) là của đề.
Thành viên chịu trách nhiệm giải thích và bảo vệ toàn bộ phần này khi vấn đáp (Mục 5.2), nên phải đọc, chạy và hiểu từng phần.

> Cột "Người chịu trách nhiệm" chỉ có giá trị khi thành viên **thực sự đã review và chấp thuận**. Nhóm tự điền/sửa trước khi nộp.
> Thiếu `AI_USE.md` hoặc khai thiếu bị giới hạn 70/100 theo Mục 9.3.

| # | Công cụ / model | Mục đích | Phạm vi (file/module) | Kiểm chứng | Quyết định của nhóm | Người chịu trách nhiệm |
|---|---|---|---|---|---|---|
| 1 | Claude (Anthropic), model `claude-sonnet-5-5`, qua Claude Code | Đọc đề, progress check, tài liệu kiến trúc; phân tích yêu cầu B-01…B-12 | Toàn repo (đọc) | Đối chiếu từng AC với đề | ☐ nhóm điền | ☐ nhóm điền |
| 2 | Như trên | **Viết mã Track B:** `server/estimationScorer.js`, `server/estimationApi.js`, phần thêm trong `server/db.js`, `server/api.js`, `data/estimation_fixtures.json`, `tools/gen-estimation-fixtures.js` | `server/*`, `data/*`, `tools/*` | 16 unit test + 19 test tích hợp; `server/auth.js` không đổi (test băm SHA-256) | ☐ nhóm điền (giữ / sửa / loại và lý do) | ☐ nhóm điền |
| 3 | Như trên | **Viết giao diện:** `public/assets/js/pages/estimate.js`, thay đổi `lesson.js`, `lesson.html`, `sidebar.js`, `app.css` | `public/*` | Kiểm tra thủ công bàn phím (B-12) — **chưa thực hiện**, nhóm phải làm | ☐ nhóm điền | ☐ nhóm điền |
| 4 | Như trên | **Viết test và CI:** `test/*`, `.github/workflows/ci.yml`; sửa lỗi test trên Node 18 (hook `test.before` không chạy) | `test/*`, `.github/*` | Chạy `npm test` (35 ca đạt trong môi trường của AI, dùng lớp tương thích tạm); **nhóm phải chạy lại thật** và ghi URL CI | ☐ nhóm điền | ☐ nhóm điền |
| 5 | Như trên | **Soạn tài liệu:** `REQUIREMENTS.md`, `DECISIONS.md` (ADR-01…08), `README.md`, `TEST_REPORT.md`, `SECURITY_PRIVACY_CHECKLIST.md`, `CONTRIBUTIONS.md`, `DEMO_SCRIPT.md`; sửa `submission.json` (bỏ họ tên thật → alias), điền `source-ref.json` các trường biết chắc | `*.md`, `submissions/**` | Số liệu test lấy từ lần chạy thật; mục chưa kiểm chứng ghi rõ là "chưa thực hiện" | ☐ nhóm điền; riêng các ngưỡng/ADR nhóm phải tự giải thích được **vì sao** | ☐ nhóm điền |

## Cách nhóm kiểm chứng đầu ra AI (cần thực hiện, chưa phải đã xong)

- [ ] Chạy `npm ci && npm test` trên máy thật và trên GitHub Actions; ghi URL run xanh vào `source-ref.json`.
- [ ] Mỗi thành viên đọc `estimationScorer.js` và `estimationApi.js`, tự giải thích được quy tắc ±15%, khoảng ≤ 30%, điểm 50/50 và việc server ép thứ tự mà không cần AI.
- [ ] Làm kiểm thử thủ công bàn phím (bảng trong `TEST_REPORT.md` §4).
- [ ] Không dùng AI trong phần vấn đáp trực tiếp (Mục 5.2).
- [ ] Việc merge/PR/tag do thành viên thực hiện, không phải AI.
