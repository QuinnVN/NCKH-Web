<script lang="ts">
	import {
		ArrowLeft,
		ArrowRight,
		BrainCircuit,
		CircleCheck,
		ClipboardList,
		Compass,
		Eye,
		Glasses,
		Lightbulb,
		ListChecks,
		MessageCircle,
		RefreshCw,
		RotateCcw,
		Shield,
		TrendingUp,
		Users
	} from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { carouselStops } from './carousel-stops';
	import type {
		BehaviourComparisonIcon,
		BehaviourComparisonKind,
		BehaviourComparisonResult
	} from '$lib/evaluation';

	let { comparison }: { comparison: BehaviourComparisonResult } = $props();
	let flippedIds = $state<string[]>([]);
	let track: HTMLDivElement | undefined;
	let activeIndex = $state(0);
	let hasOverflow = $state(false);
	let scrollStops = $state<number[]>([0]);
	let navigationTarget: number | null = null;

	const iconCopy: Record<BehaviourComparisonIcon, typeof CircleCheck> = {
		analysis: BrainCircuit,
		adaptability: RefreshCw,
		priority: ListChecks,
		communication: MessageCircle,
		collaboration: Users,
		creativity: Lightbulb,
		resilience: Shield,
		leadership: Compass
	};

	const kindCopy: Record<
		BehaviourComparisonKind,
		{
			label: string;
			cardType: string;
			symbol: string;
			frame: string;
			glow: string;
			face: string;
			ink: string;
			muted: string;
			art: string;
			back: string;
			backAccent: string;
			scrollbar: string;
			Icon: typeof CircleCheck;
		}
	> = {
		confirmed: {
			label: 'Điểm mạnh được xác nhận',
			cardType: 'Sở trường',
			symbol: '✚',
			frame: 'border-[#82e884]',
			glow: 'hover:shadow-[0_0_0_1px_#82e884,0_0_24px_#82e88499,0_18px_42px_rgb(0_0_0_/.28)]',
			face: 'bg-[#c8f593]',
			ink: 'text-[#173a23]',
			muted: 'text-[#315438]',
			art: 'bg-[radial-gradient(circle_at_50%_42%,#f4ffd8_0%,#9ee989_52%,#45ba90_100%)]',
			back: 'bg-[#123b31]',
			backAccent: 'text-[#c8f593]',
			scrollbar: '[scrollbar-color:#82e884_#123b31] [&::-webkit-scrollbar-thumb]:bg-[#82e884]',
			Icon: CircleCheck
		},
		emerging: {
			label: 'Điểm mạnh tiềm ẩn',
			cardType: 'Tiềm năng',
			symbol: '✦',
			frame: 'border-[#70dfff]',
			glow: 'hover:shadow-[0_0_0_1px_#70dfff,0_0_24px_#70dfff99,0_18px_42px_rgb(0_0_0_/.28)]',
			face: 'bg-[#a9e9f9]',
			ink: 'text-[#12375d]',
			muted: 'text-[#315975]',
			art: 'bg-[radial-gradient(circle_at_50%_42%,#f0fdff_0%,#8cddf1_48%,#6d8bdf_100%)]',
			back: 'bg-[#172f59]',
			backAccent: 'text-[#a9e9f9]',
			scrollbar: '[scrollbar-color:#70dfff_#172f59] [&::-webkit-scrollbar-thumb]:bg-[#70dfff]',
			Icon: Eye
		},
		development: {
			label: 'Điểm cần phát triển',
			cardType: 'Thử thách',
			symbol: '◆',
			frame: 'border-[#ffc47a]',
			glow: 'hover:shadow-[0_0_0_1px_#ffc47a,0_0_24px_#ffc47a99,0_18px_42px_rgb(0_0_0_/.28)]',
			face: 'bg-[#ffd19a]',
			ink: 'text-[#5d2b29]',
			muted: 'text-[#744439]',
			art: 'bg-[radial-gradient(circle_at_50%_42%,#fff2ce_0%,#ffbd84_48%,#ec7181_100%)]',
			back: 'bg-[#4e293d]',
			backAccent: 'text-[#ffd19a]',
			scrollbar: '[scrollbar-color:#ffc47a_#4e293d] [&::-webkit-scrollbar-thumb]:bg-[#ffc47a]',
			Icon: TrendingUp
		}
	};

	function flipCard(id: string) {
		flippedIds = flippedIds.includes(id)
			? flippedIds.filter((item) => item !== id)
			: [...flippedIds, id];
	}

	function syncCarousel() {
		if (!track) return;
		if (!hasOverflow) {
			navigationTarget = null;
			activeIndex = 0;
			return;
		}
		if (navigationTarget !== null) return;
		const left = track.scrollLeft;
		let closest = 0;
		let distance = Number.POSITIVE_INFINITY;
		for (const [index, stop] of scrollStops.entries()) {
			const nextDistance = Math.abs(stop - left);
			if (nextDistance < distance) {
				closest = index;
				distance = nextDistance;
			}
		}
		activeIndex = closest;
	}

	function showCard(index: number) {
		if (!track) return;
		const next = Math.max(0, Math.min(index, scrollStops.length - 1));
		const position = scrollStops[next];
		navigationTarget = next;
		activeIndex = next;
		track.scrollTo({
			left: position,
			behavior: prefersReducedMotion.current ? 'auto' : 'smooth'
		});
		if (prefersReducedMotion.current || Math.abs(track.scrollLeft - position) < 1)
			finishNavigation();
	}

	function finishNavigation() {
		if (navigationTarget === null) return;
		navigationTarget = null;
		syncCarousel();
	}

	function measureCarousel() {
		if (!track) return;
		const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
		scrollStops = carouselStops(
			Array.from(track.children, (card) => (card as HTMLElement).offsetLeft),
			maxScroll
		);
		hasOverflow = maxScroll > 2 && scrollStops.length > 1;
		syncCarousel();
	}

	function carousel(node: HTMLDivElement) {
		track = node;
		const observer = new ResizeObserver(measureCarousel);
		observer.observe(node);
		measureCarousel();
		return () => {
			observer.disconnect();
			navigationTarget = null;
			track = undefined;
		};
	}
