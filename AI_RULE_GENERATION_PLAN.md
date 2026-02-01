# AI Rule Generation — Implementation Plan

## Summary

Add an "AI Generate" feature to the create-mutation page. Users upload an XLSX file, describe what they want in English, and the AI generates `TransformationRule[]` that slot directly into the existing rule builder. Uses Vercel AI SDK with Anthropic as default provider.

## What was discarded from AI_TRANSFORMATION_PLAN.md

- The `MutationConfig` / `FieldMapping` type system — conflicts with the existing rule-based model
- `GlobalTransform` / `FilterCondition` types — no matching engine support
- Standalone CSV/JSON/XLSX parsers — not needed yet; only XLSX metadata extraction is required
- The preview executor — already exists in the frontend
- Feedback loop (Phase 7) — premature

## What to keep / adapt

- **AI generation concept** — adapted to output existing `TransformationRule[]` instead of `MutationConfig`
- **File metadata extraction** — extract worksheet names, column headers, sample rows, inferred types
- **Natural language hints** — textarea for user to describe desired transformation
- **Reasoning/warnings** — AI explains each rule choice; warnings for uncertain mappings
- **Field-mapping system** — deferred as a future separate conversion type

---

## Implementation Steps

### 1. Add dependencies

**File:** `apps/api/package.json`
- Add `ai` (Vercel AI SDK) and `@ai-sdk/anthropic`

### 2. Add environment config

**File:** `apps/api/src/config.ts`
- Add `ANTHROPIC_API_KEY`, `AI_PROVIDER` (anthropic|openai), `AI_MODEL` (default claude-sonnet-4-20250514)

### 3. Schema extractor service

**New file:** `apps/api/src/services/ai/schema-extractor.ts`
- `extractFileMetadata(buffer, fileName)` → `FileMetadata`
- Extracts per-worksheet: name, row/column counts, column headers, inferred types, sample values (first 10 rows), merged cells flag, formulas flag
- Uses existing `xlsx` package already in API deps

### 4. AI provider factory

**New file:** `apps/api/src/services/ai/provider.ts`
- `getAIModel()` returns Vercel AI SDK model instance based on config
- Supports Anthropic and OpenAI providers

### 5. Rule generator service (core)

**New file:** `apps/api/src/services/ai/rule-generator.ts`
- `generateRules({ fileMetadata, userPrompt, conversionType })` → `{ rules, reasoning, warnings }`
- Uses Vercel AI SDK `generateObject` with Zod schema from `apps/api/src/schemas/configuration.ts`
- System prompt documents all 8 rule types with exact param shapes and ordering guidance
- Post-processing: assign `nanoid()` IDs, validate column references against metadata, build warnings
- 45s timeout, no retries

### 6. API endpoint

**New file:** `apps/api/src/routes/v1/ai.ts`
- `POST /v1/ai/generate-rules` — multipart (file + prompt + conversionType)
- Auth required (session-based, same pattern as other routes)
- Returns `{ success: true, data: { rules, reasoning, warnings } }`

**Modify:** `apps/api/src/routes/v1/index.ts` — register `aiRoutes` at `/v1/ai`

### 7. Frontend API client

**New file:** `apps/web/src/api/ai.ts`
- `aiApi.generateRules(file, prompt)` — sends FormData via axios, 60s timeout
- Returns typed `{ rules: TransformationRule[], reasoning: string, warnings: string[] }`

### 8. AI generator component

**New file:** `apps/web/src/components/ai-rule-generator.tsx`
- Props: `uploadedFile: UploadedFile | null`, `onRulesGenerated: (rules) => void`
- Shows: file info summary, textarea for prompt, generate button, loading/success/error states
- Displays reasoning and warnings after generation
- Confirmation before overwriting existing rules
- Uses `useMutation` from TanStack Query

### 9. Integrate into create-mutation page

**Modify:** `apps/web/src/components/mutations/create-mutation.tsx`
- Add `AiRuleGenerator` in the right sidebar between Configuration and JSON Configuration cards
- Wire `onRulesGenerated` to the existing `setRules` state setter

---

## Key Files Referenced

| File | Role |
|------|------|
| `packages/core/src/types.ts` | Canonical `TransformationRule` types (lines 26-108) |
| `apps/api/src/schemas/configuration.ts` | Zod `transformationRuleSchema` for AI output validation |
| `apps/api/src/routes/v1/mutate.ts` | Reference for multipart upload handling pattern |
| `apps/web/src/components/mutations/create-mutation.tsx` | Integration point for AI component |
| `apps/web/src/components/file-upload.tsx` | Existing file upload component (reused as-is) |
| `apps/api/src/config.ts` | Environment config to extend |
| `apps/api/src/routes/v1/index.ts` | Route registration |

## New Files

| File | Purpose |
|------|---------|
| `apps/api/src/services/ai/schema-extractor.ts` | XLSX metadata extraction |
| `apps/api/src/services/ai/provider.ts` | AI provider factory |
| `apps/api/src/services/ai/rule-generator.ts` | Core AI generation service |
| `apps/api/src/routes/v1/ai.ts` | API endpoint |
| `apps/web/src/api/ai.ts` | Frontend API client |
| `apps/web/src/components/ai-rule-generator.tsx` | UI component |

## Future: Field-Mapping System (Phase 2, not implemented now)

Add `XLSX_TO_CSV_MAPPED` conversion type with a `FieldMapping[]` config stored alongside rules. Separate conversion service in the factory. Separate UI (mapping table editor). AI can also generate field mappings with a different prompt/schema. Does not touch the existing rule-based system.
