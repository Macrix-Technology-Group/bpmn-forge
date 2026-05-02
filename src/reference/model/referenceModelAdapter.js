export function adaptIrToReferenceModel(ir) {
  const p = ir.process;
  return {
    modelType: 'BPMN_REFERENCE_MODEL',
    version: 25,
    process: {
      id: p.id,
      name: p.name,
      isExecutable: Boolean(p.isExecutable),
      flowElements: (p.nodes || []).map(n => ({
        id: n.id,
        name: n.name,
        kind: n.type,
        subtype: n.subtype,
        eventDefinition: n.event_definition || null,
        gateway: n.gateway || null,
        execution: n.execution || null,
        attachedTo: n.attachedTo || null,
        loop: n.loop || null
      })),
      sequenceFlows: (p.edges || []).map(e => ({
        id: e.id,
        sourceRef: e.source,
        targetRef: e.target,
        condition: e.condition || '',
        branchType: e.branch_type || '',
        isDefault: Boolean(e.isDefault)
      })),
      collaboration: {
        participants: p.participants || [],
        messageFlows: p.message_flows || []
      },
      data: p.data || { objects: [], associations: [], annotations: [] },
      diagram: p.di || { shapes: {}, edges: {} },
      subprocesses: p.subprocesses || []
    }
  };
}
