export function simulateAdvancedProcessModel(model) {
  const trace = [];
  const incidents = [];

  for (const collaboration of model.collaborations || []) {
    trace.push({
      type: 'COLLABORATION_CONTEXT_CREATED',
      id: collaboration.id,
      participants: (collaboration.participants || []).map(p => p.id),
      messageFlows: (collaboration.messageFlows || []).map(m => m.id)
    });
    for (const flow of collaboration.messageFlows || []) {
      trace.push({
        type: 'MESSAGE_FLOW_REGISTERED',
        id: flow.id,
        sourceRef: flow.sourceRef,
        targetRef: flow.targetRef
      });
    }
  }

  for (const choreography of model.choreographies || []) {
    trace.push({
      type: 'CHOREOGRAPHY_REGISTERED',
      id: choreography.id,
      taskCount: (choreography.tasks || []).length
    });
    for (const task of choreography.tasks || []) {
      trace.push({
        type: 'CHOREOGRAPHY_TASK_READY',
        id: task.id,
        initiatingParticipantRef: task.initiatingParticipantRef,
        participantRefs: task.participantRefs
      });
    }
  }

  for (const conversation of model.conversations || []) {
    trace.push({
      type: 'CONVERSATION_REGISTERED',
      id: conversation.id,
      participants: conversation.participants || []
    });
  }

  for (const p of model.advancedProcesses || []) {
    if (p.type === 'transaction') {
      trace.push({
        type: 'TRANSACTION_SCOPE_CREATED',
        id: p.id,
        method: p.method || '##Compensate',
        cancelHandlers: p.cancelHandlers || [],
        compensationHandlers: p.compensationHandlers || []
      });
    }

    if (p.type === 'adHocSubProcess') {
      trace.push({
        type: 'AD_HOC_SUBPROCESS_READY',
        id: p.id,
        ordering: p.ordering,
        cancelRemainingInstances: p.cancelRemainingInstances,
        activityCount: (p.activities || []).length,
        completionCondition: p.completionCondition
      });
    }

    if (p.type === 'eventSubProcess') {
      for (const e of p.startEvents || []) {
        trace.push({
          type: 'EVENT_SUBPROCESS_SUBSCRIPTION_CREATED',
          subprocessId: p.id,
          startEventId: e.id,
          interrupting: e.interrupting
        });
      }
    }

    if (p.type === 'multiInstanceActivity') {
      const count = Number(p.loopCardinality || 1) || 1;
      trace.push({
        type: 'MULTI_INSTANCE_ACTIVITY_EXPANDED',
        id: p.id,
        isSequential: Boolean(p.isSequential),
        plannedInstances: count,
        completionCondition: p.completionCondition
      });
    }

    if (p.type === 'callActivity') {
      trace.push({
        type: 'CALL_ACTIVITY_BOUND',
        id: p.id,
        calledElement: p.calledElement
      });
    }
  }

  return {
    supportLevel: 'v29_advanced_process_foundation',
    trace,
    incidents
  };
}
