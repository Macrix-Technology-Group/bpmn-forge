export const bpmnIrJsonSchemaForOpenAI = {
  type: 'object',
  additionalProperties: false,
  required: ['process'],
  properties: {
    process: {
      type: 'object',
      additionalProperties: false,
      required: ['id','name','nodes','edges'],
      properties: {
        id: {type:'string'}, name: {type:'string'}, isExecutable: {type:'boolean'},
        nodes: {type:'array', items:{type:'object'}},
        edges: {type:'array', items:{type:'object'}},
        participants: {type:'array', items:{type:'object'}},
        message_flows: {type:'array', items:{type:'object'}},
        data: {type:'object'}
      }
    }
  }
};
