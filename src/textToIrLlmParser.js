import { validateIr } from './validator.js';
import { normalizeIr } from './normalizer.js';
import { generateIrFromPromptLlm } from './nl/llmPromptGenerator.js';

// Single round-trip repair: if the first generation produces an IR that fails
// structural validation, send the IR + errors back to the LLM and ask it to
// fix them. One retry only — if the repair also fails, throw with both
// attempts' errors so the caller can debug.
//
// Set `options.repair = false` to disable the round-trip.
export async function textToIrWithLlm(text, options = {}) {
  const { ir: rawIr } = await generateIrFromPromptLlm(text, options);
  const ir = normalizeIr(rawIr);
  const validation = validateIr(ir);
  if (validation.ok) return ir;

  if (options.repair === false) {
    throw new Error(`Invalid LLM IR: ${validation.errors.join('; ')}`);
  }

  const { ir: repairedRaw } = await generateIrFromPromptLlm(text, {
    ...options,
    repair: { previousIr: rawIr, errors: validation.errors }
  });
  const repaired = normalizeIr(repairedRaw);
  const repairedValidation = validateIr(repaired);
  if (repairedValidation.ok) return repaired;

  throw new Error(
    `Invalid LLM IR after repair attempt. ` +
    `Initial errors: ${validation.errors.join('; ')}. ` +
    `Errors after repair: ${repairedValidation.errors.join('; ')}`
  );
}
