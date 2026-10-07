# DESMAP

DESMAP is a SvelteKit application for AI × VR career orientation. The interface covers the landing experience, a 101-question career questionnaire, a local profile view, and a career library. Completed questionnaire submissions are saved in the browser before the server stores them in MongoDB.

## Run locally

```sh
pnpm install
pnpm dev
```

The development server defaults to `http://localhost:5173/`.

Copy `.env.example` to `.env` when local configuration is needed. AI remains enabled for initial assessments by default. For deterministic assessment tests that must not contact AI, set:

```env
DISABLE_AI_INIT_ASSESSMENT=true
```

Missing, `false`, or invalid values keep the AI path enabled.

Set the private OpenRouter key in `.env`. The server requests 18 DESMAP interpretation points and narrative explanations for three careers. Career selection uses the shared 68-career catalog built from O*NET® 30.2 data (CC BY 4.0): profile-shape correlation on 22 grouped scores, distance to O*NET work values on the six Desire scores, and a penalty for low scores on core requirements. It is limited to the selected career interests (all careers when exploring) and uses no VR evidence for the initial assessment. AI writes evidence-based Vietnamese prose, with a constructive explanation generated from the scored facts when its answer lacks supporting evidence. Career descriptions retain their natural sentence count up to 1200 characters. The model and provider retry behavior remain unchanged. See [career ranking](docs/career-ranking.md) for the formula, matrix audit and final-assessment behavior.

```env
OPENROUTER_API_KEY=your-openrouter-key
```

Set the private MongoDB connection values in `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DATABASE=desmap
```

The application writes to the `questionnaire_submissions` collection. It creates unique indexes for normalized participant email addresses and assessment identifiers. After AI analysis, the browser keeps the validated response in `sessionStorage` and synchronizes its six DESMAP insights and career suggestions into the submission's `initialEvaluation` field. If MongoDB is temporarily unavailable, the browser result remains visible and synchronization is retried when the evaluation page opens again.

## Deploy to Vercel

The project uses `@sveltejs/adapter-vercel`, Node.js 24, and pnpm 12. Configure these private
environment variables for both Preview and Production before deploying:

```env
OPENROUTER_API_KEY=your-openrouter-key
DISABLE_AI_INIT_ASSESSMENT=false
MONGODB_URI=mongodb+srv://...
MONGODB_DATABASE=desmap
```

If the deployment should use the built-in weighted calculation without AI interpretations, set
`DISABLE_AI_INIT_ASSESSMENT=true`; `OPENROUTER_API_KEY` is then optional. Use a MongoDB deployment that
accepts connections from Vercel Functions. Keep the database and functions in nearby regions where
possible.

Run the production checks with:

```sh
pnpm check
pnpm build
pnpm preview
```

If the local pnpm wrapper asks to recreate `node_modules` in a non interactive shell, run `pnpm install` first, then invoke the installed binaries directly:

```powershell
.\node_modules\.bin\svelte-check.cmd --tsconfig .\tsconfig.json
.\node_modules\.bin\vite.cmd build
```

## Frontend integration points

- The questionnaire source of truth lives in `src/lib/questionnaire/`; its dimension counts total 101 questions across D, E, S, M, A, and P.
- Browser persistence and MongoDB synchronization are handled by the questionnaire modules under `src/lib/`. MongoDB credentials remain in server-only code.
- The initial evaluation uses grouped questionnaire scores for DeepSeek V4.1 Flash interpretations, deterministic career selection, and evidence-based exploratory descriptions through server-only OpenRouter calls. The primary career description has 3-4 short sentences and each alternative has 2-3, including grounded fallback descriptions; older saved prose is shortened by complete sentences for display. Invalid text is retried with the same model; career descriptions that remain invalid use the selected career's questionnaire evidence and exploratory activity. It does not show weighted career-match percentages. The final evaluation is loaded separately when VR evidence exists.
- The `/experiences` route is a frontend career library. Replace the local role data with a CMS or API response when the catalog is ready.
- `/questionnaire` and `/evaluation` are the primary CTA destinations from the shared landing header and footer.

The visual references used for QA remain in the ignored `tmp/pdfs/` folder. Shipped raster artwork is kept under `static/desmap/`.
