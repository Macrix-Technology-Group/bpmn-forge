import { importBpmnXml } from './bpmnXmlImporter.js';
import { enrichIrWithExtendedBpmn } from './extendedBpmnParser.js';
import { normalizeIr } from './normalizer.js';

export function importExtendedBpmnXml(xml) {
  return normalizeIr(enrichIrWithExtendedBpmn(importBpmnXml(xml), xml));
}
