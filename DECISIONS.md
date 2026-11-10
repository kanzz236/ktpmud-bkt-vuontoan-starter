# DECISIONS.md - Quyết định Thiết kế Kiến trúc (Track B: Vườn Toán Lớp 3)

## ADR-01: Mở rộng Schema SQLite cho dạng bài Ước lượng
- **Trạng thái:** Proposed (Đề xuất / Chờ duyệt)
- **Bối cảnh:** Cần lưu trữ các câu hỏi ước lượng mới và lịch sử bài làm của học sinh cho dạng bài "Ước lượng trước khi tính đúng" mà không làm ảnh hưởng đến cấu trúc bảng cũ của starter repo.
- **Quyết định:** Tạo thêm bảng mới `estimation_questions` và `estimation_attempts` trong SQLite, liên kết khóa ngoại với bảng `users` hiện có mà hoàn toàn không can thiệp vào `server/auth.js` hay cơ chế session gốc (đáp ứng tiêu chí B-07).
- **Hệ quả / Lý do:** Đảm bảo tính cô lập (isolation), giữ nguyên hiện trạng hệ thống legacy và dễ dàng mở rộng test.

## ADR-02: Thuật toán Chấm điểm Ước lượng Tất định (Deterministic Scoring)
- **Trạng thái:** Proposed (Đề xuất / Chờ duyệt)
- **Bối cảnh:** Đề bài yêu cầu chấm điểm hoàn toàn bằng code backend, không phụ thuộc LLM/AI. Học sinh lớp 3 cần được chấp nhận một khoảng sai số hợp lý hoặc kỹ thuật làm tròn khi ước lượng.
- **Quyết định:** Sử dụng hàm toán học cố định trên backend: giá trị học sinh nhập được hệ thống công nhận là **"Hợp lý"** nếu nằm trong khoảng biên độ cho phép so với kết quả chuẩn của phép tính (ví dụ sai số $\pm 10\%$ hoặc làm tròn đến hàng chục gần nhất).
- **Hệ quả / Lý do:** Đảm bảo tính tất định (deterministic), minh bạch, dễ viết unit test tự động (đáp ứng B-03 và B-08) và không tốn chi phí gọi API AI.

## ADR-03: Phân tách DTO bảo mật kết quả (Anti-Cheat & Security)
- **Trạng thái:** Proposed (Đề xuất / Chờ duyệt)
- **Bối cảnh:** Tiêu chuẩn B-04 yêu cầu API trả về đề bài **không** được kèm theo đáp án đúng để học sinh không đọc được source code hoặc Network tab của trình duyệt.
- **Quyết định:** Thiết kế lại Data Transfer Object (DTO) tách bạch rõ ràng: API gửi client chỉ chứa đề bài, ID và thông tin cấu hình hiển thị; toàn bộ đáp án và logic so khớp nằm độc lập ở phía server-side controller.
- **Hệ quả / Lý do:** Ngăn chặn gian lận phía client, bảo vệ ranh giới an toàn của miền dữ liệu bài học.
