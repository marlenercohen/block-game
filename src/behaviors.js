// Special interaction behaviours, looked up by a block's `behavior` name.
// Hook: onActivated(block, sim) is called right after the block receives the player's impulse.
// Nothing is implemented yet; example for the future:
//   flyUp: { onActivated(block) { block.body.applyImpulse({x:0,y:5*block.body.mass(),z:0}, true); } }
export const BEHAVIORS = {};
