import { generateIrFromPromptRule } from './rulePromptGenerator.js';
import { generateIrFromPromptLlm } from './llmPromptGenerator.js';
import { normalizeIr } from '../normalizer.js';
import { validateIr } from '../validator.js';

export async function generateProcessFromPrompt(prompt, options = {}) {
  const mode = options.mode || 'rule';

  if (mode === 'llm') {
    const first = await generateIrFromPromptLlm(prompt, options);
    // Single repair round-trip on validation failure: send the bad IR back
    // to Claude with the validator errors and re-emit. Same approach as
    // textToIrWithLlm. Disable with options.repair = false.
    const validation1 = validateIr(normalizeIr(first.ir));
    if (validation1.ok || options.repair === false) {
      return {
        ir: first.ir,
        report: { mode, ok: validation1.ok, model: first.model, stop_reason: first.stop_reason, usage: first.usage, repaired: false }
      };
    }
    const second = await generateIrFromPromptLlm(prompt, {
      ...options,
      repair: { previousIr: first.ir, errors: validation1.errors }
    });
    const validation2 = validateIr(normalizeIr(second.ir));
    return {
      ir: second.ir,
      report: {
        mode, ok: validation2.ok, model: second.model, stop_reason: second.stop_reason, usage: second.usage,
        repaired: true,
        initialErrors: validation1.errors
      }
    };
  }

  const ir = generateIrFromPromptRule(prompt, options);
  return { ir, report: { mode, ok: true } };
}