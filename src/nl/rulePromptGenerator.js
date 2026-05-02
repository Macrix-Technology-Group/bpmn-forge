export function generateIrFromPromptRule(prompt) {
  return {
    process: {
      id: "generated_process",
      name: prompt,
      isExecutable: true,
      nodes: [
        { id: "start", type: "event", subtype: "start", name: "Start" },
        { id: "task1", type: "task", subtype: "service", name: "Process Task" },
        { id: "end", type: "event", subtype: "end", name: "End" }
      ],
      edges: [
        { id: "e1", source: "start", target: "task1", branch_type: "main" },
        { id: "e2", source: "task1", target: "end", branch_type: "main" }
      ]
    }
  };
}