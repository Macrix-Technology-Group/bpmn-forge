// Shared rule: which face does each outgoing edge of a gateway exit from?
//
// BPMN convention (and an iron rule from the user):
//   - Default / branch_type='main' → 'right' (the continuing main flow)
//   - Every other branch → 'top' if its target sits above the gateway,
//     'bottom' otherwise. Never 'right' — two branches sharing the right
//     vertex looks like a fan and obscures which arrow is which.
//
// The function is renderer-agnostic: caller resolves each edge's target
// center-Y and the gateway's center-Y in whichever coordinate space they
// already have, and the rule decides face purely from relative geometry.
//
// `branches`: array of { id, data, targetCenterY }
//   - id        : edge id (used as the key in the returned Map)
//   - data      : original IR edge object (we look at isDefault, branch_type)
//   - targetCenterY : Y coordinate of the target node's vertical center
//
// Returns Map<edgeId, 'right' | 'top' | 'bottom'>. The first edge that
// matches main/default takes 'right'; every subsequent branch is 'top' or
// 'bottom' based on its target's Y relative to the gateway. Single-fan
// callers should not invoke this — caller is responsible for the "1 outgoing
// edge always exits right" shortcut.

export function classifyGatewayBranches(branches, gatewayCenterY) {
  const ranked = [...branches].sort((a, b) => isMain(b.data) - isMain(a.data));
  // Stable: when both have the same main-ness, original order is preserved
  // (Array.prototype.sort is stable in modern V8/Node).
  const port = new Map();
  let mainAssigned = false;
  for (const branch of ranked) {
    if (!mainAssigned && isMain(branch.data)) {
      port.set(branch.id, 'right');
      mainAssigned = true;
      continue;
    }
    if (!mainAssigned) {
      // No edge was marked main; first one in IR order wins.
      port.set(branch.id, 'right');
      mainAssigned = true;
      continue;
    }
    const ty = branch.targetCenterY;
    if (typeof ty === 'number' && ty < gatewayCenterY - 8) {
      port.set(branch.id, 'top');
    } else {
      port.set(branch.id, 'bottom');
    }
  }
  return port;
}

function isMain(data) {
  return data?.isDefault || data?.branch_type === 'main' ? 1 : 0;
}
