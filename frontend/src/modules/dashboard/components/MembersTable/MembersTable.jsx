import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Users,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Shield,
} from 'lucide-react';
import MemberRowActions from './MemberRowActions';
import UserEditModal from './UserEditModal';
import { cn } from '@/core/utils/helpers/string.helper';
import { StatusBadge, Avatar, Input } from '@/shared/components/ui';
import { resolveBillStatus } from '@shared/utils/paymentStatus';

const getDisplayStatus = ({ userStatus, isActive }) => {
  if (userStatus === 'pending') return 'pending';
  if (userStatus === 'denied')  return 'denied';
  return isActive ? 'active' : 'inactive';
};

const ExemptBadge = React.memo(({ isExempt, reason }) => {
  if (!isExempt) return null;
  return (
    <span
      title={reason || 'No meals or market purchases this billing period'}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-info-bg text-info border border-info-border"
    >
      <Shield size={10} strokeWidth={2.5} />
      Exempt
    </span>
  );
});
ExemptBadge.displayName = 'ExemptBadge';

const FILTER_TABS = [
  { id: 'all',     label: 'All'     },
  { id: 'active',  label: 'Active'  },
  { id: 'inactive',  label: 'Inactive'  },
  { id: 'pending', label: 'Pending' },
  { id: 'denied',  label: 'Denied'  },
];

const COLUMNS = [
  { id: 'name', label: 'Member', sortKey: 'name', align: 'left' },
  { id: 'status', label: 'Status', sortKey: '_displayStatus', align: 'left' },
  { id: 'mealBill', label: 'Meal Bill', sortKey: 'paymentStatus', align: 'left' },
  { id: 'gasBill', label: 'Gas Bill', sortKey: 'gasBillStatus', align: 'left' },
  { id: 'actions', label: 'Actions', sortKey: null, align: 'right' },
];

const SortIcon = ({ direction }) => {
  if (direction === 'asc') return <ArrowUp className="w-3 h-3 ml-1" />;
  if (direction === 'desc') return <ArrowDown className="w-3 h-3 ml-1" />;
  return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
};

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full skeleton" />
        <div className="space-y-2">
          <div className="h-3 w-28 skeleton rounded" />
          <div className="h-2.5 w-20 skeleton rounded" />
        </div>
      </div>
    </td>
    <td className="px-5 py-4"><div className="h-6 w-20 rounded-full skeleton" /></td>
    <td className="px-5 py-4"><div className="h-6 w-16 rounded-full skeleton" /></td>
    <td className="px-5 py-4"><div className="h-6 w-16 rounded-full skeleton" /></td>
    <td className="px-5 py-4 text-right"><div className="ml-auto h-8 w-20 rounded-lg skeleton" /></td>
  </tr>
);

const MembersTable = ({ users = [], onSearch, isLoading }) => {
  const [editingUser, setEditingUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [localSearch, setLocalSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(null);

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') { setSortDir('desc'); }
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
      else { setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setTimeout(() => setEditingUser(null), 250);
  };

  const searchTimerRef = useRef(null);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      onSearch?.(val);
    }, 300);
  };

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const usersWithStatus = useMemo(
    () => users.map(u => ({ ...u, _displayStatus: getDisplayStatus(u) })),
    [users]
  );

  // Keep the open modal's member object in sync with the list, so status
  // chips refresh after any fetchUsers (e.g. saving a billing exemption).
  // UserEditModal initialises its form keyed on _id, so in-progress profile
  // edits are never clobbered by this refresh.
  useEffect(() => {
    if (!isEditModalOpen || !editingUser?._id) return;
    const fresh = usersWithStatus.find(u => u._id === editingUser._id);
    if (fresh && fresh !== editingUser) setEditingUser(fresh);
  }, [usersWithStatus, isEditModalOpen, editingUser]);

  const counts = useMemo(() => {
    const c = { all: usersWithStatus.length, active: 0, inactive: 0, pending: 0, denied: 0 };
    usersWithStatus.forEach(({ _displayStatus: s }) => {
      if (s === 'active') c.active++;
      else if (s === 'inactive') c.inactive++;
      else if (s === 'pending') c.pending++;
      else if (s === 'denied') c.denied++;
    });
    return c;
  }, [usersWithStatus]);

  const filteredUsers = useMemo(() => {
    let list = activeFilter === 'all'
      ? usersWithStatus
      : usersWithStatus.filter(u => u._displayStatus === activeFilter);

    if (sortKey) {
      list = [...list].sort((a, b) => {
        const aVal = a[sortKey] ?? '';
        const bVal = b[sortKey] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [usersWithStatus, activeFilter, sortKey, sortDir]);

  return (
    <>
      <div className="flex flex-col">
        <div className="flex flex-col gap-3 border-b border-border/60 px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/10">
              <Users size={18} strokeWidth={2} className="text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Member directory
              </h3>
              <p className="text-xs text-muted-foreground">
                {filteredUsers.length} of {users.length} members
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <Input
              type="text"
              size="sm"
              value={localSearch}
              placeholder="Search members..."
              onChange={handleSearchChange}
              aria-label="Search members"
              leftIcon={<Search size={15} strokeWidth={2} className="text-muted-foreground" />}
            />
          </div>
        </div>

        <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border/60 sm:px-5 no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold transition-all touch-target',
                activeFilter === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={activeFilter === tab.id}
            >
              {tab.label}
              {counts[tab.id] > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                  activeFilter === tab.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-auto text-left text-sm">
            <thead className="bg-muted/40 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.id}
                    className={cn('px-5 py-3', col.align === 'right' && 'text-right', col.sortKey && 'cursor-pointer select-none hover:text-foreground transition-colors')}
                    onClick={() => col.sortKey && handleSort(col.sortKey)}
                    aria-sort={sortKey === col.sortKey ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                    scope="col"
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      {col.sortKey && <SortIcon direction={sortKey === col.sortKey ? sortDir : null} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/20">
              {isLoading ? (
                Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="group transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user?.image || user?.avatar}
                          name={user?.name}
                          size="sm"
                          className="shrink-0 shadow-sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-snug text-foreground">
                            {user?.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-caption text-muted-foreground/60">
                              {user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex flex-col items-start gap-1.5">
                        <StatusBadge status={user._displayStatus} />
                        <span className="text-caption font-bold uppercase tracking-wider text-muted-foreground/60">
                          {user.role}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={resolveBillStatus({ status: user.paymentStatus ?? user.payment, payableAmount: user.paybleAmountforMeal })} />
                            <ExemptBadge isExempt={user.isExempt} reason={user.exemptReason} />
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                          <StatusBadge status={resolveBillStatus({ status: user.gasBillStatus ?? user.gasBill, payableAmount: user.gasBillCharge })} />
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <MemberRowActions user={user} onEdit={handleEditUser} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        <SlidersHorizontal size={22} strokeWidth={1.8} className="opacity-50" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No members found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting the filter or search query
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserEditModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} user={editingUser} />
    </>
  );
};

export default MembersTable;
