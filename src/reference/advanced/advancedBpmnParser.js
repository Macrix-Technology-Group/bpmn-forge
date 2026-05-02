function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : undefined;
}
function decode(v) {
  return String(v ?? '').replaceAll('&quot;', '"').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&');
}
function tags(xml, names) {
  const re = new RegExp(`<([A-Za-z0-9_\\-]+:)?(${names.join('|')})\\b[^>]*(?:/>|>[\\s\\S]*?</\\1?\\2>)`, 'gi');
  return [...xml.matchAll(re)].map(m => ({ full: m[0], local: m[2], open: m[0].match(/^<[^>]+>/)?.[0] || m[0] }));
}
function text(full, local) {
  const m = full.match(new RegExp(`<[^>]*:?${local}\\b[^>]*>([\\s\\S]*?)<\\/[^>]*:?${local}>`, 'i'));
  return m ? decode(m[1].trim()) : '';
}
function refs(full, local) {
  return [...full.matchAll(new RegExp(`<[^>]*:?${local}\\b[^>]*>([\\s\\S]*?)<\\/[^>]*:?${local}>`, 'gi'))].map(m => decode(m[1].trim()));
}
function loopCharacteristics(full) {
  const mi = full.match(/<[^>]*:?multiInstanceLoopCharacteristics\b[^>]*>[\s\S]*?<\/[^>]*:?multiInstanceLoopCharacteristics>/i);
  if (mi) {
    const open = mi[0].match(/^<[^>]+>/)?.[0] || '';
    return {
      type: 'multiInstance',
      isSequential: attr(open, 'isSequential') === 'true',
      loopCardinality: text(mi[0], 'loopCardinality') || null,
      completionCondition: text(mi[0], 'completionCondition') || null
    };
  }
  const standard = full.match(/<[^>]*:?standardLoopCharacteristics\b[^>]*>[\s\S]*?<\/[^>]*:?standardLoopCharacteristics>/i);
  if (standard) return { type: 'standardLoop', loopCondition: text(standard[0], 'loopCondition') || null };
  return null;
}
export function parseAdvancedBpmn(xml) {
  const collaborations = tags(xml, ['collaboration']).map(c => ({
    id: attr(c.open, 'id'),
    name: attr(c.open, 'name') || attr(c.open, 'id'),
    participants: tags(c.full, ['participant']).map(p => ({
      id: attr(p.open, 'id'),
      name: attr(p.open, 'name') || attr(p.open, 'id'),
      processRef: attr(p.open, 'processRef') || null
    })).filter(p => p.id),
    messageFlows: tags(c.full, ['messageFlow']).map(m => ({
      id: attr(m.open, 'id'),
      name: attr(m.open, 'name') || attr(m.open, 'id'),
      sourceRef: attr(m.open, 'sourceRef'),
      targetRef: attr(m.open, 'targetRef'),
      messageRef: attr(m.open, 'messageRef') || null
    })).filter(m => m.id)
  })).filter(c => c.id);

  const choreographies = tags(xml, ['choreography']).map(ch => ({
    id: attr(ch.open, 'id'),
    name: attr(ch.open, 'name') || attr(ch.open, 'id'),
    tasks: tags(ch.full, ['choreographyTask']).map(t => ({
      id: attr(t.open, 'id'),
      name: attr(t.open, 'name') || attr(t.open, 'id'),
      initiatingParticipantRef: attr(t.open, 'initiatingParticipantRef') || null,
      participantRefs: refs(t.full, 'participantRef'),
      messageFlowRefs: refs(t.full, 'messageFlowRef')
    })).filter(t => t.id)
  })).filter(c => c.id);

  const conversations = tags(xml, ['conversation']).map(cv => ({
    id: attr(cv.open, 'id'),
    name: attr(cv.open, 'name') || attr(cv.open, 'id'),
    participants: refs(cv.full, 'participantRef')
  })).filter(c => c.id);

  const conversationLinks = tags(xml, ['conversationLink']).map(l => ({
    id: attr(l.open, 'id'),
    sourceRef: attr(l.open, 'sourceRef'),
    targetRef: attr(l.open, 'targetRef')
  })).filter(l => l.id);

  const transactions = tags(xml, ['transaction']).map(t => ({
    id: attr(t.open, 'id'),
    name: attr(t.open, 'name') || attr(t.open, 'id'),
    method: attr(t.open, 'method') || null,
    cancelHandlers: tags(t.full, ['boundaryEvent']).filter(b => /cancelEventDefinition/i.test(b.full)).map(b => attr(b.open, 'id')).filter(Boolean),
    compensationHandlers: tags(t.full, ['boundaryEvent']).filter(b => /compensateEventDefinition/i.test(b.full)).map(b => attr(b.open, 'id')).filter(Boolean)
  })).filter(t => t.id);

  const adHocSubProcesses = tags(xml, ['adHocSubProcess']).map(a => ({
    id: attr(a.open, 'id'),
    name: attr(a.open, 'name') || attr(a.open, 'id'),
    ordering: attr(a.open, 'ordering') || 'Parallel',
    cancelRemainingInstances: attr(a.open, 'cancelRemainingInstances') !== 'false',
    completionCondition: text(a.full, 'completionCondition') || null,
    activities: tags(a.full, ['task','serviceTask','userTask','manualTask','scriptTask']).map(x => ({
      id: attr(x.open, 'id'),
      name: attr(x.open, 'name') || attr(x.open, 'id'),
      rawType: x.local
    })).filter(x => x.id)
  })).filter(a => a.id);

  const eventSubProcesses = tags(xml, ['subProcess']).filter(s => attr(s.open, 'triggeredByEvent') === 'true').map(s => ({
    id: attr(s.open, 'id'),
    name: attr(s.open, 'name') || attr(s.open, 'id'),
    startEvents: tags(s.full, ['startEvent']).map(e => ({
      id: attr(e.open, 'id'),
      name: attr(e.open, 'name') || attr(e.open, 'id'),
      interrupting: attr(e.open, 'isInterrupting') !== 'false'
    })).filter(e => e.id)
  })).filter(s => s.id);

  const multiInstanceActivities = tags(xml, ['task','serviceTask','userTask','manualTask','scriptTask','businessRuleTask','subProcess','callActivity']).map(t => {
    const loop = loopCharacteristics(t.full);
    if (!loop || loop.type !== 'multiInstance') return null;
    return {
      id: attr(t.open, 'id'),
      name: attr(t.open, 'name') || attr(t.open, 'id'),
      rawType: t.local,
      ...loop
    };
  }).filter(Boolean);

  const callActivities = tags(xml, ['callActivity']).map(c => ({
    id: attr(c.open, 'id'),
    name: attr(c.open, 'name') || attr(c.open, 'id'),
    calledElement: attr(c.open, 'calledElement') || attr(c.open, 'camunda:calledElement') || null
  })).filter(c => c.id);

  return {
    version: 29,
    advancedProcesses: [
      ...transactions.map(x => ({ type: 'transaction', ...x })),
      ...adHocSubProcesses.map(x => ({ type: 'adHocSubProcess', ...x })),
      ...eventSubProcesses.map(x => ({ type: 'eventSubProcess', ...x })),
      ...multiInstanceActivities.map(x => ({ type: 'multiInstanceActivity', ...x })),
      ...callActivities.map(x => ({ type: 'callActivity', ...x }))
    ],
    collaborations,
    choreographies,
    conversations,
    conversationLinks,
    diagnostics: {
      counts: {
        collaborations: collaborations.length,
        choreographies: choreographies.length,
        conversations: conversations.length,
        transactions: transactions.length,
        adHocSubProcesses: adHocSubProcesses.length,
        eventSubProcesses: eventSubProcesses.length,
        multiInstanceActivities: multiInstanceActivities.length,
        callActivities: callActivities.length
      }
    }
  };
}
