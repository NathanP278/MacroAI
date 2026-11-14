import { z } from 'zod';

export const AiMacroNutrientsSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().optional(),
});

export const AiMealItemSchema = z.object({
  name: z.string().min(1),
  grams: z.number().positive(),
  per100g: AiMacroNutrientsSchema,
  microsPer100g: z.record(z.string(), z.number()).optional(),
});

export const AiMealScanResponseSchema = z.object({
  items: z.array(AiMealItemSchema).min(1),
});

export const AiLabelOcrResponseSchema = z.object({
  name: z.string().optional(),
  brand: z.string().optional(),
  servingSize: z.number().positive(),
  servingUnit: z.enum(['g', 'ml', 'serving']),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().optional(),
  sodiumMg: z.number().nonnegative().optional(),
});

export type AiMacroNutrients = z.infer<typeof AiMacroNutrientsSchema>;
export type AiMealItem = z.infer<typeof AiMealItemSchema>;
export type AiMealScanResponse = z.infer<typeof AiMealScanResponseSchema>;
export type AiLabelOcrResponse = z.infer<typeof AiLabelOcrResponseSchema>;

/**
 * Strips markdown code fences, parses JSON, and strictly validates against a Zod schema.
 */
export function parseAiJsonResponse<T>(rawText: string, schema: z.ZodType<T>): T {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('AI response is empty or not a string');
  }

  let text = rawText.trim();

  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ... ```)
  const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeFenceMatch) {
    text = codeFenceMatch[1].trim();
  } else {
    // If not in fences, check if embedded between JSON delimiters
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = text.lastIndexOf('}');
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = text.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      text = text.slice(startIdx, endIdx + 1).trim();
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Failed to parse AI response as JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join(', ');
    throw new Error(`AI response failed schema validation: ${issues}`);
  }

  return result.data;
}
