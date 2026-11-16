const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
export const formatCount = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);

export function formatMoney(value = '0') {
    const text = String(value);
    const negative = text.startsWith('-');
    const [whole, fraction = ''] = text.replace(/^-/, '').split('.');
    const parts = currency.formatToParts(BigInt(whole || '0'));
    return `${negative ? '-' : ''}${parts.map((part) => part.type === 'fraction' ? fraction.padEnd(2, '0').slice(0, 2) : part.value).join('')}`;
}
