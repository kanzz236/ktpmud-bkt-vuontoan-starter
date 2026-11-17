# PROGRESS — N06 — Track B

- Starter: ktpmud-bkt-vuontoan-starter · tag bkt-2026-v1
- Fork: https://github.com/kanzz236/ktpmud-bkt-vuontoan-starter

## PC-1 — 11/11/2026

### 1.1. Tiến độ theo acceptance criteria
<!-- Track B: B-01…B-12 (theo đề thi Track B) -->
| Mã | Trạng thái (Chưa / Đang / Xong) | Bằng chứng (commit / CI / file) | Ghi chú |
|---|---|---|---|
| B-01 | Đang | File `README.md` & kế hoạch tích hợp | Đã xác định vị trí tích hợp vào luồng bài học hiện có |
| B-02 | Đang | File `data/estimation_fixtures.json` (phác thảo) | Chuẩn bị dữ liệu mẫu các phép nhân/chia |
| B-03 | Đang | File `server/estimationScorer.js` (phác thảo) | Thuật toán chấm điểm tất định với biên độ sai số |
| B-04 | Đang | Phân tích API DTO trong `DECISIONS.md` | Thiết kế đảm bảo không trả đáp án đúng về client trước khi submit |
| B-05 | Chưa | | Lưu trạng thái làm bài vào SQLite |
| B-06 | Chưa | | Xây dựng phản hồi sư phạm (Feedback) phân biệt ước lượng và kết quả chính xác |
| B-07 | Xong | File `server/auth.js` (giữ nguyên gốc) | Cam kết không can thiệp vào cơ chế auth và session hiện tại |
| B-08 | Chưa | | Xây dựng test suite tự động cho các ca test |
| B-09 | Chưa | | Bổ sung script `npm test` vào `package.json` |
| B-10 | Chưa | | Cấu hình GitHub Actions CI chạy test tự động |
| B-11 | Xong | File `REQUIREMENTS.md` & chính sách bảo mật | Cam kết không sử dụng dữ liệu thật, tuân thủ dữ liệu synthetic |
| B-12 | Chưa | | Thiết kế giao diện hỗ trợ điều hướng cơ bản bằng bàn phím |

### 1.2. Sửa đổi bắt buộc từ Checkpoint 1
| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Không có | - | - |

### 1.3. Timeline dự kiến đến khi hoàn thành
| Việc | Vai trò phụ trách | Mốc (CP2 15/11 · M3 · Freeze 19/11 · M4 20/11) | Ngày dự kiến |
|---|---|---|---|
| Hoàn thành 12 fixtures & module `estimationScorer.js` | Dev Backend | Trước PC-1 | 11/11/2026 |
| Xây dựng giao diện Frontend nhập ước lượng | Dev Frontend | CP2 (15/11) | 14/11/2026 |
| Viết unit test tự động & cấu hình CI | Dev Testing | M3 | 17/11/2026 |
| Hoàn thiện toàn bộ tài liệu & kiểm thử cuối | Team Lead | Freeze (19/11) | 19/11/2026 |

### 1.4. Rủi ro / đang vướng

### 1.5. Câu hỏi cho GV
- Q1
### 1.6. Phân công (alias hoặc vai trò, KHÔNG ghi họ tên/MSSV)
| Alias / vai trò | Đầu việc chính | Commit/PR tiêu biểu |
|---|---|---|
| Lead-BE | Thiết kế CSDL, thuật toán chấm điểm tất định | Commit `M0: Checkpoint 1 setup` |
| Dev-FE | Giao diện tương tác, luồng nhập ước lượng | - |

## PC-2 — 18/11/2026

### 2.1. Đối chiếu timeline PC-1
| Việc (theo bảng 1.3) | Kế hoạch | Thực tế | Lệch & lý do |
|---|---|---|---|
| Hoàn thành 12 fixtures & module `estimationScorer.js` | 11/11/2026 | Xong: `data/estimation_fixtures.json` (12 câu, seed `20261104`), `server/estimationScorer.js`, `tools/gen-estimation-fixtures.js` | Ngày hoàn thành thực tế: ☐ nhóm điền theo lịch sử commit. Bản PC-1 mới là phác thảo (ngưỡng ±10%/±15%/±20% chưa thống nhất); đã chốt một quy tắc duy nhất ±15% và khoảng ≤ 30% trong `DECISIONS.md` ADR-03 |
| Xây dựng giao diện Frontend nhập ước lượng | 14/11/2026 | Xong: `public/assets/js/pages/estimate.js`, `public/assets/css/app.css`, mục menu trong `sidebar.js`, tích hợp `lesson.js` | Ngày thực tế: ☐ nhóm điền. Chưa kiểm thử thủ công bằng bàn phím (xem B-12) |
| Viết unit test tự động & cấu hình CI | 17/11/2026 | Test xong: `test/estimationScorer.test.js` (16), `test/api.integration.test.js` (19). CI: có `.github/workflows/ci.yml` (Node 18, 20, 22) nhưng **chưa có run CI xanh thật** | Lệch: chưa có URL run xanh. Lý do: chưa push và chạy trên GitHub Actions. Đã sửa lỗi test trên Node 18 (hook `test.before` không chạy) |
| Hoàn thiện toàn bộ tài liệu & kiểm thử cuối | 19/11/2026 | Tài liệu đủ 6 file trong `submissions/hoang_mai_toan_N06/artifacts/` + README + `slides/DEMO_SCRIPT.md`. Kiểm thử cuối chưa xong | Còn: điền bằng chứng đóng góp/AI, kiểm thử bàn phím, URL CI, SHA freeze |

