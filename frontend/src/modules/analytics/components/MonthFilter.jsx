import { memo } from 'react';
import { Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';

const label = (month) => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));

const MonthFilter = memo(function MonthFilter({ months, value, currentMonth, onChange }) {
    return <div className="min-w-0 w-full sm:w-64">
        <Listbox value={value} onChange={onChange}>
            <Label className="block text-sm font-medium mb-2">Month</Label>
            <ListboxButton id="analytics-month" className="analytics-input analytics-month-trigger w-full">
                <CalendarDays size={17} aria-hidden="true" className="shrink-0 analytics-secondary" />
                <span className="min-w-0 flex-1 text-left"><span className="block truncate">{label(value)}</span>{value === currentMonth && <span className="block text-xs analytics-secondary">Month to date</span>}</span>
                <ChevronDown size={16} aria-hidden="true" className="analytics-select-chevron shrink-0" />
            </ListboxButton>
            <ListboxOptions anchor="bottom end" className="analytics-month-options" aria-label="Report month">
                {[...months].reverse().map((month) => <ListboxOption key={month.month} value={month.month} className="analytics-member-option">
                    <span className="min-w-0 flex-1"><span className="block font-medium">{label(month.month)}</span><span className="block text-xs analytics-secondary">{month.month === currentMonth ? 'Month to date' : 'Full month'}</span></span>
                    {month.month === value && <Check size={17} aria-hidden="true" />}
                </ListboxOption>)}
            </ListboxOptions>
        </Listbox>
    </div>;
});

export default MonthFilter;
