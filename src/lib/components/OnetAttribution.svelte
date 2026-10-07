<script lang="ts">
	import { ONET_VERSION } from '$lib/assessment/onet';

	let { class: className = '' }: { class?: string } = $props();
</script>

<!-- Required by the O*NET Database license (CC BY 4.0) wherever O*NET-based results appear. -->
<p class="m-0 text-[.72rem] leading-[1.6] text-[#7f8ea3] {className}">
	Gợi ý nghề sử dụng thông tin từ Cơ sở dữ liệu
	<a class="text-inherit underline" href="https://www.onetcenter.org/database.html" rel="external"
		>O*NET® {ONET_VERSION}</a
	>
	của Bộ Lao động Hoa Kỳ, Cục Việc làm và Đào tạo (USDOL/ETA), theo giấy phép
	<a
		class="text-inherit underline"
		href="https://creativecommons.org/licenses/by/4.0/deed.vi"
		rel="external license">CC BY 4.0</a
	>. Nhóm DESMAP đã chỉnh sửa một phần hoặc toàn bộ thông tin này; USDOL/ETA chưa phê duyệt, xác
	nhận hay kiểm thử các chỉnh sửa đó. O*NET® là nhãn hiệu của USDOL/ETA.
</p>
