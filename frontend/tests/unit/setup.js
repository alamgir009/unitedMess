import '@testing-library/jest-dom/vitest';

// Use Framer Motion's fallback in the DOM emulator. Chrome exercises native animations.
delete Element.prototype.animate;
