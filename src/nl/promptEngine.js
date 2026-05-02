import { generateIrFromPromptRule } from './rulePromptGenerator.js';
import { generateIrFromPromptLlm } from './llmPromptGenerator.js';

export async function generateProcessFromPrompt(prompt, options = {}) {
  const mode = options.mode || 'rule';

  if (mode === 'llm') {
    const { ir, usage, model, stop_reason } = await generateIrFromPromptLlm(prompt, options);
    return { ir, report: { mode, ok: true, model, stop_reason, usage } };
  }

  const ir = generateIrFromPromptRule(prompt, options);
  return { ir, report: { mode, ok: true } };
}