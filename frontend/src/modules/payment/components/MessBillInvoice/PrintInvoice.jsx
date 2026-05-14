import React, { memo } from 'react';

const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const PrintInvoice = ({ 
    data, 
    user, 
    platformFee, 
    finalPayable, 
    displayMonth, 
    displayDate, 
    isRefund, 
    dueCarryOver,
    invoiceNo 
}) => {
    const {
        grandTotalMarketAmount = 0,
        grandTotalMeal = 0,
        adjustedMealCharge = 0,
        userStats = {},
    } = data;

    const {
        totalMeal = 0,
        totalMarketAmount = 0,
        waterBill = 0,
        cookingCharge = 0,
        costOfMeals = 0,
        guestMeal = 0,
        chargePerGuestMeal = 0,
        guestMealAmount = 0,
    } = userStats;

    const s = {
        wrap: {
            width: '680px', fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff',
            color: '#1a1a2e', padding: '40px', boxSizing: 'border-box',
        },
        header: {
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            borderBottom: '2px solid #4f46e5', paddingBottom: '20px', marginBottom: '24px',
        },
        brandBlock: { display: 'flex', flexDirection: 'column', gap: '4px' },
        logoRow: { display: 'flex', alignItems: 'center', gap: '8px' },
        logoImg: { width: '36px', height: '36px', objectFit: 'contain' },
        brandName: { fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' },
        brandGradient: {
            background: 'linear-gradient(135deg, hsl(210, 92%, 42%) 0%, hsl(268, 76%, 52%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent'
        },
        brandSub: { fontSize: '12px', color: '#6b7280', margin: 0 },
        metaBlock: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '3px' },
        metaLabel: { fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 },
        metaValue: { fontSize: '12px', color: '#374151', fontWeight: '600', margin: 0 },
        invoiceNo: { fontSize: '11px', fontFamily: 'monospace', color: '#4f46e5', margin: 0 },

        statRow: { display: 'flex', gap: '12px', marginBottom: '24px' },
        statBox: {
            flex: 1, padding: '14px 16px', backgroundColor: '#f8fafc',
            borderRadius: '8px', border: '1px solid #e2e8f0',
        },
        statBoxAccent: {
            flex: 1, padding: '14px 16px', backgroundColor: '#eef2ff',
            borderRadius: '8px', border: '1px solid #c7d2fe',
        },
        statLabel: { fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px 0' },
        statValue: { fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 },
        statValueAccent: { fontSize: '20px', fontWeight: '800', color: '#4f46e5', margin: 0 },

        sectionLabel: {
            fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase',
            letterSpacing: '0.1em', borderBottom: '1px solid #e2e8f0',
            paddingBottom: '6px', marginBottom: '0', marginTop: '20px',
        },
        row: {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid #f1f5f9',
        },
        rowLabel: { fontSize: '13px', color: '#374151', margin: 0 },
        rowSubLabel: { fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' },
        rowValue: { fontSize: '13px', fontWeight: '700', color: '#0f172a', margin: 0 },
        rowValueAccent: { fontSize: '13px', fontWeight: '700', color: '#4f46e5', margin: 0 },

        totalBox: {
            marginTop: '24px', padding: '20px 24px', borderRadius: '10px',
            backgroundColor: isRefund ? '#f0fdf4' : '#eef2ff',
            border: `1px solid ${isRefund ? '#86efac' : '#c7d2fe'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        },
        totalLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px 0' },
        totalAmount: { fontSize: '32px', fontWeight: '900', color: isRefund ? '#16a34a' : '#4f46e5', margin: 0 },
        statusBadge: {
            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
            backgroundColor: isRefund ? '#dcfce7' : '#e0e7ff',
            color: isRefund ? '#15803d' : '#4338ca',
        },

        footer: {
            marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0',
            textAlign: 'center', fontSize: '10px', color: '#9ca3af',
        },
        poweredBy: { marginTop: '6px', fontSize: '10px', color: '#c4b5fd', fontWeight: '600' },
    };

    return (
        <div style={s.wrap}>
            {/* Header */}
            <div style={s.header}>
                <div style={s.brandBlock}>
                    <div style={s.logoRow}>
                        <img 
                            src={typeof window !== 'undefined' ? `${window.location.origin}/assets/icons/unitedmess-icon-1024.png` : '/assets/icons/unitedmess-icon-1024.png'} 
                            alt="UnitedMess Logo" 
                            style={s.logoImg}
                            crossOrigin="anonymous"
                        />
                        <svg width="150" height="32" viewBox="0 0 150 32" style={{ display: 'block', marginLeft: '2px' }}>
                            <defs>
                                <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="hsl(210, 92%, 42%)" />
                                    <stop offset="100%" stopColor="hsl(268, 76%, 52%)" />
                                </linearGradient>
                            </defs>
                            <text x="0" y="24" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="800" fill="#0f172a" letterSpacing="-0.5px">
                                United<tspan fill="url(#brandGrad)">Mess</tspan>
                            </text>
                        </svg>
                    </div>
                    <p style={s.brandSub}>Mess Management Platform</p>
                    <p style={{ ...s.brandSub, marginTop: '8px' }}>{user?.name || '—'}</p>
                    <p style={s.brandSub}>{user?.email || ''}</p>
                </div>
                <div style={s.metaBlock}>
                    <p style={s.metaLabel}>Invoice</p>
                    <p style={s.invoiceNo}>{invoiceNo}</p>
                    <p style={{ ...s.metaValue, marginTop: '8px' }}>{displayMonth}</p>
                    <p style={s.metaValue}>{displayDate}</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={s.statRow}>
                <div style={s.statBox}>
                    <p style={s.statLabel}>Market Total (All)</p>
                    <p style={s.statValue}>₹{fmt(grandTotalMarketAmount)}</p>
                </div>
                <div style={s.statBox}>
                    <p style={s.statLabel}>Total Meals (All)</p>
                    <p style={s.statValue}>{fmt(grandTotalMeal)}</p>
                </div>
                <div style={s.statBoxAccent}>
                    <p style={s.statLabel}>{isRefund ? 'Refund Due' : 'Your Payable'}</p>
                    <p style={s.statValueAccent}>₹{fmt(Math.abs(finalPayable))}</p>
                </div>
            </div>

            {/* Usage */}
            <p style={s.sectionLabel}>Your Usage</p>
            <div style={s.row}>
                <div><p style={s.rowLabel}>Your Meals</p></div>
                <p style={s.rowValue}>{fmt(totalMeal)} meals</p>
            </div>
            <div style={s.row}>
                <div>
                    <p style={s.rowLabel}>Your Market Spend</p>
                    <p style={s.rowSubLabel}>What you spent</p>
                </div>
                <p style={s.rowValue}>₹{fmt(totalMarketAmount)}</p>
            </div>

            {/* Monthly Charges */}
            <p style={s.sectionLabel}>Monthly Charges</p>
            <div style={s.row}>
                <p style={s.rowLabel}>Water Bill</p>
                <p style={s.rowValue}>₹{fmt(waterBill)}</p>
            </div>
            <div style={s.row}>
                <p style={s.rowLabel}>Cooking Charge</p>
                <p style={s.rowValue}>₹{fmt(cookingCharge)}</p>
            </div>
            {guestMeal > 0 && (
                <div style={s.row}>
                    <div>
                        <p style={s.rowLabel}>Guest Meals</p>
                        <p style={s.rowSubLabel}>{guestMeal} meal(s) × ₹{fmt(chargePerGuestMeal)}</p>
                    </div>
                    <p style={s.rowValue}>₹{fmt(guestMealAmount)}</p>
                </div>
            )}

            {/* Calculations */}
            <p style={s.sectionLabel}>Calculations</p>
            <div style={s.row}>
                <div>
                    <p style={s.rowLabel}>Cost of Your Meals</p>
                    <p style={s.rowSubLabel}>Proportional share</p>
                </div>
                <p style={s.rowValueAccent}>₹{fmt(costOfMeals)}</p>
            </div>
            <div style={s.row}>
                <div>
                    <p style={s.rowLabel}>Adjusted Meal Charge</p>
                    <p style={s.rowSubLabel}>After guest deduction</p>
                </div>
                <p style={s.rowValueAccent}>₹{fmt(adjustedMealCharge)}</p>
            </div>
            <div style={s.row}>
                <p style={s.rowLabel}>Platform Fee</p>
                <p style={s.rowValue}>₹{fmt(platformFee || 0)}</p>
            </div>

            {/* Carry Over */}
            {dueCarryOver > 0 && (
                <>
                    <p style={s.sectionLabel}>Previous Balance</p>
                    <div style={s.row}>
                        <div>
                            <p style={s.rowLabel}>Carry-over Amount</p>
                            <p style={s.rowSubLabel}>Unpaid balance from past months</p>
                        </div>
                        <p style={s.rowValueAccent}>₹{fmt(dueCarryOver)}</p>
                    </div>
                </>
            )}

            {/* Total */}
            <div style={s.totalBox}>
                <div>
                    <p style={s.totalLabel}>{isRefund ? 'Refund Amount' : 'Total Payable'}</p>
                    <p style={s.totalAmount}>₹{fmt(Math.abs(finalPayable))}</p>
                </div>
                <span style={s.statusBadge}>{isRefund ? 'Refund Due' : 'Due'}</span>
            </div>

            {/* Footer */}
            <div style={s.footer}>
                <p style={{ margin: 0 }}>System-generated invoice for {displayMonth}. For disputes, contact your mess admin.</p>
                <p style={s.poweredBy}>Powered by United Mess · {invoiceNo}</p>
            </div>
        </div>
    );
};

export default memo(PrintInvoice);
