import { importExtendedBpmnXml } from './extendedBpmnImport.js';
import { normalizeIr } from './normalizer.js';

export function importUnifiedBpmnXml(xml, options = {}) {
  const ir = importExtendedBpmnXml(xml);

  ir.meta = {
    ...(ir.meta || {}),
    importer: 'unifiedBpmnImporter',
    version: 24,
    includes: {
      bpmnCore: true,
      bpmndi: Boolean(ir.process?.di),
      participantsAndLanes: Boolean(ir.process?.participants?.length),
      dataObjects: Boolean(ir.process?.data?.objects?.length),
      associations: Boolean(ir.process?.data?.associations?.length),
      annotations: Boolean(ir.process?.data?.annotations?.length),
      subprocessMetadata: Boolean(ir.process?.subprocesses?.length)
    }
  };

  return normalizeIr(ir);
}
