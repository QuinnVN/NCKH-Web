# Evaluation UI contract

The experience route remains frontend-only. `/evaluation` reads the questionnaire contract from `$lib/questionnaire` in `onMount`:

- `readCompletionPayload()` supplies a completed submission and score dimensions.

The initial assessment adapter in `$lib/assessment` sends the 28 grouped DESMAP scores to the same-origin proxy. The server ranks the 72 catalog careers using their individual criteria, then asks OpenRouter for 18 DESMAP interpretation points and free-form descriptions for three selected careers. Selected interests, fine scores and VR do not affect initial suggestions. Descriptions must cite questionnaire evidence and suggest a concrete exploratory activity; unsupported or negative prose is replaced by a grounded description. Cache keys include the ranking version, and the browser does not display compatibility percentages. The deterministic provisional-match test mode stays separate.

The final-evaluation loader checks participant identity before re-ranking legacy stored suggestions with questionnaire scores and completed VR rubric evidence. Only observed criteria contribute, and repeated runs are averaged within each game before combining experiences. It reads MongoDB without rewriting stored results. Updated generator results can retain AI descriptions when their ranking version, career IDs and percentages agree with the current calculation. The initial view shows three directions and the final view shows seven.

The scene crops in `assets/` are extracted from the supplied design reference for card imagery. Experience cards open accessible Bits UI detail dialogs and intentionally do not launch VR modules.
