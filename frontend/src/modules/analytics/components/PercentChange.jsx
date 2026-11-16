import { memo } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

const PercentChange = memo(function PercentChange({ value }) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return <span className="analytics-secondary" aria-label="No previous amount to compare">—</span>;
    }
    const number = Number(value);
    const direction = number > 0 ? 'increase' : number < 0 ? 'decrease' : 'unchanged';
    const Icon = number > 0 ? ArrowUpRight : number < 0 ? ArrowDownRight : Minus;
    const label = number === 0 ? 'No change versus previous month' : `${number > 0 ? 'Increase' : 'Decrease'} of ${Math.abs(number)} percent versus previous month`;
    return <span className="analytics-delta" data-direction={direction} aria-label={label}>
        <Icon size={16} aria-hidden="true" />
        <span>{number > 0 ? '+' : ''}{value}%</span>
    </span>;
});

export default PercentChange;
