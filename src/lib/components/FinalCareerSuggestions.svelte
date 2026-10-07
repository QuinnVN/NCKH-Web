<script lang="ts">
	import { Compass, Sparkles } from '@lucide/svelte';
	import { conciseCareerDescription } from '$lib/assessment/career-description';
	import OnetAttribution from './OnetAttribution.svelte';
	type CareerSuggestion = {
		id: string;
		name: string;
		description: string;
		compatibilityPercent?: number;
	};

	let { suggestions, initial = false }: { suggestions: CareerSuggestion[]; initial?: boolean } =
		$props();
	let visibleSuggestions = $derived(
		initial
			? suggestions
			: [...suggestions].sort(
					(a, b) => (b.compatibilityPercent ?? 0) - (a.compatibilityPercent ?? 0)
				)
	);
	let primarySuggestion = $derived(visibleSuggestions[0]);
	let otherSuggestions = $derived(visibleSuggestions.slice(1));
</script>

<section class="min-w-0" aria-labelledby="career-suggestions-heading">
	<header class="flex flex-wrap items-start justify-between gap-4 pb-8">
		<div>
			<div class="flex items-center gap-3">
				<h2
					class="m-0 text-[clamp(1.8rem,3vw,2.8rem)] font-bold tracking-[-.04em]"
					id="career-suggestions-heading"
				>
					Những nghề nên khám phá
				</h2>
			</div>
			<p class="mt-2 mb-0 text-[.85rem] leading-6 text-[#91a0b4]">
				{initial
					? 'Chỉ dựa trên kết quả bài test DESMAP. Đây là những hướng để bạn tìm hiểu thêm, chưa phải kết luận nghề nghiệp.'
					: 'Gợi ý dựa trên kết quả DESMAP và các tiêu chí đã được chấm trong VR. Bạn có thể dùng những hướng này để tìm hiểu và thử sức thêm.'}
			</p>
		</div>
	</header>

	<div>
		<div class="border-t border-white/20">
			{#if primarySuggestion}
				<article
					class="grid min-[820px]:grid-cols-[minmax(16rem,.75fr)_minmax(0,1.25fr)]"
					aria-labelledby={`primary-career-${primarySuggestion.id}`}
				>
					<div
						class="relative flex flex-col justify-between gap-8 border-b border-white/14 py-[clamp(1.5rem,3vw,2.5rem)] text-white min-[820px]:border-r min-[820px]:border-b-0 min-[820px]:pr-8"
					>
						<p class="m-0 inline-flex items-center gap-2 text-[.78rem] font-semibold text-lime">
							<Sparkles size={13} strokeWidth={2.4} aria-hidden="true" />
							{initial ? 'Nghề nên tìm hiểu trước' : 'Hướng nên khám phá trước'}
						</p>
						<h3
							class="m-0 max-w-[14ch] text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] font-[760] tracking-[-.05em]"
							id={`primary-career-${primarySuggestion.id}`}
						>
							{primarySuggestion.name}
						</h3>
					</div>
					<div
						class="flex flex-col justify-center py-[clamp(1.5rem,3vw,2.5rem)] text-[#dce5f0] min-[820px]:pl-[clamp(1.5rem,3vw,3rem)]"
					>
						<p class="m-0 text-[.78rem] font-semibold text-lime">
							{initial ? 'Vì sao đáng khám phá' : 'Gợi ý dành cho bạn'}
						</p>
						<p
							class="mt-4 mb-0 max-w-[72ch] text-[clamp(.92rem,1.4vw,1.04rem)] leading-[1.75] whitespace-pre-line"
						>
							{conciseCareerDescription(primarySuggestion.description, true)}
						</p>
					</div>
				</article>
			{/if}

			{#if otherSuggestions.length > 0}
				<section
					class="border-t border-white/14 py-[clamp(1.5rem,3vw,2.25rem)]"
					aria-labelledby="other-careers-heading"
				>
					<div class="mb-5 flex items-end justify-between gap-4">
						<div class="flex items-start gap-4">
							<span
								class="mt-1 grid size-9 flex-none place-items-center border border-blue/70 bg-blue/15 text-[#6f9bff]"
								aria-hidden="true"
							>
								<Compass size={18} strokeWidth={2.1} />
							</span>
							<div>
								<p class="m-0 text-[.72rem] font-semibold text-[#8caaf8]">Hướng tham khảo</p>
								<h3 class="mt-1 mb-0 text-[clamp(1.15rem,2vw,1.5rem)]" id="other-careers-heading">
									{initial
										? `${otherSuggestions.length === 2 ? 'Hai' : otherSuggestions.length} nghề khác để tìm hiểu`
										: `${otherSuggestions.length === 2 ? 'Hai' : otherSuggestions.length} hướng khác để khám phá`}
								</h3>
							</div>
						</div>
					</div>
					<ol class="m-0 list-none border-t border-white/14 p-0">
						{#each otherSuggestions as suggestion, index (suggestion.id)}
							<li
								class="grid gap-x-6 gap-y-2 border-b border-white/14 py-5 min-[760px]:grid-cols-[minmax(12rem,.55fr)_minmax(0,1fr)] min-[760px]:items-baseline"
							>
								<div class="flex items-baseline gap-4">
									<span class="w-6 flex-none text-[.75rem] font-semibold text-[#8caaf8]">
										{String(index + 1).padStart(1, '0')}
									</span>
									<h4 class="m-0 text-[clamp(1.15rem,2vw,1.5rem)] font-bold tracking-[-.025em]">
										{suggestion.name}
									</h4>
								</div>
								<p
									class="m-0 max-w-[72ch] text-[.88rem] leading-[1.7] text-[#b9c6d8] max-[759px]:pl-10"
								>
									{conciseCareerDescription(suggestion.description, false)}
								</p>
							</li>
						{/each}
					</ol>
				</section>
			{/if}
		</div>
	</div>
	<OnetAttribution class="mt-8 max-w-[72ch]" />
</section>
