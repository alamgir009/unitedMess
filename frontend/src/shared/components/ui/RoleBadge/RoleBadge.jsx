import { HiOutlineShieldCheck } from 'react-icons/hi2';

const RoleBadge = ({ isAdmin, icon: Icon, label }) => {
    if (isAdmin) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-primary/8 text-primary border border-primary/15 shadow-sm shadow-primary/5 select-none">
                <HiOutlineShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Admin View
            </span>
        );
    }

    if (!Icon || !label) return null;

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-primary/8 text-primary border border-primary/15 shadow-sm shadow-primary/5 select-none">
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {label}
        </span>
    );
};

RoleBadge.displayName = 'RoleBadge';
export default RoleBadge;
