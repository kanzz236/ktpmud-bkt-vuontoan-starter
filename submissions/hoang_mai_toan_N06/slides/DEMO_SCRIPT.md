# DEMO SCRIPT — N06 — Track B (tối đa 7 phút)

Mục tiêu: trong 7 phút cho thấy **vì sao thiết kế như vậy** (trọng tâm vấn đáp), không chỉ "nó chạy".
Chuẩn bị: `npm ci && npm run reset-db && npm start`, đăng nhập `hocsinh01 / 123456` (tài khoản synthetic). Mở sẵn `DECISIONS.md` ở ADR-03.

| Thời lượng | Nội dung | Người nói | Màn hình |
|---|---|---|---|
| 0:00–0:45 | **Bài toán & phương châm.** Hệ thống chỉ so khớp chuỗi (tài liệu chuẩn §4) nên không chấm được "gần đúng". Ta mở rộng **một** dạng bài, không viết lại hệ thống, không đụng `auth.js`. | `Lead-BE` | Slide 1: sơ đồ `html → api.js → db.js`, `auth.js` bị khoá |
| 0:45–1:45 | **Quyết định thiết kế #1:** type `estimate` trong `questions` + bảng `estimation_steps` (ADR-01) thay vì bảng/route song song → đi qua `/api/submissions`, lên bảng xếp hạng và thống kê. | `Lead-BE` | `DECISIONS.md` ADR-01 (bảng phương án A/B/C) |
| 1:45–3:15 | **Demo luồng (B-01, B-06, B-12).** Vào bằng menu "Ước Lượng Trước Khi Tính". Chỉ dùng **bàn phím**: nhập ước lượng → Enter → thấy phản hồi chưa lộ đáp án → nhập kết quả → Enter → hai thông báo tách bạch + cách ước lượng mẫu. | `Dev-FE` | Trình duyệt (không dùng chuột) |
| 3:15–4:15 | **Server ép thứ tự & không lộ đáp án (B-04, B-05).** Mở DevTools/Network: câu hỏi không có đáp án; gọi `/api/estimation/exact` trước khi ước lượng → 409. F5 giữa chừng → trạng thái còn. | `Lead-BE` | Network tab + F5 |
| 4:15–5:30 | **Quy tắc chấm (B-03).** ±15% và khoảng ≤ 30%, tính bằng số nguyên; vì sao 23 × 7 chứng minh ±10% quá chặt (20 × 7 = 140 so với 161) và ±20% quá rộng (ADR-03). Cho thấy biên `⌈0,85E⌉`/`⌊1,15E⌋`. | `Lead-BE` | `DECISIONS.md` ADR-03 + `estimationScorer.js` |
| 5:30–6:30 | **Test & CI (B-08…B-10).** `npm test` → 35 ca (normal/boundary/invalid/scoring); test bảo vệ `auth.js` bằng băm; CI chạy `npm ci` + `npm test` trên PR. | `Dev-FE` | Terminal + tab Actions |
| 6:30–7:00 | **Giới hạn & bàn giao.** Chưa rate-limit; chỉ chia hết; mỗi câu một lượt chốt. Tài liệu bàn giao ở `submissions/hoang_mai_toan_N06/`. | cả nhóm | Slide cuối |

## Câu hỏi vấn đáp nên chuẩn bị (mỗi thành viên phải trả lời không cần AI)

1. Vì sao không mã hoá khoảng hợp lệ vào `correct_answer` (phương án C)?
2. Vì sao phản hồi bước 1 không được trả biên chấp nhận?
3. Nếu đổi sai số thành ±10%, cần sửa ở đâu và test nào sẽ đỏ? (`TOLERANCE_PERCENT`; test biên và test fixtures nhất quán)
4. Vì sao học sinh không được chốt ước lượng lần hai?
5. Một ca lỗi cụ thể: gửi `"-5"` / `""` / `"12,5"` thì server trả gì và vì sao không tiêu hao lượt?
6. Bằng chứng B-07 không bị vi phạm nằm ở đâu?

## Phương án dự phòng khi demo

- Mất mạng: giao diện dùng CSS tĩnh (`tailwind.build.css`), vẫn chạy cục bộ.
- Lỗi DB cũ: `npm run reset-db` rồi `npm start`.
- Quá giờ: bỏ mục 5:30–6:30, chỉ nêu lệnh `npm test`.
