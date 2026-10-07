# Sửa initial eval trả 502 khi nhận xét nghề không hợp lệ

Status: resolved

## Nguyên nhân được tái hiện ngày 2026-10-04

POST `/api/ai/initial-career-assessment` ở local trả 502 với dữ liệu bảng hỏi tạo mới, đúng hợp đồng hiện tại. Qwen3.7 Flash trả nhận xét nghề logistics dài 1.393 ký tự, vượt giới hạn 1.200. Lần thử lại qua `openrouter/free` chọn `nvidia/nemotron-3.5-content-safety:free`, trả HTTP 200 nhưng nội dung chỉ là `User Safety: safe`. API từ chối nội dung này và làm cả lượt đánh giá thất bại sau khoảng 27,5 giây.

Đọc bảng hỏi đã lưu gọi `parseCompletionPayload`, tính lại điểm từ câu trả lời bằng `scoreAnswers`. Yêu cầu sai hợp đồng bị trả 422 trước khi gọi OpenRouter. Lỗi 502 đã tái hiện không cần dữ liệu schema cũ hay MongoDB.

## Bản sửa

- Initial eval chỉ gọi `deepseek/deepseek-v4.1-flash`, tắt reasoning; lần thử lại vẫn dùng cùng model. Không dùng tuyến model miễn phí ngẫu nhiên.
- Prompt nhận xét nghề yêu cầu khoảng 600-900 ký tự, giữ trần 1.200.
- Khi hai lần trả nhận xét nghề đều không hợp lệ, dùng `careerEvidenceDescription` với nghề đã xếp hạng, hai yếu tố bảng hỏi và hoạt động khám phá nghề. Không làm mất 18 nhận định DESMAP đã hoàn thành.
- Các lỗi xác thực, giới hạn lượt gọi, kết nối và nhận định DESMAP rỗng sau hai lần thử vẫn được báo lỗi. Không thay dữ liệu người dùng hay ghi kết quả thử vào MongoDB.
- Final eval ở repository Python cũng dùng DeepSeek V4.1 Flash và lưu model này trong metadata của kết quả mới.

## Kiểm chứng

- Hai test ở seam POST mô phỏng nhận xét quá dài rồi model kiểm duyệt chỉ trả nhãn an toàn, và nhận xét quá dài sau cả hai lần. Cả hai trả 502 trước bản sửa và 200 sau bản sửa.
- 72 test về proxy, initial assessment, xếp hạng nghề và dữ liệu bảng hỏi qua; 40 test backend về writer, generator, schema, xếp hạng và benchmark qua.
- Gọi lại endpoint local hai lần sau bản sửa: HTTP 200, đủ sáu nhóm DESMAP và ba nghề, lần lượt 20,40 và 20,11 giây.
- Type checking: 0 lỗi, 0 cảnh báo.
- Vite biên dịch client và server thành công. Bước đóng gói của adapter Vercel thất bại với `EPERM` khi tạo symlink trên Windows; chưa xác nhận gói triển khai Vercel.

Kiểm chứng này xác nhận lỗi đã tái hiện và bản sửa ở local. Các mục hiệu năng trên môi trường triển khai trong issue 01 vẫn cần đo riêng.
