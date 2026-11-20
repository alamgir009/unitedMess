const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
function formatCount(value) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value); }
function formatMoney(value = '0') {
    const text = String(value);
    const negative = text.startsWith('-');
    const [whole, fraction = ''] = text.replace(/^-/, '').split('.');
    return `${negative ? '-' : ''}${currency.formatToParts(BigInt(whole || '0')).map((part) => part.type === 'fraction' ? fraction.padEnd(2, '0').slice(0, 2) : part.value).join('')}`;
}
const cents = (value = '0') => {
    const text = String(value);
    const [whole, fraction = ''] = text.replace(/^-/, '').split('.');
    return (text.startsWith('-') ? -1n : 1n) * (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2)));
};
const decimal = (value) => `${value < 0n ? '-' : ''}${(value < 0n ? -value : value) / 100n}.${String((value < 0n ? -value : value) % 100n).padStart(2, '0')}`;
const sumMoney = (rows, key = 'amount') => decimal(rows.reduce((sum, row) => sum + cents(row[key]), 0n));
const share = (amount, total) => cents(total) === 0n ? '0.00%' : `${decimal(cents(amount) * 10000n / cents(total))}%`;
module.exports = { formatMoney, formatCount, cents, decimal, sumMoney, share };
