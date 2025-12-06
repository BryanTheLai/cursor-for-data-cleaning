import Groq from 'groq-sdk';
import { log, measureTime } from './logger';
import { AI_CONFIG } from './config';

const groqApiKey = process.env.GROQ_API_KEY;

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not set');
    }
    groqClient = new Groq({ apiKey: groqApiKey });
    log.groq.info('Groq client initialized');
  }
  return groqClient;
}

export interface ColumnMappingResult {
  mappings: Record<string, string | null>;
  confidence: Record<string, number>;
  reasoning: Record<string, string>;
}

export interface CleaningResult {
  cleaned: Record<string, string>;
  changes: Array<{
    column: string;
    original: string;
    cleaned: string;
    reason: string;
  }>;
  errors: Array<{
    column: string;
    message: string;
    severity: 'yellow' | 'red';
  }>;
}

export async function mapColumnsWithAI(
  sourceHeaders: string[],
  sampleRows: Record<string, string>[],
  targetSchema: Array<{ key: string; label: string; type: string; required: boolean }>
): Promise<ColumnMappingResult> {
  const client = getGroqClient();
  
  const targetSchemaText = targetSchema
    .map(col => `- ${col.key} (${col.label}) - ${col.type}${col.required ? ', REQUIRED' : ''}`)
    .join('\n');
  
  const sampleDataText = sampleRows
    .slice(0, 5)
    .map((row, i) => `Row ${i + 1}: ${JSON.stringify(row)}`)
    .join('\n');

  const systemPrompt = `You are a data mapping assistant. Your job is to map CSV columns to a target schema.
Analyze the column headers AND the sample data to determine the best mapping.
Return ONLY valid JSON, no markdown or explanation.`;

  const userPrompt = `Map these CSV columns to our target schema.

SOURCE COLUMNS: ${JSON.stringify(sourceHeaders)}

SAMPLE DATA (first 5 rows):
${sampleDataText}

TARGET SCHEMA:
${targetSchemaText}

Return JSON in this exact format:
{
  "mappings": { "source_column_name": "target_key" | null },
  "confidence": { "source_column_name": 0.0-1.0 },
  "reasoning": { "source_column_name": "brief explanation" }
}

Rules:
- Map source columns to target keys based on semantic meaning
- Use null for source columns that don't match any target
- Confidence should reflect how certain the mapping is
- Each target key can only be mapped once`;

  log.groq.info('Sending column mapping request', { 
    sourceHeaders, 
    sampleRowCount: sampleRows.length,
    targetColumns: targetSchema.map(t => t.key)
  });

  const result = await measureTime('Column mapping', log.groq, async () => {
    const completion = await client.chat.completions.create({
      model: AI_CONFIG.groq.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: AI_CONFIG.groq.temperature,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from Groq');
    }

    return JSON.parse(content) as ColumnMappingResult;
  });

  log.groq.info('Column mapping result', result);
  return result;
}

export async function cleanRowWithAI(
  rowData: Record<string, string>,
  targetColumns: Array<{ key: string; label: string; rules: string | null }>
): Promise<CleaningResult> {
  const client = getGroqClient();
  
  const rulesText = targetColumns
    .filter(col => col.rules)
    .map(col => `- "${col.label}" (${col.key}): ${col.rules}`)
    .join('\n');

  const systemPrompt = `You are a data cleaning assistant for Malaysian bank payroll data.
Clean the input data according to the specified rules.
Return ONLY valid JSON, no markdown or explanation.`;

  const userPrompt = `Clean this row data according to these rules.

RULES:
${rulesText || 'No specific rules provided. Apply standard data cleaning.'}

INPUT DATA:
${JSON.stringify(rowData)}

Return JSON in this exact format:
{
  "cleaned": { "column_key": "cleaned_value" },
  "changes": [{ "column": "key", "original": "old", "cleaned": "new", "reason": "why" }],
  "errors": [{ "column": "key", "message": "error description", "severity": "yellow" | "red" }]
}

Rules:
- Apply each cleaning rule strictly
- "yellow" severity = minor fix applied
- "red" severity = critical issue (missing required, invalid format)
- Include ALL columns in "cleaned", even unchanged ones`;

  log.groq.info('Sending cleaning request', { rowData, columnCount: targetColumns.length });

  const result = await measureTime('Row cleaning', log.groq, async () => {
    const completion = await client.chat.completions.create({
      model: AI_CONFIG.groq.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: AI_CONFIG.groq.temperature,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from Groq');
    }

    return JSON.parse(content) as CleaningResult;
  });

  log.groq.info('Cleaning result', { 
    changesCount: result.changes.length, 
    errorsCount: result.errors.length 
  });
  
  return result;
}

export async function cleanBatchWithAI(
  rows: Record<string, string>[],
  targetColumns: Array<{ key: string; label: string; rules: string | null }>
): Promise<CleaningResult[]> {
  log.groq.info('Starting batch cleaning', { rowCount: rows.length });
  
  const results: CleaningResult[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    log.groq.info(`Cleaning row ${i + 1}/${rows.length}`);
    const result = await cleanRowWithAI(rows[i], targetColumns);
    results.push(result);
  }
  
  log.groq.info('Batch cleaning complete', { 
    totalRows: rows.length,
    totalChanges: results.reduce((sum, r) => sum + r.changes.length, 0),
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
  });
  
  return results;
}

