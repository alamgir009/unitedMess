import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Check, ChevronDown, Users, X } from 'lucide-react';
import { analyticsApi, useGetAnalyticsMembersQuery } from '../store/analytics.api';
import { ALL_MEMBERS } from '../store/analytics.slice';
import { useAnalyticsIdentity } from '../hooks/useAnalyticsSession';

const MemberFilter = memo(function MemberFilter({ value, onChange }) {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(false);
    const dispatch = useDispatch();
    const { viewerId, epoch, enabled } = useAnalyticsIdentity();
    const args = useMemo(() => ({ viewerId, epoch, q: query }), [viewerId, epoch, query]);
    const previousArgs = useRef(args);
    const result = useGetAnalyticsMembersQuery(args, { skip: !active || !enabled });
    useEffect(() => {
        if (previousArgs.current !== args) {
            dispatch(analyticsApi.util.getRunningQueryThunk('getAnalyticsMembers', previousArgs.current))?.abort();
            previousArgs.current = args;
        }
    }, [args, dispatch]);
    const members = search.trim().toLowerCase() === query ? result.currentData || [] : [];
    const loading = result.isFetching && !result.currentData;
    const error = result.error;
    useEffect(() => {
        const timer = setTimeout(() => setQuery(search.trim().toLowerCase()), 300);
        return () => clearTimeout(timer);
    }, [search]);
    return <div className="w-full sm:w-80 min-w-0" onFocusCapture={() => setActive(true)}>
        <label htmlFor="analytics-member" className="block text-sm font-medium mb-2">Member</label>
        <Combobox value={value} by="_id" onChange={(member) => { onChange(member || ALL_MEMBERS); setSearch(''); }} onClose={() => { setSearch(''); setQuery(''); setActive(false); }}>
            <div className="analytics-member-field relative flex items-center">
                <Users size={17} aria-hidden="true" className="analytics-input-icon analytics-secondary" />
                <ComboboxInput id="analytics-member" className="analytics-input analytics-member-input w-full" displayValue={(member) => member?.name || 'All members'}
                    onChange={(event) => { setActive(true); setSearch(event.target.value); }}
                    onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') setActive(true); }} maxLength={100} autoComplete="off" placeholder="Search name or email" />
                <div className="absolute right-0 flex">
                    {value._id && <button type="button" className="analytics-icon-button" aria-label="Clear member filter" onClick={() => { onChange(ALL_MEMBERS); setSearch(''); }}><X size={16} /></button>}
                    <ComboboxButton className="analytics-icon-button" aria-label="Show active members" onClick={() => setActive(true)}><ChevronDown size={16} className="analytics-select-chevron" /></ComboboxButton>
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
                {error && enabled && <button type="button" className="analytics-button m-2" onClick={() => result.refetch()}>Retry member search</button>}
            </ComboboxOptions>
        </Combobox>
    </div>;
});

export default MemberFilter;
