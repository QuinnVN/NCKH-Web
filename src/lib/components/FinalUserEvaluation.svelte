<script lang="ts">
	import { Check, Route, TriangleAlert } from '@lucide/svelte';
	import type { FinalUserEvaluation } from '$lib/evaluation';

	let { evaluation }: { evaluation: FinalUserEvaluation } = $props();
</script>

<section class="pb-[clamp(3rem,6vw,6rem)]" aria-labelledby="final-user-evaluation-heading">
	<header
		class="grid gap-8 border-b border-white/16 pt-[clamp(1.5rem,3vw,2.75rem)] pb-[clamp(2.5rem,5vw,4.5rem)] min-[900px]:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] min-[900px]:gap-0"
	>
		<div class="flex min-w-0 flex-col items-start">
			<span class="h-1 w-16 bg-[linear-gradient(90deg,#bcff63,#78d9d5)]" aria-hidden="true"></span>
			<h1
				class="mt-6 mb-0 text-[clamp(3.1rem,7.2vw,6.25rem)] leading-[.94] font-[800] tracking-[-.07em] text-white"
				id="final-user-evaluation-heading"
			>
				<span class="block">Đánh giá</span>
				<span class="block text-lime">cuối cùng</span>
			</h1>
			{#if evaluation.isPlaceholder}
				<span class="mt-6 border border-white/20 px-3 py-1.5 text-xs text-[#b7c2d1]">
					Dữ liệu minh họa
				</span>
			{/if}
		</div>
		<div
			class="min-w-0 border-t border-white/16 pt-7 min-[900px]:border-t-0 min-[900px]:border-l min-[900px]:pt-2 min-[900px]:pl-[clamp(2rem,4vw,4.5rem)]"
		>
			<h2
				class="m-0 max-w-[52ch] text-[clamp(1.4rem,2.1vw,1.9rem)] leading-[1.45] font-medium tracking-[-.025em] text-[#e2eaf3]"
			>
				{evaluation.headline}
			</h2>
			<p
				class="mt-7 mb-0 max-w-[38rem] text-[clamp(.95rem,1.3vw,1.05rem)] leading-7 text-[#aebbcf]"
			>
				Kết luận dựa trên hồ sơ tự đánh giá và những gì bạn đã thể hiện trong trải nghiệm
				<strong class="font-semibold text-white">{evaluation.experienceName}</strong>.
			</p>
		</div>
	</header>

	<div
		class="grid gap-8 py-[clamp(2.5rem,5vw,4.5rem)] min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(19rem,.85fr)] min-[900px]:gap-[clamp(3rem,6vw,6rem)]"
	>
		<div class="min-w-0">
			<h2 class="m-0 text-sm font-semibold text-lime">Cách bạn thường làm việc</h2>
			<p
				class="mt-5 mb-0 max-w-[48rem] text-[clamp(1.25rem,2.2vw,1.85rem)] leading-[1.5] font-medium tracking-[-.025em] text-[#eef3f8]"
			>
				{evaluation.workStyle}
			</p>
		</div>
		<aside
			class="min-w-0 border-l-2 border-blue bg-[#0b1730] p-[clamp(1.25rem,2.5vw,2rem)]"
			aria-label="Bằng chứng và điểm chính"
		>
			<h2 class="m-0 text-sm font-semibold text-[#99b5ff]">Dấu hiệu quan sát được trong VR</h2>
			<blockquote class="mt-4 mb-0 text-[clamp(1rem,1.45vw,1.15rem)] leading-[1.7] text-[#ecf2f8]">
				{evaluation.evidence}
			</blockquote>
			<dl
				class="mt-7 mb-0 grid gap-5 border-t border-white/16 pt-6 min-[560px]:grid-cols-2 min-[900px]:grid-cols-1 min-[1120px]:grid-cols-2"
			>
				<div>
					<dt class="text-xs text-[#aebbcf]">Điểm mạnh nên giữ</dt>
					<dd class="mt-2 ml-0 text-base leading-snug font-semibold text-lime">
						{evaluation.strengthLabel}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-[#aebbcf]">Điểm cần luyện</dt>
					<dd class="mt-2 ml-0 text-base leading-snug font-semibold text-[#ffcf86]">
						{evaluation.developmentLabel}
					</dd>
				</div>
			</dl>
		</aside>
	</div>

	<div class="grid border-y border-white/16 min-[760px]:grid-cols-2">
		<div class="py-7 min-[760px]:pr-8">
			<div class="flex items-center gap-3 text-[#65dfff]">
				<Check size={18} strokeWidth={2.5} aria-hidden="true" />
				<h3 class="m-0 text-sm font-semibold">Điều hỗ trợ bạn</h3>
			</div>
			<p class="mt-4 mb-0 max-w-[38rem] text-[.95rem] leading-[1.75] text-[#c6d1de]">
				{evaluation.benefit}
			</p>
		</div>
		<div
			class="border-t border-white/16 py-7 min-[760px]:border-t-0 min-[760px]:border-l min-[760px]:pl-8"
		>
			<div class="flex items-center gap-3 text-[#ffbd59]">
				<TriangleAlert size={18} strokeWidth={2.25} aria-hidden="true" />
				<h3 class="m-0 text-sm font-semibold">Điểm dễ vướng</h3>
			</div>
			<p class="mt-4 mb-0 max-w-[38rem] text-[.95rem] leading-[1.75] text-[#c6d1de]">
				{evaluation.challenge}
			</p>
		</div>
	</div>

	<div
		class="mt-8 grid gap-5 border-l-2 border-lime bg-lime/8 p-[clamp(1.25rem,3vw,2rem)] text-[#eaffd4] min-[680px]:grid-cols-[3rem_minmax(0,1fr)] min-[680px]:items-start"
	>
		<span
			class="grid size-11 place-items-center border border-lime/45 text-lime"
			aria-hidden="true"
		>
			<Route size={21} strokeWidth={2.3} />
		</span>
		<div>
			<h3 class="m-0 text-sm font-bold">Việc nên thử tiếp theo</h3>
			<p class="mt-2 mb-0 max-w-[65rem] text-[.95rem] leading-[1.7] font-medium">
				{evaluation.improvement}
			</p>
		</div>
	</div>
</section>
