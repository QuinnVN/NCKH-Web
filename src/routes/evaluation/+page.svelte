<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import { ArrowRight, RefreshCw } from '@lucide/svelte';
	import FinalBehaviourComparison from '$lib/components/FinalBehaviourComparison.svelte';
	import FinalCareerSuggestions from '$lib/components/FinalCareerSuggestions.svelte';
	import FinalDimensionDetails from '$lib/components/FinalDimensionDetails.svelte';
	import FinalDesmapRadar from '$lib/components/FinalDesmapRadar.svelte';
	import FinalUserEvaluation from '$lib/components/FinalUserEvaluation.svelte';
	import FinalEvaluationSkeleton from '$lib/components/FinalEvaluationSkeleton.svelte';
	import Header from '$lib/components/Header.svelte';
	import {
		evaluationPageState,
		experiences,
		placeholderBehaviourComparison,
		placeholderFinalEvaluation,
		type FinalAssessment
	} from '$lib/evaluation';
	import {
		browserAssessmentStorage,
		InitialAssessmentError,
		runInitialAssessment,
		uploadInitialAssessment,
		type AssessmentErrorKind,
		type InitialAssessmentResponse
	} from '$lib/assessment';
	import {
		buildCompletionPayload,
		desmapQuestions,
		readCompletionPayload,
		readQuestionnaireSyncStatus,
		uploadQuestionnaireSubmission,
		type QuestionnaireAnswers,
		type QuestionnaireSubmission,
		type QuestionnaireSyncStatus
	} from '$lib/questionnaire';

	let { data }: PageProps = $props();

	let payload = $state<QuestionnaireSubmission | null>(null);
	let response = $state<InitialAssessmentResponse | null>(null);
	let viewState = $state<'loading' | 'success' | 'error' | 'empty'>('loading');
	let errorKind = $state<AssessmentErrorKind | null>(null);
	let errorMessage = $state('');
	let requestInFlight = $state(false);
	let syncStatus = $state<QuestionnaireSyncStatus | null>(null);
	let syncInFlight = $state(false);
	let initialSyncTask: Promise<void> | null = null;
	let initialSynced = false;
	let dimensionsExpanded = $state(false);
	let finalAssessmentResult = $state<FinalAssessment | null>(null);
	let finalLookupCompleted = $state(false);
	let finalLookupPending = $derived(!finalLookupCompleted);
	let finalAssessment = $derived(
		finalAssessmentResult ??
			(data.previewFinal && payload ? createPreviewFinalAssessment(payload) : null)
	);
	let pageState = $derived(evaluationPageState(payload, finalAssessment));
	let topCareerId = $derived(response?.career_suggestions?.[0]?.id);
	const target = $derived(
		topCareerId ? experiences.find((experience) => experience.slug === topCareerId) : null
	);

	function createPreviewFinalAssessment(submission: QuestionnaireSubmission): FinalAssessment {
		return {
			version: 1,
			assessmentId: submission.assessmentId,
			completedAt: submission.completedAt,
			stageAssessments: {
				D: 'Dữ liệu phân tích cho thấy bạn quan tâm đến công việc có mục tiêu rõ ràng, tạo ra kết quả có thể nhìn thấy và cho phép bạn hiểu ý nghĩa của phần việc mình đảm nhận. Bạn có xu hướng gắn bó tốt hơn khi biết vì sao nhiệm vụ quan trọng và nó đóng góp thế nào vào kết quả chung.\n\nKhi phải chọn giữa nhiều hướng đi, bạn nên so sánh từng lựa chọn với các giá trị mình coi trọng, thay vì chỉ dựa vào cảm hứng nhất thời. Cách này sẽ giúp bạn nhận ra môi trường phù hợp và tránh theo đuổi một vai trò hấp dẫn bề ngoài nhưng không đáp ứng nhu cầu lâu dài.',
				E: 'Nhận định mẫu của AI về chuyên môn và các điểm mạnh của bạn sẽ được hiển thị tại đây.',
				S: 'Nhận định mẫu của AI về cách bạn phối hợp với người khác sẽ được hiển thị tại đây.',
				M: 'Nhận định mẫu của AI về cách bạn phân tích và ra quyết định sẽ được hiển thị tại đây.',
				A: 'Nhận định mẫu của AI về cách bạn thích ứng với thay đổi sẽ được hiển thị tại đây.',
				P: 'Nhận định mẫu của AI về phản ứng của bạn khi chịu áp lực sẽ được hiển thị tại đây.'
			},
			careerSuggestions: [
				{
					id: 'doctor',
					name: 'Bác sĩ',
					compatibilityPercent: 86,
					description:
						'Đây là hướng phù hợp nhất khi đối chiếu kết quả tự đánh giá với hành vi của bạn trong VR. Hồ sơ DESMAP cho thấy bạn có xu hướng phân tích thông tin trước khi hành động, còn trong trải nghiệm bạn đã kiểm tra các dữ kiện chính trước khi chọn thứ tự ưu tiên. Cách làm này hỗ trợ việc đánh giá tình huống và đưa ra quyết định có căn cứ trong công việc y khoa.\n\nBạn vẫn cần rèn khả năng chốt ưu tiên khi thời gian bị giới hạn. Hãy bắt đầu bằng các bài tập tình huống ngắn, xác định việc quan trọng nhất trước, sau đó xin phản hồi về quyết định của mình.'
				},
				{
					id: 'teacher',
					name: 'Giáo viên',
					compatibilityPercent: 79,
					description:
						'Khả năng giải thích vấn đề và điều chỉnh cách xử lý theo thông tin mới cũng phù hợp với công việc giảng dạy.'
				},
				{
					id: 'lawyer',
					name: 'Luật sư',
					compatibilityPercent: 73,
					description:
						'Tư duy phân tích và thói quen kiểm tra dữ kiện là nền tảng phù hợp để bạn tiếp tục khám phá ngành luật.'
				},
				{
					id: 'engineer',
					name: 'Kỹ sư',
					compatibilityPercent: 70,
					description:
						'Bạn có thói quen phân tích vấn đề theo từng bước và kiểm tra kết quả trước khi quyết định.'
				},
				{
					id: 'researcher',
					name: 'Nhà nghiên cứu',
					compatibilityPercent: 68,
					description:
						'Sự tò mò và cách tìm căn cứ trước khi kết luận có thể hữu ích trong môi trường nghiên cứu.'
				},
				{
					id: 'designer',
					name: 'Nhà thiết kế',
					compatibilityPercent: 65,
					description:
						'Bạn có thể thử những công việc cần quan sát nhu cầu của người dùng và điều chỉnh giải pháp.'
				},
				{
					id: 'analyst',
					name: 'Chuyên viên phân tích dữ liệu',
					compatibilityPercent: 62,
					description:
						'Việc đọc dữ kiện, nhận ra điểm bất thường và trình bày kết luận là những năng lực đáng để khám phá thêm.'
				}
			]
		};
	}

	async function loadAssessment(retry = false) {
		if (requestInFlight || !payload) return;
		requestInFlight = true;
		initialSynced = false;
		viewState = 'loading';
		response = null;
		errorKind = null;
		errorMessage = '';
		try {
			const result = await runInitialAssessment(payload, {
				storage: browserAssessmentStorage(),
				skipCache: retry,
				mode: data.initialAssessmentMode
			});
			if (!result.response.stage_insights || !result.response.career_suggestions?.length) {
				throw new InitialAssessmentError(
					data.initialAssessmentMode === 'weighted' ? 'configuration' : 'invalid-response',
					data.initialAssessmentMode === 'weighted'
						? 'Chế độ thử nghiệm không tạo nhận định AI. Hãy bật phân tích AI.'
						: 'Chưa có đủ nhận định DESMAP và gợi ý nghề từ AI. Hãy thử lại.'
				);
			}
			response = result.response;
			viewState = 'success';
			void syncInitialAssessment();
		} catch (error) {
			viewState = 'error';
			errorKind = error instanceof InitialAssessmentError ? error.kind : 'invalid-response';
			errorMessage =
				error instanceof InitialAssessmentError
					? error.message
					: 'Đã xảy ra lỗi khi chuẩn bị đánh giá.';
		} finally {
			requestInFlight = false;
		}
	}

	async function syncInitialAssessment(retryAfterPending = false) {
		if (
			data.initialAssessmentMode !== 'ai' ||
			!response?.career_suggestions?.length ||
			initialSynced
		)
			return;
		if (initialSyncTask) {
			await initialSyncTask;
			if (initialSynced || !retryAfterPending) return;
		}
		const assessment = response;
		initialSyncTask = (async () => {
			initialSynced = await uploadInitialAssessment(assessment);
		})().finally(() => {
			initialSyncTask = null;
		});
		await initialSyncTask;
	}

	async function syncSubmission() {
		if (!payload || syncInFlight) return;
		syncInFlight = true;
		syncStatus = { assessmentId: payload.assessmentId, status: 'pending' };
		syncStatus = await uploadQuestionnaireSubmission(payload);
		syncInFlight = false;
		if (syncStatus.status !== 'synced') return;
		void syncInitialAssessment(true);
		// A submission synced only now may already have a final assessment in MongoDB.
		if (!finalAssessmentResult) void refreshFinalAssessment();
	}

	/** Looks up the final assessment fresh on every visit; a database outage keeps the initial view. */
	async function fetchFinalAssessment(assessmentId: string): Promise<FinalAssessment | null> {
		try {
			const result = await fetch('/api/final-evaluations', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ assessmentId })
			});
			if (!result.ok) return null;
			const body = (await result.json()) as { finalAssessment?: FinalAssessment | null };
			return body.finalAssessment?.assessmentId === assessmentId ? body.finalAssessment : null;
		} catch {
			return null;
		}
	}

	async function refreshFinalAssessment() {
		if (!payload) return;
		const result = await fetchFinalAssessment(payload.assessmentId);
		if (!result) return;
		finalAssessmentResult = result;
		viewState = 'success';
	}

	onMount(() => {
		void initializeAssessment();
	});

	async function initializeAssessment() {
		payload = readCompletionPayload();
		if (!payload && data.previewFinal) {
			payload = buildCompletionPayload({
				answers: Object.fromEntries(
					desmapQuestions.map((question) => [question.id, 'B'])
				) as QuestionnaireAnswers,
				careerInterests: ['health-wellbeing'],
				startedAt: new Date().toISOString(),
				participant: { name: 'Bản xem trước', email: 'preview@example.com' }
			});
			finalLookupCompleted = true;
			viewState = 'success';
			return;
		}
		if (!payload) {
			viewState = 'empty';
			finalLookupCompleted = true;
		} else {
			syncStatus = readQuestionnaireSyncStatus(payload.assessmentId);
			if (
				!syncStatus ||
				syncStatus.status === 'pending' ||
				(syncStatus.status === 'error' && syncStatus.recoverable)
			)
				void syncSubmission();
			// The post-sync refresh may finish first; never replace its result with null.
			finalAssessmentResult =
				(await fetchFinalAssessment(payload.assessmentId)) ?? finalAssessmentResult;
			finalLookupCompleted = true;
			if (evaluationPageState(payload, finalAssessment) === 'final') viewState = 'success';
			else void loadAssessment();
		}
	}
