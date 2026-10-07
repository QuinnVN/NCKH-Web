# Gợi ý nghề DESMAP

Hai trạng thái của `/evaluation` dùng danh mục 68 nghề trong `src/lib/assessment/career-catalog.json`. Hồ sơ mỗi nghề được suy ra từ cơ sở dữ liệu O\*NET® 30.2 (CC BY 4.0) qua bảng gán mã đã duyệt (`docs/onet-career-mapping.md` trong NCKH-AI). Mỗi nghề có hồ sơ O\*NET cho 22 nhóm E, S, M, A, P, trọng số từ 1 đến 5, sáu mục tiêu D, trọng số cho sáu loại bằng chứng VR và một hoạt động thử nghề. Đây là dữ liệu nghề của Mỹ được chuyển sang DESMAP, chưa được hiệu chuẩn bằng kết quả nghề nghiệp thực tế ở Việt Nam.

Bốn nghề đã bỏ vì O\*NET không có nghề tương đương đủ tin cậy: Công chứng viên, Chuyên viên hành chính công, Chuyên viên quan hệ quốc tế, Nhà nghiên cứu.

## Dữ liệu O\*NET

Mỗi mục O\*NET (Skills, Work Activities, Work Styles, Work Context) được chuẩn hóa z-score trên toàn bộ nghề có dữ liệu, lấy trung bình theo nhóm DESMAP rồi chuẩn hóa lại. Hồ sơ `profile` vì vậy cho biết nghề cần nhóm đó nhiều hơn hay ít hơn một nghề O\*NET điển hình. Trọng số bằng `1 + 2 × max(0, profile)`, giới hạn ở 5: chỉ yêu cầu cao hơn mức trung bình mới tăng trọng số. Mục tiêu D lấy từ Work Values Extent (thang 1–7) đổi sang 0–100. Danh sách mục O\*NET của từng nhóm nằm trong bảng gán mã.

## Cách tính

Theo báo cáo kỹ thuật của O\*NET về việc ghép hồ sơ người dùng với hồ sơ nghề, 22 nhóm E, S, M, A, P được so theo **hình dạng**: điểm hình dạng bằng `50 + 50 × r`, với `r` là hệ số tương quan Pearson giữa điểm tự đánh giá và `profile` của nghề. Sáu nhóm D được so theo mức: `100 − |điểm tự báo cáo − mục tiêu nghề|`, lấy trung bình. Điểm bảng hỏi bằng `15% × D + 85% × hình dạng`. Điểm thấp ở D không bị coi là năng lực yếu.

Điểm cao ở nhóm khác không được bù hoàn toàn cho điểm thấp ở yêu cầu cốt lõi (nhóm có `profile ≥ 1`, tức cao hơn trung bình ít nhất một độ lệch chuẩn). Điểm bảng hỏi bị trừ `0,3 × trung bình max(0, 50 − điểm)` trên các nhóm cốt lõi, rồi giới hạn trong 0–100. Phần giải thích nghề dẫn các nhóm có `profile` cao nhất, ít nhất ba nhóm.

Mô phỏng 800 hồ sơ trả lời ngẫu nhiên: nghề hạng nhất đổi trong khoảng 18% trường hợp khi đổi một câu trả lời; nghề xuất hiện nhiều nhất trong top 3 (Kỹ thuật viên điện) gấp khoảng 4 lần mức trung bình. Các nghề có hồ sơ O\*NET rất đặc trưng dễ xuất hiện hơn với câu trả lời ngẫu nhiên; cần kiểm tra lại trên dữ liệu người dùng thật.

Đánh giá ban đầu và đánh giá cuối cùng giới hạn gợi ý theo các lĩnh vực quan tâm đã chọn ở đầu bảng hỏi; lựa chọn đang khám phá mở toàn bộ 68 nghề. Yêu cầu đánh giá ban đầu gửi kèm `career_interests`, và máy chủ từ chối gợi ý nằm ngoài các lĩnh vực đó.

Ở đánh giá cuối, tỷ trọng VR bằng `25% × tổng trọng số tiêu chí quan sát được / tổng trọng số VR của nghề`. Điểm cuối bằng `điểm bảng hỏi × (1 − tỷ trọng VR) + điểm VR × tỷ trọng VR`. Một nhiệm vụ không quan sát được không nhận điểm 0. Điểm 0 thực sự được ghi nhận vẫn tham gia tính toán. Không nhân lại trọng số của nghề trải nghiệm khi tính cho một nghề khác.

Các lượt lặp được lấy trung bình trong từng game trước khi gộp các game. Điểm chỉ làm tròn sau khi xếp hạng, tránh tạo đồng hạng do làm tròn sớm. Nếu điểm thực sự bằng nhau, dùng mã nghề để giữ kết quả ổn định. Không thay nghề ngẫu nhiên để tạo đa dạng.

## Nhận xét và dữ liệu cũ

AI chọn cách viết và thứ tự ý, không bị ép theo số câu hoặc cấu trúc ưu điểm rồi nhược điểm. Nhận xét cần dẫn ít nhất hai yếu tố bảng hỏi bằng tên và điểm trên 100, liên hệ với công việc và đề xuất hoạt động thử nghề. Nhận xét cuối có thêm tiêu chí VR và phân biệt nó với tự đánh giá. Nếu thiếu dẫn chứng hoặc dùng lời chê bai, hệ thống dùng đoạn góp ý từ chính các dữ kiện đã tính.

Web tính lại phần nghề của hồ sơ MongoDB cũ khi đọc, không ghi đè tài liệu. Dữ liệu VR có mã đánh giá hoặc email khác bị loại. Với dữ liệu cũ chỉ có tên, chỉ ghép khi tên xác định được duy nhất và không thuộc email khác. Khi không xác định được dữ liệu VR hợp lệ, giữ kết quả đã lưu. Cache ban đầu dùng phiên bản mới để tránh tái sử dụng gợi ý cũ.

## Kiểm chứng ngày 04/10/2026

Đọc 21 hồ sơ `final_evaluations`; 20 hồ sơ có thể đối chiếu với bảng hỏi và VR. Tính lại trên 20 hồ sơ cho thấy số danh sách có cả bảy nghề cùng điểm giảm từ 15 xuống 0; Biên kịch xuất hiện từ 8 xuống 2 lần. Số nghề khác nhau trong các danh sách tăng từ 51 lên 54. Đây là kiểm tra khả năng phân biệt hồ sơ, chưa chứng minh độ chính xác dự báo nghề nghiệp.

## Đồng bộ backend

Nguồn nằm ở repository NCKH-AI. `scripts/build_onet_extract.py --version 30.2` tải các file O\*NET và ghi `data/onet-extract.json`; `scripts/build_career_catalog.py --web-root <đường dẫn NCKH-Web>` đọc bảng gán mã và bản trích để xuất cả hai bản JSON. Khi thay dữ liệu, bảng gán mã hoặc công thức, tăng `version` của danh mục để vô hiệu hóa cache và lời nhận xét cũ; khi đổi bản O\*NET, cập nhật cả `src/lib/assessment/onet.ts`. Phiên bản `desmap-careers-v4` chuyển sang hồ sơ O\*NET. Các bài kiểm thử dùng tám hồ sơ tổng hợp chung để đối chiếu thứ tự, điểm chưa làm tròn và điểm hiển thị giữa Python và TypeScript.

Web hiển thị thông báo ghi nguồn O\*NET dưới danh sách gợi ý nghề và ở chân trang (`src/lib/components/OnetAttribution.svelte`), theo yêu cầu của giấy phép CC BY 4.0.
