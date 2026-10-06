/**
 * Read-path guarantee: browsing a member's billing exemption for a period
 * must NEVER create or mutate an Invoice. The Edit Member panel calls this
 * endpoint every time an admin opens the modal or switches period, so a
 * write-on-read would silently mint invoices for months that were never billed.
 */
jest.mock('../../src/models/Invoice.model', () => {
    const model = jest.fn();
    model.findOne = jest.fn();
    model.find = jest.fn();
    model.create = jest.fn();
    model.countDocuments = jest.fn();
    model.insertMany = jest.fn();
    model.updateOne = jest.fn();
    model.updateMany = jest.fn();
    model.findOneAndUpdate = jest.fn();
    return model;
});

const Invoice = require('../../src/models/Invoice.model');
const { getInvoiceExemptionStatus } = require('../../src/services/invoice.service');

const SELECTED_FIELDS =
    'isExempt exemptSource exemptReason exemptOverride paidAmount isFinalized';

let lastQuery = null;

function chain(result) {
    const query = {};
    query.select = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockResolvedValue(result);
    lastQuery = query;
    return query;
}

const WRITABLES = [
    'create',
    'insertMany',
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'countDocuments',
    'find',
];

describe('getInvoiceExemptionStatus — read-only', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        lastQuery = null;
    });

    it('returns an empty, non-writing result when no invoice exists yet', async () => {
        Invoice.findOne.mockImplementation(() => chain(null));

        const result = await getInvoiceExemptionStatus('user1', 9, 2026);

        expect(result).toEqual({
            exists: false,
            invoiceId: null,
            override: 'none',
            isExempt: false,
            exemptSource: null,
            exemptReason: null,
            isFinalized: false,
            paidAmount: 0,
        });

        expect(Invoice.findOne).toHaveBeenCalledWith({ user: 'user1', month: 9, year: 2026 });

        WRITABLES.forEach((method) => {
            expect(Invoice[method]).not.toHaveBeenCalled();
        });
    });

    it('only runs findOne().select().lean() — no aggregate, no save, no upsert', async () => {
        Invoice.findOne.mockImplementation(() => chain(null));

        await getInvoiceExemptionStatus('user1', 3, 2026);

        expect(Invoice.findOne).toHaveBeenCalledTimes(1);
        expect(lastQuery.select).toHaveBeenCalledWith(SELECTED_FIELDS);
        expect(lastQuery.lean).toHaveBeenCalledTimes(1);
    });

    it('maps a stored manual override without touching the record', async () => {
        Invoice.findOne.mockImplementation(() =>
            chain({
                _id: 'inv_1',
                isExempt: true,
                exemptSource: 'admin_manual',
                exemptReason: 'Medical leave',
                exemptOverride: 'force_exempt',
                paidAmount: 0,
                isFinalized: false,
            }),
        );

        const result = await getInvoiceExemptionStatus('user1', 3, 2026);

        expect(result).toEqual({
            exists: true,
            invoiceId: 'inv_1',
            override: 'force_exempt',
            isExempt: true,
            exemptSource: 'admin_manual',
            exemptReason: 'Medical leave',
            isFinalized: false,
            paidAmount: 0,
        });
        WRITABLES.forEach((method) => {
            expect(Invoice[method]).not.toHaveBeenCalled();
        });
    });

    it('normalises an unknown stored override to "none"', async () => {
        Invoice.findOne.mockImplementation(() =>
            chain({
                _id: 'inv_2',
                isExempt: false,
                exemptOverride: 'SOMETHING_ELSE',
                paidAmount: 120,
                isFinalized: true,
            }),
        );

        const result = await getInvoiceExemptionStatus('user1', 2, 2026);

        expect(result.override).toBe('none');
        expect(result.isExempt).toBe(false);
        expect(result.exemptReason).toBeNull();
        expect(result.paidAmount).toBe(120);
        expect(result.isFinalized).toBe(true);
    });

    it('coerces a missing paidAmount to a number instead of NaN', async () => {
        Invoice.findOne.mockImplementation(() =>
            chain({ _id: 'inv_3', paidAmount: undefined, isFinalized: false }),
        );

        const result = await getInvoiceExemptionStatus('user1', 1, 2026);
        expect(result.paidAmount).toBe(0);
        expect(Number.isNaN(result.paidAmount)).toBe(false);
    });
});