Ghi chú trung thực: phần lớn mã và tài liệu Track B do công cụ AI (Claude) viết, đã khai trong `submissions/hoang_mai_toan_N06/artifacts/AI_USE.md`; các thành viên có trách nhiệm đọc, hiểu và giải thích được trước buổi vấn đáp 21/11.

### 2.2. Tiến độ theo acceptance criteria (cập nhật toàn bộ bảng 1.1)
| Mã | Trạng thái | Bằng chứng | Ghi chú |
|---|---|---|---|
| B-01 | Xong | `server/db.js` (bộ `uoc-luong-nhan-chia` gắn Bài 41), `public/assets/js/components/sidebar.js`; test "B-01" trong `test/api.integration.test.js` | Vào qua `/api/lessons`, trang làm bài chung `lesson.html` và mục menu |
| B-02 | Xong | `data/estimation_fixtures.json` (12 câu), `tools/gen-estimation-fixtures.js`; test sinh tất định trong `test/estimationScorer.test.js` | Seed `20261104`; JSON phải khớp bộ sinh |
| B-03 | Xong | `server/estimationScorer.js`; `DECISIONS.md` ADR-03, ADR-06; 16 unit test | ±15% (một số), khoảng ≤ 30% E, tính bằng số nguyên |
| B-04 | Xong | `server/estimationApi.js`, `server/api.js`; test "B-02/B-04", "normal: … KHÔNG lộ" | DTO tường minh; phản hồi bước 1 không chứa E hay biên |
| B-05 | Xong | `server/db.js` (bảng `estimation_steps`), `server/estimationApi.js`; test "B-05" (2 ca) | Trạng thái lưu ở server, F5 không mất; nộp bộ ghi `attempts` + `progress` |
| B-06 | Xong | `exactFeedback()` trong `server/estimationScorer.js`; hai test "B-06" | Hai thông báo tách bạch: ước lượng hợp lý / kết quả chính xác |
| B-07 | Xong | `server/auth.js` không đổi; test "B-07" (băm SHA-256) và test hồi quy bộ đề cũ | Không đụng auth, session, tài khoản mẫu, deployment |
| B-08 | Xong | `test/estimationScorer.test.js`, `test/api.integration.test.js` (35 ca: normal, boundary, invalid, scoring) | 35/35 đạt khi chạy cục bộ; cần nhóm xác nhận lại bằng `npm ci && npm test` trên máy thật |
| B-09 | Xong | `package.json` (`"test": "node --test"`) | Không thêm thư viện; cần xác nhận từ clean checkout |
| B-10 | Đang | `.github/workflows/ci.yml` (`npm ci` + `npm test`, Node 18/20/22) | **Chưa có run CI xanh**; cần push và ghi URL run |
| B-11 | Xong | `submissions/hoang_mai_toan_N06/artifacts/SECURITY_PRIVACY_CHECKLIST.md`; `submission.json` dùng alias | Dữ liệu synthetic; đã quét secret bằng `grep`; chưa quét bằng công cụ chuyên dụng |
| B-12 | Đang | `public/assets/js/pages/estimate.js` (form, label, Enter gửi, focus tự chuyển, `role="alert"`, `aria-live`), `app.css` (viền focus) | **Chưa kiểm thử thủ công bằng bàn phím trên trình duyệt**; bảng ca kiểm thử ở `artifacts/TEST_REPORT.md` §4 |

