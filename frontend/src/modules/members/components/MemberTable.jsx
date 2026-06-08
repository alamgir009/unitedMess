import React from 'react';
import MemberRow from './MemberRow';
import { Loader } from '@/shared/components/ui';
import { Users } from 'lucide-react';

export const COLUMNS = [
    { id: 'profile', label: 'Member Profile', cols: 'col-span-4', align: 'justify-start' },
    { id: 'market', label: 'Market Amount', cols: 'col-span-2', align: 'justify-start' },
    { id: 'gas', label: 'Gas Bill', cols: 'col-span-2', align: 'justify-start' },
    { id: 'payment', label: 'Payment Status', cols: 'col-span-3', align: 'justify-start' },
    { id: 'expand', label: '', cols: 'col-span-1', align: 'justify-end' },
];

const EmptyState = React.memo(() => (
    <div className="flex flex-col items-center justify-center py-28 px-6 bg-card border border-border rounded-2xl shadow-sm text-center">
        <div className="mb-6 w-20 h-20 rounded-full flex items-center justify-center bg-muted ring-8 ring-muted/30">
            <Users size={32} strokeWidth={1.25} className="text-muted-foreground/50" />
        </div>
        <p className="text-base font-bold text-foreground tracking-tight mb-1">
            No members found
        </p>
        <p className="text-sm font-medium text-muted-foreground max-w-xs">
            Wait for users to register or ensure the database is connected.
        </p>
    </div>
));
EmptyState.displayName = 'EmptyState';

const SkeletonRow = React.memo(() => (
    <div className="grid grid-cols-12 gap-4 items-center rounded-2xl border border-border bg-card shadow-sm px-5 py-5 animate-pulse md:rounded-none md:shadow-none md:bg-transparent md:border-0 md:border-b md:border-border md:px-8 md:py-5">
        <div className="col-span-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full skeleton shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
                <div className="h-3.5 w-28 skeleton rounded-full" />
                <div className="h-2.5 w-40 skeleton rounded-full" />
            </div>
        </div>
        <div className="col-span-2 h-3.5 w-20 skeleton rounded-full" />
        <div className="col-span-2 h-6 w-20 skeleton rounded-full" />
        <div className="col-span-3 h-6 w-20 skeleton rounded-full" />
        <div className="col-span-1 flex justify-end">
            <div className="w-8 h-8 rounded-xl skeleton" />
        </div>
    </div>
));
SkeletonRow.displayName = 'SkeletonRow';

const MemberTable = ({ users, isLoading }) => {
    const membersList = Array.isArray(users) ? users : [];

    if (isLoading) {
        return (
            <div className="w-full md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm md:overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 items-center px-8 py-4 border-b border-border bg-muted/30">
                    {COLUMNS.map((col) => (
                        col.label ? (
                            <div key={col.id} className={`${col.cols} flex items-center ${col.align} text-caption font-semibold uppercase tracking-wider text-muted-foreground`}>
                                {col.label}
                            </div>
                        ) : (
                            <div key={col.id} className={col.cols} />
                        )
                    ))}
                </div>
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
        );
    }

    if (membersList.length === 0) return <EmptyState />;

    return (
        <div className="w-full">
            <div className="w-full md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm md:overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 items-center px-8 py-4 sticky top-0 z-30 bg-card/90 backdrop-blur-lg border-b border-border">
                    {COLUMNS.map((col) => (
                        <div key={col.id} className={`${col.cols} flex items-center ${col.align} text-caption font-semibold uppercase tracking-wider text-muted-foreground select-none`}>
                            {col.label}
                        </div>
                    ))}
                </div>

                <div className="w-full max-w-full flex flex-col gap-3 md:gap-0">
                    {membersList.map((user, index) => (
                        <MemberRow
                            key={user?._id ?? user?.id ?? index}
                            user={user}
                            index={index}
                            isLast={index === membersList.length - 1}
                        />
                    ))}
                </div>
            </div>

            <p className="mt-3 text-center text-caption font-medium text-muted-foreground select-none">
                Showing {membersList.length} member{membersList.length !== 1 ? 's' : ''}
            </p>
        </div>
    );
};

export default React.memo(MemberTable);
