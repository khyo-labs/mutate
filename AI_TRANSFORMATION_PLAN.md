# AI Transformation Config Generator — Implementation Plan

## Context

Mutate is a data transformation platform where users create "mutations" (saved transformation configurations) that can be applied to files repeatedly via API. The core loop is: upload file → apply mutation → get transformed output.

## Goal

Build a feature where users can provide a **source file sample** and a **target schema** (or example output), and AI generates the transformation config automatically. This eliminates manual config authoring and dramatically lowers the barrier to creating mutations.

## High-Level Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Source Sample  │────▶│  AI Generation  │────▶│ MutationConfig  │
│  (file upload)  │     │    Service      │     │    (draft)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              ▲
                              │
                        ┌─────────────────┐
                        │  Target Schema  │
                        │  (user-defined) │
                        └─────────────────┘
```

---

## Phase 1: Define the MutationConfig Schema

Before AI can generate configs, we need a well-defined schema it can output.

### Task 1.1: Design the MutationConfig type

Create a schema that covers common transformation operations:

```typescript
// src/types/mutation-config.ts

interface MutationConfig {
  version: "1.0";
  sourceFormat: "csv" | "json" | "xlsx";
  outputFormat: "csv" | "json" | "xlsx";

  // Field mappings: source field → output field
  fieldMappings: FieldMapping[];

  // Global transformations applied to all records
  globalTransforms?: GlobalTransform[];

  // Row-level filters (optional)
  filters?: FilterCondition[];
}

interface FieldMapping {
  sourceField: string;           // dot notation for nested: "address.city"
  targetField: string;
  transform?: FieldTransform;
}

interface FieldTransform {
  type:
    | "uppercase"
    | "lowercase"
    | "trim"
    | "dateFormat"
    | "numberFormat"
    | "split"
    | "join"
    | "replace"
    | "default"
    | "template"
    | "coerce";
  options?: Record<string, unknown>;
}

interface GlobalTransform {
  type: "flatten" | "unflatten" | "groupBy" | "sort";
  options?: Record<string, unknown>;
}

interface FilterCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | "exists";
  value: unknown;
}
```

### Task 1.2: Create JSON Schema version

Generate a JSON Schema from the TypeScript types. This will be included in prompts so the AI knows the exact output format.

```typescript
// src/schemas/mutation-config.schema.json
// Auto-generate using typescript-json-schema or write manually
```

---

## Phase 2: Source File Parsing

We need to extract structure from uploaded files so we can show it to the AI.

### Task 2.1: Build file parsers

```typescript
// src/services/file-parser.ts

interface ParsedFile {
  format: "csv" | "json" | "xlsx";
  inferredSchema: InferredSchema;
  sampleRows: Record<string, unknown>[];  // first 5-10 rows
  totalRows: number;
}

interface InferredSchema {
  fields: InferredField[];
}

interface InferredField {
  name: string;
  path: string;              // dot notation for nested fields
  inferredType: "string" | "number" | "boolean" | "date" | "array" | "object" | "null";
  nullable: boolean;
  sampleValues: unknown[];   // 3-5 example values
}

function parseFile(buffer: Buffer, mimeType: string): Promise<ParsedFile>;
```

### Task 2.2: Implement parsers for each format

- CSV: Use `papaparse` or similar
- JSON: Native parsing, walk structure to infer schema
- XLSX: Use `xlsx` package

Key considerations:
- Handle nested JSON structures (flatten field paths)
- Infer types from sample values
- Detect date strings and formats
- Handle CSV headers with spaces/special chars

---

## Phase 3: Target Schema Definition

Users need a way to define what they want the output to look like.

### Task 3.1: Target schema input options

Support two modes:

**Mode A: Explicit schema definition**
```typescript
interface TargetSchema {
  fields: TargetField[];
}

interface TargetField {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  required: boolean;
  description?: string;  // helps AI understand intent
}
```

**Mode B: Example output file**
User uploads a manually-created example output. Parse it the same way as source files, use the inferred schema as the target.

### Task 3.2: Build a simple UI for schema definition

- Start with Mode B (upload example) — lowest friction
- Later add Mode A with a form/editor

---

## Phase 4: AI Generation Service

### Task 4.1: Create the generation service

```typescript
// src/services/ai-config-generator.ts

interface GenerationInput {
  source: ParsedFile;
  target: TargetSchema;
  userHints?: string;  // optional natural language guidance
}

interface GenerationResult {
  config: MutationConfig;
  confidence: number;
  warnings: string[];           // things the AI wasn't sure about
  fieldMappingReasoning: {      // explain why each mapping was chosen
    targetField: string;
    reasoning: string;
  }[];
}

async function generateMutationConfig(input: GenerationInput): Promise<GenerationResult>;
```

### Task 4.2: Design the prompt

```typescript
const systemPrompt = `You are an expert data transformation assistant. Your job is to analyze source data structures and generate transformation configurations that convert the source data into a specified target format.

You must output valid JSON matching the provided schema. Be precise with field mappings and transformations.

When mapping fields:
- Match by semantic meaning, not just name similarity
- Consider data types and necessary conversions
- Handle nested structures appropriately
- Apply sensible defaults for missing data`;

