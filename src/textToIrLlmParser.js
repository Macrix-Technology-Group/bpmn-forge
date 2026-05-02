import { validateIr } from './validator.js';
import { normalizeIr } from './normalizer.js';
import { generateIrFromPromptLlm } from './nl/llmPromptGenerator.js';

export async function textToIrWithLlm(text, options = {}) {
  const { ir: rawIr } = await generateIrFromPromptLlm(text, options);
  const ir = normalizeIr(rawIr);
  const validation = validateIr(ir);
  if (!validation.ok) throw new Error(`Invalid LLM IR: ${validation.errors.join('; ')}`);
  return ir;
}
