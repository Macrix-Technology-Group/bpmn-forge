import { generateProcessFromPrompt } from './src/nl/promptEngine.js';

const { ir } = await generateProcessFromPrompt(
  "Pallet arrives, is checked, then stored",
  { mode: "rule" }
);

console.log(ir);