function buildUserPrompt(input: GenerationInput): string {
  return `
## Source Data Structure

Format: ${input.source.format}

Fields:
${JSON.stringify(input.source.inferredSchema, null, 2)}

Sample data:
${JSON.stringify(input.source.sampleRows.slice(0, 3), null, 2)}

## Target Structure

${JSON.stringify(input.target, null, 2)}

${input.userHints ? `## Additional Guidance\n${input.userHints}` : ""}

## Your Task

Generate a MutationConfig that transforms the source data into the target structure.

Output ONLY valid JSON matching this schema:
${JSON.stringify(mutationConfigJsonSchema, null, 2)}

Include your reasoning for each field mapping in the fieldMappingReasoning array.
`;
}
```

### Task 4.3: Implement the API call

- Use Anthropic SDK or OpenAI SDK
- Parse response as JSON
- Validate against schema
- Handle errors / malformed responses gracefully
- Consider retry logic with adjusted prompts if validation fails

---

## Phase 5: Config Validation & Preview

Before saving, let users see what the transformation will do.

### Task 5.1: Build a config validator

```typescript
// src/services/config-validator.ts

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

function validateConfig(
  config: MutationConfig,
  sourceSchema: InferredSchema
): ValidationResult;
```

Check for:
- Referenced source fields exist
- Transform types are valid for field types
- No circular references
- Required target fields are mapped

### Task 5.2: Build a preview executor

```typescript
// src/services/transformation-preview.ts

interface PreviewResult {
  originalRows: Record<string, unknown>[];
  transformedRows: Record<string, unknown>[];
  errors: { row: number; error: string }[];
}

function previewTransformation(
  config: MutationConfig,
  sampleData: Record<string, unknown>[]
): PreviewResult;
```

Run the first 5-10 rows through the transformation so users can verify before saving.

---

## Phase 6: API Endpoints

### Task 6.1: Implement endpoints

```typescript
// POST /api/mutations/generate
// Takes source file + target schema, returns generated config
interface GenerateRequest {
  sourceFile: File;          // multipart
  targetSchema?: TargetSchema;
  targetExampleFile?: File;  // alternative to targetSchema
  hints?: string;
}

interface GenerateResponse {
  config: MutationConfig;
  warnings: string[];
  reasoning: { targetField: string; reasoning: string }[];
  preview: PreviewResult;
}

// POST /api/mutations/validate
// Validates a config against a source file
interface ValidateRequest {
  config: MutationConfig;
  sourceFile: File;
}

// POST /api/mutations/preview
// Runs transformation on sample data
interface PreviewRequest {
  config: MutationConfig;
  sourceFile: File;
  rowLimit?: number;
}
```

---

## Phase 7: Feedback Loop (Future Enhancement)

Store user corrections to improve generation over time.

### Task 7.1: Track corrections

```typescript
interface ConfigCorrection {
  originalConfig: MutationConfig;
  correctedConfig: MutationConfig;
  sourceSchema: InferredSchema;
  targetSchema: TargetSchema;
  timestamp: Date;
}
```

### Task 7.2: Use corrections in prompts

Include relevant past corrections as few-shot examples when generating configs for similar schemas.

---

## File Structure

```
src/
├── types/
│   └── mutation-config.ts
├── schemas/
│   └── mutation-config.schema.json
├── services/
│   ├── file-parser/
│   │   ├── index.ts
│   │   ├── csv-parser.ts
│   │   ├── json-parser.ts
│   │   └── xlsx-parser.ts
│   ├── ai-config-generator.ts
│   ├── config-validator.ts
│   └── transformation-preview.ts
├── api/
│   └── mutations/
│       ├── generate.ts
│       ├── validate.ts
│       └── preview.ts
└── lib/
    └── anthropic.ts          # or openai.ts
```

---

## Implementation Order

1. **MutationConfig types + JSON schema** — foundation everything else depends on
2. **File parsers** — needed for both source analysis and testing
3. **AI generation service** — core feature
4. **Config validator** — safety check before saving
5. **Preview executor** — user verification
6. **API endpoints** — expose to frontend
7. **Feedback loop** — post-launch iteration

---

## Testing Approach

Create test fixtures:
- Simple CSV → JSON mapping
- Nested JSON flattening
- Date format conversions
- Field renaming with type coercion
- Complex multi-transform scenarios

For each fixture, include:
- Source file sample
- Target schema
- Expected MutationConfig output
- Expected transformation result

---

## Notes for Agent

- Use TypeScript throughout
- Prefer function declarations over arrow functions
- Use lowercase for SQL keywords if any database work needed
- Validate AI outputs strictly — don't trust the model to always return valid JSON
- Handle edge cases: empty files, single-row files, deeply nested structures
- Add reasonable timeouts for AI calls
- Log AI prompts and responses for debugging
