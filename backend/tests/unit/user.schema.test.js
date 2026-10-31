/**
 * User schema guard.
 *
 * The `meals` and `markets` arrays are append-only history written with
 * targeted $push/$pull updates, so document-level length validators on them
 * never enforced a real limit. They instead broke unrelated, valid writes
 * (login lastLogin, payment status, gas bill) with "Meals array too large"
 * once a long-standing member crossed 200 entries.
 *
 * These arrays must stay, but must not carry validators that can reject
 * unrelated saves.
 */

const User = require('../../src/models/User.model');

describe('User schema history arrays', () => {
    it.each(['meals', 'markets'])('keeps "%s" as an array path', (path) => {
        const schemaPath = User.schema.path(path);
        expect(schemaPath).toBeDefined();
        expect(schemaPath.instance).toBe('Array');
    });

    it.each(['meals', 'markets'])('has no length validators on "%s"', (path) => {
        const schemaPath = User.schema.path(path);
        // Only built-in validators would appear here; custom length caps must not.
        expect(schemaPath.validators).toHaveLength(0);
        expect(schemaPath.options.validate).toBeUndefined();
    });
});
