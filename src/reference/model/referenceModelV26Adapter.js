function toFlowElement(node) {
  const map = {
    event: {
      start: 'StartEvent',
      end: 'EndEvent',
      intermediate_catch: 'IntermediateCatchEvent',
      intermediate_throw: 'IntermediateThrowEvent',
      boundary: 'BoundaryEvent'
    },
    task: {
      task: 'Task',
      service: 'ServiceTask',
      user: 'UserTask',
      manual: 'ManualTask',
      script: 'ScriptTask',
      business_rule: 'BusinessRuleTask',
      send: 'SendTask',
      receive: 'ReceiveTask'
    },
    gateway: {
      exclusive: 'ExclusiveGateway',
      parallel: 'ParallelGateway',
      inclusive: 'InclusiveGateway',
      event_based: 'EventBasedGateway',
      complex: 'ComplexGateway'
    },
    subprocess: {
      embedded: 'SubProcess',
      call_activity: 'CallActivity',
      transaction: 'Transaction'
    }
  };

  const bpmnType = map[node.type]?.[node.subtype] || 'Task';
  const element = {
    id: node.id,
    bpmnType,
    name: node.name || node.id,
    incoming: [],
    outgoing: [],
    sourceIrType: node.type,
    sourceIrSubtype: node.subtype
  };

  if (node.event_definition) {
    element.eventDefinitions = [{ type: `${node.event_definition}EventDefinition` }];
  }

  if (node.gateway) {
    element.gatewayDirection = node.gateway.direction || 'unspecified';
    if (node.gateway.default_flow) element.default = node.gateway.default_flow;
  }

  if (node.attachedTo) element.attachedToRef = node.attachedTo;
  if (node.interrupting !== undefined) element.cancelActivity = Boolean(node.interrupting);
  if (node.execution) element.extensionElements = { execution: node.execution };
  if (node.loop) element.loopCharacteristics = node.loop;

  return element;
}

export function adaptIrToReferenceModelV26(ir) {
  const p = ir.process;
  const flowElements = (p.nodes || []).map(toFlowElement);
  const byId = new Map(flowElements.map(e => [e.id, e]));

  const sequenceFlows = (p.edges || []).map(edge => {
    const sf = {
      id: edge.id,
      bpmnType: 'SequenceFlow',
      name: edge.condition || '',
      sourceRef: edge.source,
      targetRef: edge.target,
      conditionExpression: edge.condition || '',
      branchType: edge.branch_type || '',
      isDefault: Boolean(edge.isDefault)
    };
    byId.get(edge.source)?.outgoing.push(edge.id);
    byId.get(edge.target)?.incoming.push(edge.id);
    return sf;
  });

  const rootElements = [{
    id: p.id,
    bpmnType: 'Process',
    name: p.name || p.id,
    isExecutable: Boolean(p.isExecutable),
    flowElements: [...flowElements, ...sequenceFlows],
    laneSets: (p.participants || []).flatMap(participant => participant.lanes || []),
    data: p.data || { objects: [], associations: [], annotations: [] },
    subprocesses: p.subprocesses || []
  }];

  if ((p.participants || []).length || (p.message_flows || []).length) {
    rootElements.push({
      id: `${p.id}_collaboration`,
      bpmnType: 'Collaboration',
      participants: p.participants || [],
      messageFlows: p.message_flows || []
    });
  }

  const diagrams = p.di ? [{
    id: `${p.id}_diagram`,
    bpmnType: 'BPMNDiagram',
    plane: {
      id: `${p.id}_plane`,
      bpmnElement: p.id,
      shapes: p.di.shapes || {},
      edges: p.di.edges || {}
    }
  }] : [];

  return {
    modelType: 'BPMN_REFERENCE_MODEL',
    version: 26,
    definitions: {
      id: `Definitions_${p.id}`,
      rootElements,
      diagrams
    },
    process: rootElements[0],
    collaboration: rootElements.find(x => x.bpmnType === 'Collaboration') || null,
    diagnostics: {
      source: 'v24_ir',
      adaptedAtVersion: 26
    }
  };
}
