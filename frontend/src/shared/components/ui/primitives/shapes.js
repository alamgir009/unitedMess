/**
 * Central Allow-List for Circular / Full-Round Shapes
 * 
 * Strict Shape Rules:
 * Full round (--radius-full) ONLY where the form is semantically circular:
 * - Radio indicator & outer circle
 * - Switch track & thumb
 * - Avatar
 * - Status indicator dots
 * - Icon-only circular buttons
 * 
 * All other controls and surfaces (Input, Textarea, Select, Checkbox, Modal,
 * Dropdown menu, Card, text buttons) MUST use the tokenized radius scale
 * (--radius-xs through --radius-2xl).
 */

export const CIRCULAR_SHAPE_ALLOWLIST = Object.freeze(new Set([
  'Radio',
  'SwitchTrack',
  'SwitchThumb',
  'Avatar',
  'StatusDot',
  'CircularIconButton',
]));

export function isCircularShapeAllowed(name) {
  return CIRCULAR_SHAPE_ALLOWLIST.has(name);
}
