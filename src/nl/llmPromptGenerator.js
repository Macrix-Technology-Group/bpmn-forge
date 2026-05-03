import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = path.resolve(__dirname, '../../prompts/text_to_bpmn_ir_prompt.md');
const DEFAULT_MODEL = 'claude-opus-4-7';

const bpmnIrJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['process'],
  properties: {
    process: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'nodes', 'edges'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        isExecutable: { type: 'boolean' },
        nodes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'type', 'subtype', 'name'],
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['event', 'gateway', 'task', 'subprocess'] },
              subtype: { type: 'string' },
              name: { type: 'string' },
              event_definition: { type: 'string' },
              attachedTo: { type: 'string' },
              interrupting: { type: 'boolean' },
              marker: {
                type: 'string',
                enum: ['loop', 'multi_instance_parallel', 'multi_instance_sequential']
              },
              is_event_subprocess: { type: 'boolean' },
              is_ad_hoc: { type: 'boolean' },
              is_for_compensation: { type: 'boolean' }
            }
          }
        },
        edges: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'source', 'target'],
            properties: {
              id: { type: 'string' },
              source: { type: 'string' },
              target: { type: 'string' },
              condition: { type: 'string' },
              branch_type: {
                type: 'string',
                enum: ['main', 'alternative', 'exception', 'termination', 'loop']
              },
              isDefault: { type: 'boolean' },
              is_conditional: { type: 'boolean' }
            }
          }
        },
        participants: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name', 'lanes'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              isBlackBox: { type: 'boolean' },
              lanes: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'name', 'nodeRefs'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    nodeRefs: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        },
        message_flows: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'source', 'target'],
            properties: {
              id: { type: 'string' },
              source: { type: 'string' },
              target: { type: 'string' },
              name: { type: 'string' }
            }
          }
        },
        data_objects: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        },
        data_associations: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'source', 'target'],
            properties: {
              id: { type: 'string' },
              source: { type: 'string' },
              target: { type: 'string' }
            }
          }
        },
        groups: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name', 'nodeRefs'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              nodeRefs: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  }
};

let cachedSystemPrompt;
function getSystemPrompt() {
  if (!cachedSystemPrompt) cachedSystemPrompt = fs.readFileSync(PROMPT_PATH, 'utf8');
  return cachedSystemPrompt;
}

function extractFirstTextBlock(content) {
  for (const block of content || []) {
    if (block.type === 'text' && typeof block.text === 'string') return block.text;
  }
  return '';
}

function parseJsonFromText(raw) {
  const text = String(raw || '').trim();
  if (!text) throw new Error('Empty response from Claude');
  if (text.startsWith('{')) return JSON.parse(text);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return JSON.parse(fenced[1].trim());
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1));
  throw new Error(`No JSON object in Claude response: ${text.slice(0, 200)}`);
}

export async function generateIrFromPromptLlm(prompt, options = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.');
  }
  if (!prompt || !String(prompt).trim()) throw new Error('Empty prompt');

  const client = new Anthropic();
  const model = options.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    thinking: { type: 'disabled' },
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: bpmnIrJsonSchema }
    },
    system: [
      {
        type: 'text',
        text: getSystemPrompt(),
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [{ role: 'user', content: String(prompt) }]
  });

  const text = extractFirstTextBlock(response.content);
  const ir = parseJsonFromText(text);

  return {
    ir,
    usage: response.usage,
    model: response.model,
    stop_reason: response.stop_reason
  };
}

export { bpmnIrJsonSchema };