</script>

<section class="min-w-0" aria-labelledby="behaviour-comparison-heading">
	<header class="flex flex-wrap items-end justify-between gap-5 pb-8">
		<div>
			<!-- <p class="m-0 text-[.78rem] font-semibold text-[#8caaf8]">Test và hành vi trong VR</p> -->
			<h2
				id="behaviour-comparison-heading"
				class="mt-2 mb-0 max-w-[26ch] text-[clamp(1.8rem,3vw,2.8rem)] leading-[1.15] font-bold tracking-[-.04em]"
			>
				Bạn nghĩ gì, bạn đã thể hiện thế nào?
			</h2>
			<p class="mt-4 mb-0 max-w-[65ch] text-[.9rem] leading-5 text-[#aeb9c8]">
				Kết quả tự đánh giá được đối chiếu với hành vi quan sát trong trải nghiệm {comparison.experienceName}.
			</p>
		</div>
		{#if comparison.isPlaceholder}
			<span class="border border-white/20 px-3 py-1.5 text-[.72rem] text-[#aeb9c8]"
				>Dữ liệu minh họa</span
			>
		{/if}
	</header>

	{#if comparison.findings.length > 0}
		<div class="mb-5 flex flex-wrap items-end justify-between gap-4">
			<div>
				{#if hasOverflow}
					<p class="mb-0 align-middle text-[.76rem] text-[#aeb9c8]">
						Dùng mũi tên để xem các thẻ tiếp theo.
					</p>
				{/if}
			</div>
			{#if hasOverflow}
				<nav class="flex items-center gap-3" aria-label="Chuyển thẻ đối chiếu">
					<!-- <span
						class="min-w-16 text-center text-[.78rem] font-semibold text-[#c6d4e7] tabular-nums"
						aria-live="polite"
					>
						{activeIndex + 1} / {scrollStops.length}
					</span> -->
					<button
						class="grid size-11 cursor-pointer place-items-center rounded-full border border-[#8caaf8] bg-[#152344] text-white hover:bg-[#26447d] disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/5 disabled:text-white/35"
						type="button"
						aria-label="Xem thẻ trước"
						disabled={activeIndex === 0}
						onclick={() => showCard(activeIndex - 1)}
						><ArrowLeft size={19} aria-hidden="true" /></button
					>
					<button
						class="grid size-11 cursor-pointer place-items-center rounded-full border border-lime bg-lime text-[#10200d] hover:bg-[#dcffac] disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/5 disabled:text-white/35"
						type="button"
						aria-label="Xem thẻ tiếp theo"
						disabled={activeIndex === scrollStops.length - 1}
						onclick={() => showCard(activeIndex + 1)}
						><ArrowRight size={19} aria-hidden="true" /></button
					>
				</nav>
			{/if}
		</div>
		<div
			{@attach (node) => untrack(() => carousel(node))}
			onscroll={syncCarousel}
			onscrollend={finishNavigation}
			class="relative flex snap-x snap-mandatory [scrollbar-width:none] items-start gap-2 overflow-x-auto overscroll-x-contain pb-4 [&::-webkit-scrollbar]:hidden"
			aria-label="Các thẻ đối chiếu hành vi"
		>
			{#each comparison.findings as finding, index (finding.id)}
				{@const copy = kindCopy[finding.kind]}
				{@const CardIcon = finding.icon ? iconCopy[finding.icon] : copy.Icon}
				{@const flipped = flippedIds.includes(finding.id)}
				<article
					class="w-[min(82vw,24rem)] shrink-0 snap-start p-3"
					aria-labelledby={`behaviour-card-title-${index}`}
				>
					<h3 id={`behaviour-card-title-${index}`} class="sr-only">{finding.title}</h3>
					<p id={`behaviour-card-description-${index}`} class="sr-only">
						{flipped
							? `${finding.questionnaireResult} ${finding.vrEvidence} ${finding.kind !== 'confirmed' && finding.remedy ? `Khắc phục: ${finding.remedy}` : ''}`
							: finding.summary}
					</p>
					<button
						type="button"
						class={`group relative block aspect-[2/3] min-h-[30rem] w-full cursor-pointer rounded-[1.15rem] border-[3px] border-[#06111b] bg-[#06111b] p-[5px] text-left shadow-[0_12px_28px_rgb(0_0_0_/.22)] transition-shadow duration-300 ease-out [perspective:1200px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime motion-reduce:transition-none ${copy.glow}`}
						aria-pressed={flipped}
						aria-label={`${finding.title}. ${flipped ? 'Lật về nhận định' : 'Lật xem căn cứ'}`}
						aria-describedby={`behaviour-card-description-${index}`}
						onclick={() => flipCard(finding.id)}
					>
						<span
							class={`relative block h-full min-h-[29rem] w-full rounded-[.8rem] transition-transform duration-700 ease-[cubic-bezier(.2,.7,.25,1)] [transform-style:preserve-3d] motion-reduce:transition-none ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
						>
							<span
								aria-hidden={flipped}
								class={`absolute inset-0 flex flex-col overflow-hidden rounded-[.8rem] border [backface-visibility:hidden] ${copy.frame} ${copy.face}`}
							>
								<span class={`flex flex-1 flex-col p-4 ${copy.ink}`}>
									<span class="flex items-start justify-between gap-3">
										<span class="flex flex-col"
											><span class="text-[2.2rem] leading-none" aria-hidden="true"
												>{copy.symbol}</span
											><span class="mt-1 text-[.67rem] font-extrabold">{copy.cardType}</span></span
										>
										<span class="max-w-[10rem] text-right text-[.72rem] leading-5 font-bold"
											>{copy.label}</span
										>
									</span>
									<span
										class={`relative mt-4 grid h-36 shrink-0 place-items-center overflow-hidden rounded-[.5rem] border-2 ${copy.frame} ${copy.art}`}
									>
										<span class={`absolute size-28 rounded-full border-2 ${copy.frame}`}></span>
										<span
											class={`absolute size-20 rotate-45 rounded-[1.2rem] border-2 ${copy.frame}`}
										></span>
										<CardIcon
											class="relative size-14 drop-shadow-[0_5px_10px_rgb(0_0_0_/.16)]"
											strokeWidth={1.5}
											aria-hidden="true"
										/>
										<span
											class="absolute inset-0 flex items-center justify-center gap-2 bg-[#09202d]/80 text-[.88rem] font-bold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
											><RotateCcw size={18} aria-hidden="true" /> Lật xem căn cứ</span
										>
									</span>
									<span class="mt-5 text-[1.5rem] leading-[1.12] font-semibold tracking-[-.035em]"
										>{finding.title}</span
									>
									<span class={`mt-2 text-[.84rem] leading-[1.55] ${copy.muted}`}
										>{finding.summary}</span
									>
									<span
										class="mt-auto rotate-180 self-end text-[2.2rem] leading-none"
										aria-hidden="true">{copy.symbol}</span
									>
								</span>
								<span
									class={`flex items-center justify-between gap-2 border-t px-4 py-3 text-[.75rem] font-bold ${copy.frame} ${copy.ink}`}
								>
									<span>Nhấp hoặc chạm để lật thẻ</span><RotateCcw size={16} aria-hidden="true" />
								</span>
							</span>

							<span
								aria-hidden={!flipped}
								class={`absolute inset-0 flex [transform:rotateY(180deg)] flex-col overflow-hidden rounded-[.8rem] border text-white [backface-visibility:hidden] ${copy.frame} ${copy.back}`}
							>
								<span
									class={`flex min-h-0 flex-1 [scrollbar-width:thin] flex-col overflow-y-auto p-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-black/25 ${copy.scrollbar}`}
								>
									<span class={`flex items-start justify-between gap-3 ${copy.backAccent}`}
										><span class="text-[2rem] leading-none" aria-hidden="true">{copy.symbol}</span
										><span class="text-right text-[.72rem] font-bold"
											>Mặt sau · {copy.cardType}</span
										></span
									>
									<span class="mt-5 text-[1.55rem] leading-[1.12] font-semibold tracking-[-.035em]"
										>{finding.title}</span
									>
									<span class={`mt-5 h-px w-full shrink-0 ${copy.face}`}></span>
									<span class="mt-5 block border border-white/25 bg-black/15 p-4">
										<span
											class={`flex items-center gap-2 text-[.75rem] font-bold ${copy.backAccent}`}
											><ClipboardList size={16} aria-hidden="true" />Bạn tự đánh giá</span
										>
										<span class="mt-2 block text-[.86rem] leading-[1.6] text-white/90"
											>{finding.questionnaireResult}</span
										>
									</span>
									<span class="mt-3 block border border-white/25 bg-black/15 p-4">
										<span
											class={`flex items-center gap-2 text-[.75rem] font-bold ${copy.backAccent}`}
											><Glasses size={16} aria-hidden="true" />Bạn thể hiện trong VR</span
										>
										<span class="mt-2 block text-[.86rem] leading-[1.6] text-white/90"
											>{finding.vrEvidence}</span
										>
									</span>
									{#if finding.kind !== 'confirmed' && finding.remedy}
										<span class="mt-3 block border border-white/25 bg-black/15 p-4">
											<span
												class={`flex items-center gap-2 text-[.75rem] font-bold ${copy.backAccent}`}
												><Lightbulb size={16} aria-hidden="true" />Khắc phục</span
											>
											<span class="mt-2 block text-[.86rem] leading-[1.6] text-white/90"
												>{finding.remedy}</span
											>
										</span>
									{/if}
									<span
										class={`mt-auto rotate-180 self-end pb-2 text-[2rem] leading-none ${copy.backAccent}`}
										aria-hidden="true">{copy.symbol}</span
									>
								</span>
								<span
									class={`flex items-center justify-between gap-2 border-t border-white/25 px-4 py-3 text-[.75rem] font-bold ${copy.backAccent}`}
									><span>Nhấp hoặc chạm để lật lại</span><RotateCcw
										size={16}
										aria-hidden="true"
									/></span
								>
							</span>
						</span>
					</button>
				</article>
			{/each}
		</div>
	{:else}
		<p class="border-t border-white/14 py-6 text-[#91a0b4]">Chưa có điểm đối chiếu để hiển thị.</p>
	{/if}

	<p class="mt-2 mb-0 text-[.78rem] leading-6 text-[#91a0b4]">
		Kết quả mô tả hành vi đã quan sát trong tình huống này. Đây không phải kết luận cố định về năng
		lực của bạn.
	</p>
</section>
