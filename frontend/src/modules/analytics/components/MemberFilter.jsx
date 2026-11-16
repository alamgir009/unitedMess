import { memo, useEffect, useState } from 'react';
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Check, ChevronDown, Users, X } from 'lucide-react';
import { getMembers } from '../services/analytics.service';

export const ALL_MEMBERS = { _id: '', name: 'All members', email: '' };

const MemberFilter = memo(function MemberFilter({ value, onChange }) {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const timer = setTimeout(() => setQuery(search.trim()), 300);
        return () => clearTimeout(timer);
    }, [search]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        setMembers([]);
        getMembers(query, controller.signal).then((rows) => {
            if (!controller.signal.aborted) setMembers(rows);
        }).catch(() => {
            if (!controller.signal.aborted) setError(true);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [query, retry]);
    return <div className="w-full sm:w-80 min-w-0">
        <label htmlFor="analytics-member" className="block text-sm font-medium mb-2">Member</label>
        <Combobox value={value} by="_id" onChange={(member) => { onChange(member || ALL_MEMBERS); setSearch(''); }} onClose={() => setSearch('')}>
            <div className="analytics-member-field relative flex items-center">
                <Users size={17} aria-hidden="true" className="analytics-input-icon analytics-secondary" />
                <ComboboxInput id="analytics-member" className="analytics-input analytics-member-input w-full" displayValue={(member) => member?.name || 'All members'}
                    onChange={(event) => setSearch(event.target.value)} maxLength={100} autoComplete="off" placeholder="Search name or email" />
                <div className="absolute right-0 flex">
                    {value._id && <button type="button" className="analytics-icon-button" aria-label="Clear member filter" onClick={() => { onChange(ALL_MEMBERS); setSearch(''); }}><X size={16} /></button>}
                    <ComboboxButton className="analytics-icon-button" aria-label="Show active members"><ChevronDown size={16} className="analytics-select-chevron" /></ComboboxButton>
                </div>
            </div>
            <ComboboxOptions className="analytics-member-options" anchor="bottom start">
                <ComboboxOption value={ALL_MEMBERS} className="analytics-member-option">
                    <Users size={17} aria-hidden="true" className="shrink-0" /><span className="flex-1 font-medium">All members</span>{!value._id && <Check size={16} aria-hidden="true" />}
                </ComboboxOption>
                {members.map((member) => <ComboboxOption key={member._id} value={member} className="analytics-member-option">
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{member.name}</span><span className="block truncate text-xs analytics-secondary">{member.email}</span></span>
                    {value._id === member._id && <Check size={16} aria-hidden="true" />}
                </ComboboxOption>)}
                <div className="px-3 py-2 text-xs analytics-secondary" role="status">
                    {loading || search.trim() !== query ? 'Searching active members…' : error ? 'Members could not be loaded.' : members.length === 0 ? 'No matching active members.' : 'Search by name or email. Up to 50 matches.'}
                </div>
                {error && <button type="button" className="analytics-button m-2" onClick={() => setRetry((n) => n + 1)}>Retry member search</button>}
            </ComboboxOptions>
        </Combobox>
    </div>;
});

export default MemberFilter;