</script>

<svelte:head>
	<title>{pageState === 'final' ? 'Đánh giá cuối cùng' : 'Phân tích DESMAP ban đầu'} | DESMAP</title
	>
	<meta
		name="description"
		content={pageState === 'final'
			? 'Đánh giá cuối cùng kết hợp hồ sơ DESMAP và bằng chứng quan sát.'
			: 'Phân tích DESMAP ban đầu từ câu trả lời của bạn.'}
	/>
</svelte:head>

<Header showBack />
<main
	class={[
		'min-h-dvh py-[clamp(2.2rem,5vw,5rem)] pb-16 text-[#f7f9fb]',
		pageState === 'final' || finalLookupPending
			? 'final-evaluation-page-gradient'
			: 'evaluation-page-gradient'
	]}
>
	<div class="mx-auto w-[min(90rem,calc(100%_-_4rem))] max-[640px]:w-[calc(100%_-_1.4rem)]">
		{#if pageState !== 'final' && !finalLookupPending}
			<section class="border-b border-white/14 py-12">
				<p class="m-0 text-[.68rem] font-[760] tracking-[.16em] text-lime uppercase">
					02 / ĐÁNH GIÁ BAN ĐẦU
				</p>
				<h1
					class="mt-3 mb-4 max-w-[820px] text-[clamp(2.5rem,7vw,5.8rem)] leading-[.92] font-[760] tracking-[-.065em]"
				>
					Phân tích DESMAP
				</h1>
				<p class="m-0 max-w-[760px] text-[1.05rem] leading-[1.55] text-[#91a0b4]">
					Nhận định dựa trên câu trả lời của bạn trong bảng câu hỏi. Kết quả này chưa bao gồm quan
					sát trong trải nghiệm VR và chưa phải đánh giá cuối cùng.
				</p>
			</section>
		{/if}

		{#if syncStatus?.status === 'pending'}
			<p class="sr-only" aria-live="polite" role="status">Đang đồng bộ kết quả lên máy chủ.</p>
		{:else if syncStatus?.status === 'error'}
			<section
				class="mt-8 border border-[#f5ba66] bg-[#181106] p-8"
				aria-live="assertive"
				role="alert"
			>
				<h2 class="mt-0">Chưa thể đồng bộ kết quả</h2>
				<p class="text-[#d9c8ad]">
					{syncStatus.message ?? 'Không thể gửi kết quả lên máy chủ.'} Bảng câu hỏi của bạn vẫn được lưu
					trên thiết bị.
				</p>
				{#if syncStatus.recoverable}
					<button
						class="inline-flex cursor-pointer items-center gap-2 border border-lime bg-lime px-5 py-3 font-bold text-[#061006] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime disabled:cursor-wait disabled:opacity-60"
						type="button"
						onclick={() => void syncSubmission()}
						disabled={syncInFlight}
					>
						<RefreshCw class="size-4" aria-hidden="true" /> Thử lại
					</button>
				{/if}
			</section>
		{/if}

		{#if viewState === 'empty'}
			<section class="mt-8 border border-blue bg-[#071020] p-8" aria-live="polite">
				<h2 class="mt-0">Chưa có bảng câu hỏi đã hoàn tất</h2>
				<p>Hãy hoàn tất bảng câu hỏi để tạo đối chiếu nghề nghiệp ban đầu.</p>
				<a
					class="inline-flex border border-lime bg-lime px-5 py-3 font-bold text-[#061006] no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime"
					href={resolve('/questionnaire')}>Đến bảng câu hỏi</a
				>
			</section>
		{:else if finalLookupPending}
			<FinalEvaluationSkeleton />
		{:else if viewState === 'loading'}
			<section class="py-[clamp(2.5rem,5vw,4.5rem)]">
				<p class="text-[#91a0b4]" aria-live="polite" role="status">
					Đang phân tích các nhóm DESMAP và chuẩn bị gợi ý nghề từ câu trả lời của bạn...
				</p>
				<div
					class="mt-8 grid items-center gap-10 min-[760px]:grid-cols-[minmax(16rem,24rem)_1fr]"
					aria-hidden="true"
				>
					<div
						class="mx-auto aspect-square w-[min(100%,22rem)] animate-pulse rounded-full border border-blue/40 bg-blue/10 motion-reduce:animate-none"
					></div>
					<div class="space-y-5">
						<div
							class="h-8 w-52 max-w-full animate-pulse bg-blue/20 motion-reduce:animate-none"
						></div>
						<div
							class="h-4 w-full max-w-[44rem] animate-pulse bg-blue/20 motion-reduce:animate-none"
						></div>
						<div
							class="h-4 w-4/5 max-w-[36rem] animate-pulse bg-blue/20 motion-reduce:animate-none"
						></div>
						<div
							class="h-28 w-full max-w-[44rem] animate-pulse border-l border-lime/50 bg-blue/10 motion-reduce:animate-none"
						></div>
					</div>
				</div>
				<div class="mt-12 space-y-4 border-t border-white/14 pt-8" aria-hidden="true">
					<div
						class="h-7 w-64 max-w-full animate-pulse bg-blue/20 motion-reduce:animate-none"
					></div>
					<div
						class="h-4 w-full max-w-[40rem] animate-pulse bg-blue/20 motion-reduce:animate-none"
					></div>
					<div class="h-24 w-full animate-pulse bg-blue/10 motion-reduce:animate-none"></div>
				</div>
			</section>
		{:else if viewState === 'error'}
			<section
				class="mt-8 border border-[#f5ba66] bg-[#181106] p-8"
				aria-live="assertive"
				role="alert"
			>
				<h2 class="mt-0">Chưa thể tạo đánh giá ban đầu</h2>
				<p class="text-[#d9c8ad]">
					{errorMessage} Kết quả chỉ hiển thị sau khi AI phân tích xong.
				</p>
				{#if errorKind === 'recoverable' || errorKind === 'invalid-response'}
					<button
						class="inline-flex cursor-pointer items-center gap-2 border border-lime bg-lime px-5 py-3 font-bold text-[#061006] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime disabled:cursor-wait disabled:opacity-60"
						type="button"
						onclick={() => void loadAssessment(true)}
						disabled={requestInFlight}
					>
						<RefreshCw class="size-4" aria-hidden="true" /> Thử lại
					</button>
				{/if}
			</section>
		{:else if payload && (response || pageState === 'final')}
			<p class="sr-only" aria-live="polite" role="status">
				{pageState === 'final' ? 'Đã có đánh giá cuối cùng.' : 'Đã có phân tích DESMAP ban đầu.'}
			</p>
			{#if pageState === 'final' && finalAssessment}
				<div class="mx-auto max-w-[82rem]" aria-label="Kết quả đánh giá cuối cùng">
					<FinalUserEvaluation
						evaluation={finalAssessment.finalEvaluation ?? placeholderFinalEvaluation}
					/>
					<nav
						class="sticky top-[4.15rem] z-20 -mx-3 flex [scrollbar-width:none] gap-1 overflow-x-auto border-y border-white/14 bg-[#050b17]/95 px-3 py-3 text-[.75rem] backdrop-blur-sm min-[760px]:gap-3 min-[760px]:text-[.82rem] min-[761px]:top-[4.5rem] [&::-webkit-scrollbar]:hidden"
						aria-label="Các phần trong đánh giá cuối cùng"
					>
						{#if finalAssessment.careerSuggestions?.length}
							<a
								class="shrink-0 px-2 py-2 text-white/80 no-underline hover:text-lime min-[760px]:px-3"
								href="#goi-y-nghe">Gợi ý nghề</a
							>
						{/if}
						<a
							class="shrink-0 px-2 py-2 text-white/80 no-underline hover:text-lime min-[760px]:px-3"
							href="#doi-chieu-hanh-vi">Đối chiếu hành vi</a
						>
						<a
							class="shrink-0 px-2 py-2 text-white/80 no-underline hover:text-lime min-[760px]:px-3"
							href="#phan-tich-desmap">Phân tích DESMAP</a
						>
					</nav>
					{#if finalAssessment.careerSuggestions?.length}
						<div
							id="goi-y-nghe"
							class="scroll-mt-36 border-b border-white/14 py-[clamp(2.5rem,5vw,4.5rem)]"
						>
							<FinalCareerSuggestions suggestions={finalAssessment.careerSuggestions} />
						</div>
					{/if}
					<div
						id="doi-chieu-hanh-vi"
						class="scroll-mt-36 border-b border-white/14 py-[clamp(2.5rem,5vw,4.5rem)]"
					>
						<FinalBehaviourComparison
							comparison={finalAssessment.behaviourComparison ?? placeholderBehaviourComparison}
						/>
					</div>
					<div id="phan-tich-desmap" class="scroll-mt-36 py-[clamp(2.5rem,5vw,4.5rem)]">
						<div class="min-w-0">
							<FinalDesmapRadar
								scores={payload.scores}
								assessments={finalAssessment.stageAssessments}
							/>
							<FinalDimensionDetails
								scores={payload.scores}
								levels={finalAssessment.dimensionLevels}
								expanded={dimensionsExpanded}
								ontoggle={() => (dimensionsExpanded = !dimensionsExpanded)}
							/>
						</div>
					</div>
				</div>
			{:else}
				<section class="py-[clamp(2.5rem,5vw,4.5rem)]" aria-label="Phân tích DESMAP ban đầu">
					<FinalDesmapRadar scores={payload.scores} insights={response?.stage_insights} initial />
					{#if response?.career_suggestions?.length}
						<div
							class="mt-[clamp(2rem,4vw,4rem)] border-t border-white/14 py-[clamp(2.5rem,5vw,4.5rem)]"
						>
							<FinalCareerSuggestions suggestions={response.career_suggestions} initial />
						</div>
					{/if}
					<FinalDimensionDetails
						scores={payload.scores}
						expanded={dimensionsExpanded}
						ontoggle={() => (dimensionsExpanded = !dimensionsExpanded)}
					/>
				</section>
			{/if}

			<section
				class={`flex flex-wrap items-center justify-between gap-5 ${pageState === 'final' ? 'mx-auto max-w-[82rem] border-t border-white/14 py-8' : 'mt-4 border border-blue bg-[#071020] p-6'}`}
			>
				<div>
					{#if pageState === 'final'}
						<h2 class="mt-0 mb-1 text-lg font-bold">Đánh giá đã hoàn tất</h2>
						<p class="m-0 max-w-[34rem] text-[.83rem] text-[#91a0b4]">
							Bạn có thể quay lại từng phần ở trên hoặc tải dữ liệu đánh giá.
						</p>
					{:else if data.initialAssessmentMode === 'ai'}
						<h2 class="mt-0 mb-1 text-lg font-bold">Bước tiếp theo</h2>
						<p class="m-0 max-w-[34rem] text-[.83rem] text-[#91a0b4]">
							Bạn có thể khám phá nghề được gợi ý đầu tiên hoặc lưu kết quả này.
						</p>
					{:else}
						<h2 class="mt-0 mb-1 text-lg font-bold">Cảm ơn bạn vì đã tham gia bài test này.</h2>
						<p class="m-0 max-w-[34rem] text-[.83rem] text-[#91a0b4]">
							Để nhận được kết quả chính xác nhất và gợi ý nghề nghiệp phù hợp, hãy tới buổi trải
							nghiệm bằng VR của tụi mình!
						</p>
					{/if}
				</div>
				<div class="flex flex-wrap items-center gap-4">
					{#if pageState === 'final'}
						<!-- The final assessment has no career-experience action. -->
					{:else if target?.status === 'locked'}
						<button
							class="border border-blue px-4 py-3 text-lime disabled:cursor-not-allowed disabled:opacity-70"
							type="button"
							disabled
						>
							{target.title}: Sắp ra mắt
						</button>
					{:else if target && data.initialAssessmentMode !== 'weighted'}
						<a
							class="inline-flex items-center gap-2 border border-lime bg-lime px-5 py-3 font-bold text-[#061006] no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime"
							href={resolve(`/experiences?career=${encodeURIComponent(target.slug)}`)}
						>
							Khám phá {target.title}<ArrowRight class="size-4" aria-hidden="true" />
						</a>
					{/if}
				</div>
			</section>
		{/if}
	</div>
</main>
