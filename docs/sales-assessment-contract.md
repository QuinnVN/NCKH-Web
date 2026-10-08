# Hợp đồng kết quả Sales v2

NCKH-AI ghi một aggregate `game_results` hoàn tất cho mỗi `runId`. NCKH-Web không có route nhận trực tiếp điểm Sales từ Unity. `src/lib/server/sales-result-contract.ts` định nghĩa và kiểm tra phần đánh giá có thẩm quyền để phía Web dùng khi đọc aggregate này. Không thêm dashboard hoặc route ghi điểm trong đợt nâng cấp.

Một aggregate hợp lệ có `gameId: "sale"`, `status: "completed"` và `data.part2`. Draft local dùng trạng thái `finalized` sau khi xuất aggregate; đó không phải trạng thái của document trong MongoDB. Kết quả v2 giữ sáu trường `pipelineVersion`, `rubricVersion`, `scenarioVersion`, `questionSetVersion`, `thresholdVersion`, `promptVersion`, cùng `assessmentStatus: "completed"`. Kết quả `pending` hoặc `needs-review` không được coi là hoàn tất dù chứa giá trị điểm.

Hai tiêu chí `apologyAndPolicyRemedy` và `adaptabilityAndDeescalation` có giá trị 0–50. V2 cộng mỗi thành phần rubric 10 điểm một lần; tổng hai tiêu chí là `rawScore`, `score = rawScore - policyViolationPenalty`. `customerRating` ánh xạ restored/good, partially_restored/considering, lost/bad. Một ending bắt buộc mất niềm tin ưu tiên hơn điểm số. Phần 1 giữ cách chấm hiện có.

Parser chỉ trả các trường đánh giá và phiên bản được duyệt. Metadata nhà cung cấp, audio, checkpoints và API key không nằm trong kiểu dữ liệu này. Phiên cũ không có phiên bản vẫn được đọc theo giá trị đã lưu; parser không tự thêm provenance hoặc áp rubric v2 cho chúng.

Nguồn đặc tả nằm trong `docs/specs/sales-dialogue-openrouter-upgrade.md`. Backend phải cập nhật hợp đồng aggregate cùng Unity trước khi người vận hành bật `PIPELINE_MODE=openrouter`. Cờ này mặc định `legacy` cho đến khi hoàn thành calibration, holdout, khảo sát lời Lan, latency và kiểm tra headset.
