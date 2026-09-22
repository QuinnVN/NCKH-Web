<script lang="ts">
	import { Check, Route, Sparkles, TriangleAlert } from '@lucide/svelte';
	import type { FinalUserEvaluation } from '$lib/evaluation';

	let { evaluation }: { evaluation: FinalUserEvaluation } = $props();
</script>

<section
	class="relative mt-4 overflow-hidden border border-lime/55 bg-[#050b14] shadow-[0_1.75rem_5rem_rgb(0_0_0_/.36)]"
	aria-labelledby="final-user-evaluation-heading"
>
	<header
		class="relative isolate overflow-hidden border-b border-white/14 bg-[radial-gradient(circle_at_92%_10%,rgb(37_99_235_/.22),transparent_28%),linear-gradient(115deg,rgb(188_255_99_/.1),rgb(7_16_32)_44%,rgb(7_16_32))] px-[clamp(1.4rem,4vw,3.5rem)] py-[clamp(1.75rem,4vw,3.5rem)]"
	>
		<div class="flex flex-wrap items-center justify-between gap-4">
			<p class="m-0 flex items-center gap-2 text-[.72rem] font-semibold text-lime">
				<Sparkles size={15} strokeWidth={2.3} aria-hidden="true" /> Đánh giá cuối cùng
			</p>
			{#if evaluation.isPlaceholder}
				<span class="border border-white/20 bg-black/20 px-3 py-1.5 text-[.65rem] text-[#b7c2d1]">
					Dữ liệu minh họa
				</span>
			{/if}
		</div>

		<div
			class="mt-[clamp(2.4rem,5vw,4.5rem)] grid items-end gap-8 min-[900px]:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]"
		>
			<h2
				class="m-0 max-w-[22ch] text-[clamp(2rem,4.8vw,4.6rem)] leading-[1.02] font-[760] tracking-[-.055em] text-white"
				id="final-user-evaluation-heading"
			>
				{evaluation.headline}
			</h2>
			<p
				class="m-0 max-w-[34rem] border-l border-blue/65 pl-5 text-[.86rem] leading-7 text-[#aebbcf]"
			>
				Kết luận dựa trên hồ sơ tự đánh giá và những gì bạn đã thể hiện trong trải nghiệm
				<strong class="font-semibold text-white">{evaluation.experienceName}</strong>.
			</p>
		</div>
	</header>

	<div class="grid min-[900px]:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
		<article class="min-w-0 px-[clamp(1.4rem,4vw,3.5rem)] py-[clamp(2rem,4vw,3.5rem)]">
			<p class="m-0 text-[.78rem] font-semibold text-lime">Cách bạn thường làm việc</p>
			<p
				class="mt-5 mb-0 max-w-[48rem] text-[clamp(1.15rem,2vw,1.65rem)] leading-[1.55] font-medium tracking-[-.02em] text-[#eef3f8]"
			>
				{evaluation.workStyle}
			</p>

			<div class="mt-[clamp(2.5rem,5vw,4.5rem)] border-y border-white/14">
				<div class="grid gap-4 py-6 min-[680px]:grid-cols-[10rem_minmax(0,1fr)] min-[680px]:gap-8">
					<div class="flex items-center gap-3 self-start text-[#65dfff]">
						<Check size={18} strokeWidth={2.5} aria-hidden="true" />
						<h3 class="m-0 text-[.78rem] font-semibold">Điều hỗ trợ bạn</h3>
					</div>
					<p class="m-0 max-w-[43rem] text-[.93rem] leading-[1.75] text-[#c6d1de]">
						{evaluation.benefit}
					</p>
				</div>

				<div
					class="grid gap-4 border-t border-white/14 py-6 min-[680px]:grid-cols-[10rem_minmax(0,1fr)] min-[680px]:gap-8"
				>
					<div class="flex items-center gap-3 self-start text-[#ffbd59]">
						<TriangleAlert size={18} strokeWidth={2.25} aria-hidden="true" />
						<h3 class="m-0 text-[.78rem] font-semibold">Điểm dễ vướng</h3>
					</div>
					<p class="m-0 max-w-[43rem] text-[.93rem] leading-[1.75] text-[#c6d1de]">
						{evaluation.challenge}
					</p>
				</div>
			</div>

			<div
				class="mt-[clamp(2rem,4vw,3.5rem)] grid gap-5 bg-lime p-[clamp(1.25rem,3vw,2rem)] text-[#071006] min-[680px]:grid-cols-[3rem_minmax(0,1fr)] min-[680px]:items-start"
			>
				<span class="grid size-11 place-items-center border border-[#071006]/25" aria-hidden="true">
					<Route size={21} strokeWidth={2.3} />
				</span>
				<div>
					<h3 class="m-0 text-[.82rem] font-extrabold">Việc nên thử tiếp theo</h3>
					<p class="mt-2 mb-0 max-w-[48rem] text-[.94rem] leading-[1.7] font-medium">
						{evaluation.improvement}
					</p>
				</div>
			</div>
		</article>

		<aside
			class="border-t border-white/14 bg-[linear-gradient(160deg,rgb(12_25_48),rgb(6_13_26))] p-[clamp(1.4rem,3vw,2.5rem)] min-[900px]:border-t-0 min-[900px]:border-l"
			aria-label="Bằng chứng và điểm chính"
		>
			<p class="m-0 text-[.72rem] font-semibold text-[#8caaf8]">Dấu hiệu quan sát được trong VR</p>
			<blockquote
				class="mt-6 mb-0 border-l-2 border-lime pl-5 text-[clamp(1rem,1.5vw,1.2rem)] leading-[1.75] font-medium text-[#ecf2f8]"
			>
				{evaluation.evidence}
			</blockquote>

			<dl class="mt-[clamp(3rem,6vw,5.5rem)] mb-0">
				<div class="border-t border-white/16 py-6">
					<dt class="text-[.7rem] text-[#91a0b4]">Điểm mạnh nên giữ</dt>
					<dd
						class="mt-2 ml-0 text-[clamp(1.05rem,1.7vw,1.35rem)] leading-[1.45] font-semibold text-lime"
					>
						{evaluation.strengthLabel}
					</dd>
				</div>
				<div class="border-y border-white/16 py-6">
					<dt class="text-[.7rem] text-[#91a0b4]">Điểm cần luyện</dt>
					<dd
						class="mt-2 ml-0 text-[clamp(1.05rem,1.7vw,1.35rem)] leading-[1.45] font-semibold text-[#ffcf86]"
					>
						{evaluation.developmentLabel}
					</dd>
				</div>
			</dl>
		</aside>
	</div>
</section>