### 2.3. Sẵn sàng nộp bài (đề thi Mục 6)
| Deliverable | Có / Chưa | Đường dẫn |
|---|---|---|
| README.md (cài đặt / chạy / test) | Có | `README.md`, `submissions/hoang_mai_toan_N06/README.md` |
| REQUIREMENTS.md | Có | `REQUIREMENTS.md`, `submissions/hoang_mai_toan_N06/artifacts/REQUIREMENTS.md` |
| DECISIONS.md / ADR | Có | `DECISIONS.md` (8 ADR), `submissions/hoang_mai_toan_N06/artifacts/DECISIONS.md` |
| Test tự động + CI xanh | Chưa | Test có: `test/`; workflow có: `.github/workflows/ci.yml`; **chưa có run CI xanh** |
| TEST_REPORT.md | Có | `submissions/hoang_mai_toan_N06/artifacts/TEST_REPORT.md` (mục kiểm thử thủ công còn trống) |
| SECURITY_PRIVACY_CHECKLIST.md | Có | `submissions/hoang_mai_toan_N06/artifacts/SECURITY_PRIVACY_CHECKLIST.md` |
| AI_USE.md | Có | `submissions/hoang_mai_toan_N06/artifacts/AI_USE.md` (cột quyết định/người chịu trách nhiệm nhóm còn phải điền) |
| CONTRIBUTIONS.md | Có | `submissions/hoang_mai_toan_N06/artifacts/CONTRIBUTIONS.md` (bằng chứng commit/PR nhóm còn phải điền) |
| Slide / demo script ≤ 7 phút | Có | `submissions/hoang_mai_toan_N06/slides/DEMO_SCRIPT.md` |
| Draft PR vào `ktpmud-project`, check `validate` xanh | Chưa | Chưa mở PR; sẽ mở trước 11:30 ngày 18/11 (chỉ thay đổi `submissions/hoang_mai_toan_N06/`) |

### 2.4. Việc còn lại đến Freeze (23:59 19/11)
| Việc | Vai trò phụ trách | Hạn |
|---|---|---|
| Chạy `npm ci && npm test` từ clean checkout của fork; sửa nếu lỗi | Lead-BE | 18/11 |
| Push lên fork, chạy GitHub Actions, ghi URL run xanh vào `source-ref.json` (`ci_run_url`) | Lead-BE | 18/11 |
| Mở Draft PR vào `ktpmud-project` (chỉ thư mục `submissions/hoang_mai_toan_N06/`), sửa cho check `validate` xanh | Lead-BE | trước 11:30 18/11 |
| Kiểm thử thủ công bằng bàn phím (B-12), ghi kết quả vào `TEST_REPORT.md` §4 | Dev-FE | 19/11 |
| Điền bằng chứng đóng góp (SHA/PR/review) trong `CONTRIBUTIONS.md` và cột trách nhiệm trong `AI_USE.md` | Lead-BE, Dev-FE | 19/11 |
| Rà lần cuối PII/secret trên toàn lịch sử git (công cụ quét secret) | Dev-FE | 19/11 |
| Đổi người nói trong `slides/DEMO_SCRIPT.md` cho khớp phân công thật; tập demo ≤ 7 phút | Lead-BE, Dev-FE | 19/11 |
| Freeze: ghi `final_commit`, tạo tag `bkt-2026-N06-rc1`, cập nhật mục "Kết quả cuối" | Lead-BE | 19/11 23:59 |
| Chuyển Draft PR sang Ready for review | Lead-BE | 20/11 |

### 2.5. Rủi ro / câu hỏi cho GV
- Rủi ro: chưa có run CI xanh thật và chưa có Draft PR; nếu check `validate` đòi hỏi điều chưa biết thì cần thời gian sửa trước Freeze.
- Rủi ro: phần lớn mã do AI viết; thành viên phải đọc và hiểu để trả lời vấn đáp 21/11 (đã khai trong `AI_USE.md`).
- Rủi ro: chưa có giới hạn tần suất gọi API ước lượng; chỉ có chặn một lượt chốt mỗi câu (đã ghi trong `SECURITY_PRIVACY_CHECKLIST.md`).
- Câu hỏi 1: check `validate` của `ktpmud-project` kiểm tra những gì (cấu trúc thư mục, JSON, tên file)? Có mẫu `_TEMPLATE_BKT_VUONTOAN` để đối chiếu `submission.json` và `source-ref.json` không?
- Câu hỏi 2: nhóm hiện có 2 thành viên trong khi đề quy định 3 đến 5; thầy cho nhóm tiếp tục như vậy được không?

## Kết quả cuối — Freeze 19/11/2026

- Tag: bkt-2026-N06-rc1 · SHA: ☐ điền sau khi freeze
- Trạng thái cuối từng mã AC: ☐ cập nhật bảng 2.2 hoặc ghi "như 2.2 trừ: …"
- Những việc trong timeline chưa hoàn thành và lý do: ☐ điền sau khi freeze
