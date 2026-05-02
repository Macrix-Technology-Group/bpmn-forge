export function validateAdvancedProcessModel(model) {
  const errors = [];
  const warnings = [];

  const participantIds = new Set();
  for (const c of model.collaborations || []) {
    for (const p of c.participants || []) participantIds.add(p.id);
    for (const mf of c.messageFlows || []) {
      if (!mf.sourceRef) errors.push(`MessageFlow ${mf.id} missing sourceRef`);
      if (!mf.targetRef) errors.push(`MessageFlow ${mf.id} missing targetRef`);
    }
  }

  for (const ch of model.choreographies || []) {
    if (!(ch.tasks || []).length) warnings.push(`Choreography ${ch.id} has no choreography tasks`);
    for (const task of ch.tasks || []) {
      if (!task.initiatingParticipantRef) warnings.push(`ChoreographyTask ${task.id} missing initiatingParticipantRef`);
      if (!(task.participantRefs || []).length) warnings.push(`ChoreographyTask ${task.id} has no participantRefs`);
    }
  }

  for (const p of model.advancedProcesses || []) {
    if (p.type === 'transaction') {
      if (!p.method) warnings.push(`Transaction ${p.id} has no method`);
    }
    if (p.type === 'adHocSubProcess') {
      if (!p.completionCondition) warnings.push(`AdHocSubProcess ${p.id} has no completionCondition`);
      if (!(p.activities || []).length) warnings.push(`AdHocSubProcess ${p.id} has no activities`);
    }
    if (p.type === 'eventSubProcess') {
      if (!(p.startEvents || []).length) errors.push(`EventSubProcess ${p.id} has no start event`);
    }
    if (p.type === 'multiInstanceActivity') {
      if (!p.loopCardinality && !p.completionCondition) warnings.push(`MultiInstanceActivity ${p.id} has no loopCardinality or completionCondition`);
    }
    if (p.type === 'callActivity') {
      if (!p.calledElement) errors.push(`CallActivity ${p.id} missing calledElement`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      advancedProcesses: (model.advancedProcesses || []).length,
      collaborations: (model.collaborations || []).length,
      choreographies: (model.choreographies || []).length,
      conversations: (model.conversations || []).length,
      conversationLinks: (model.conversationLinks || []).length
    }
  };
}
