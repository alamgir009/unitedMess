/**
 * freezeClock.js — deterministic system time for date-sensitive unit tests.
 *
 * The marketSchedule fixtures were authored against "today = 2026-08-27"
 * (see marketSchedule.validator.test.js: "Jul 31 is past (today Aug 27)").
 * Once the real clock passed those fixture dates every case collapsed into
 * PAST_DATE_NOT_ALLOWED / "Cannot select dates in the past" and the suite
 * rotted silently. Pinning the clock reproduces the authored conditions
 * forever — no fixture rewrites, immune to month rollovers.
 *
 * Only `Date` is faked: every timer/microtask stays real so promise-based
 * mocks resolve normally (no hung suites).
 */

const AUTHORED_TODAY = new Date('2026-08-27T06:30:00.000Z'); // 12:00 IST

const FAKE_ONLY_DATE = [
    'hrtime',
    'nextTick',
    'performance',
    'queueMicrotask',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'requestIdleCallback',
    'cancelIdleCallback',
    'setImmediate',
    'clearImmediate',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
];

/**
 * Register beforeAll/afterAll hooks that pin `Date` to `now` for the calling
 * suite. Must be invoked at the top level of a test file.
 */
const freezeClock = (now = AUTHORED_TODAY) => {
    beforeAll(() => {
        jest.useFakeTimers({ now, doNotFake: FAKE_ONLY_DATE });
    });
    afterAll(() => {
        jest.useRealTimers();
    });
};

module.exports = { freezeClock, AUTHORED_TODAY };
