# Hoàn thiện hệ thống phân tích AI DESMAP ban đầu

Status: open

## Bối cảnh

Trang đánh giá ban đầu đang dùng dữ liệu bảng hỏi để tạo nhận định cho sáu nhóm DESMAP. Máy chủ gọi OpenRouter 18 lần để lấy riêng nhận định, điểm mạnh và điều cần phát triển của từng nhóm, sau đó giải thích ba nghề đã xếp hạng trong code. Tối đa ba yêu cầu chạy đồng thời. Ứng dụng tự ghép kết quả và chỉ hiển thị sau khi đủ nội dung. Từ 2026-10-04, các lượt gọi và thử lại dùng DeepSeek V4.1 Flash; đã bỏ `openrouter/free` sau khi tái hiện lỗi 502. Xem issue 02 để biết nguyên nhân, bản sửa và kiểm chứng local.

Đã có xử lý thử lại ngắn cho lỗi tạm thời, loại dòng `User Safety: safe`, thử lại một ý chỉ có nhãn này, và giới hạn mỗi ý ở tối đa ba câu hoặc 380 ký tự. Đây là các biện pháp giảm lỗi, chưa xác nhận hệ thống hoạt động ổn định với mô hình mới và tuyến dự phòng trong điều kiện sử dụng thực tế.

## Vấn đề còn mở

- Tuyến miễn phí dự phòng từng trả 429/503 và đôi khi trả nội dung không dùng được (502 ở API của ứng dụng). Chưa có kiểm chứng toàn luồng với Qwen3.7 Flash và đủ 18 ý qua nhiều lượt đánh giá thực tế.
- Ít nhất 22 yêu cầu cho một lượt đánh giá làm tăng thời gian chờ, chi phí của mô hình chính và khả năng chạm giới hạn lượt gọi. Nếu một ý thất bại, toàn bộ kết quả không hiển thị; nút thử lại hiện gửi lại toàn bộ yêu cầu.
- Dòng `User Safety: safe` đã xuất hiện trong trường điểm mạnh. Bộ lọc và lần thử lại cần được kiểm chứng với các dạng phản hồi thực tế khác; nếu lần thử lại cũng không có nội dung, trang vẫn báo lỗi.
- Giới hạn độ dài hiện cắt bớt câu hoặc thêm dấu lửng khi một câu vượt 380 ký tự. Cần kiểm tra thủ công để bảo đảm nhận định vẫn đủ nghĩa và không đứt ý.
- `spec.md` của tính năng còn mô tả hợp đồng cũ, khác luồng nhận định AI đang chạy.

## Điều kiện hoàn thành

- [ ] Kiểm thử đầu cuối bằng dữ liệu bảng hỏi đại diện trên môi trường triển khai: đủ sáu nhóm, 18 ý và gợi ý nghề bằng tiếng Việt, không có nhãn an toàn hoặc nội dung thay thế của nhà cung cấp.
- [ ] Xác nhận mỗi ý ngắn, đọc trọn nghĩa, tối đa ba câu và không vượt giới hạn ký tự trên giao diện máy tính lẫn điện thoại.
- [ ] Đo thời gian hoàn thành, tỷ lệ thành công và 429/502/503 của nhiều lượt đánh giá; bảo đảm luồng hoàn thành trước thời hạn của hàm máy chủ.
- [ ] Giảm số yêu cầu phải gọi lại khi một ý thất bại, hoặc có cách xử lý khác kiểm soát được chi phí và giới hạn lượt gọi.
- [ ] Giữ skeleton cho đến khi đủ kết quả; khi không thể hoàn thành, hiển thị lỗi tiếng Việt và cho thử lại mà không lộ kết quả một phần.
- [ ] Cập nhật `spec.md` và tài liệu liên quan theo hợp đồng triển khai thực tế sau khi chốt cách xử lý lỗi và hiệu năng.

## Tệp liên quan

- `src/routes/api/ai/initial-career-assessment/+server.ts`
- `src/lib/assessment/initial.ts`
- `src/routes/evaluation/+page.svelte`
- `src/routes/api/ai/initial-career-assessment/server.test.ts`
- `.scratch/initial-career-assessment/spec.md`
