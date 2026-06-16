import React, { useMemo } from 'react';
import {
    HiOutlineSparkles,
    HiOutlineUserGroup,
} from 'react-icons/hi2';
import { IoFastFoodOutline } from 'react-icons/io5';
import StatPill from '@/shared/components/ui/StatPill/StatPill';
import { cn } from '@/core/utils/helpers/string.helper';

const COLORS = {
    primary: 'bg-primary/10 border-primary/20 text-primary',
    accent: 'bg-accent/10 border-accent/20 text-accent-foreground',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    secondary: 'bg-secondary-500/10 border-secondary-500/20 text-secondary-600 dark:text-secondary-400',
};

const MealStatsBar = React.memo(({ meals = [], isAdmin }) => {
    const stats = useMemo(() => {
        let totalMeals = 0;
        let guestMeals = 0;
        const userIds = new Set();

        for (let i = 0; i < meals.length; i++) {
            const m = meals[i];
            totalMeals += m.mealCount || 0;
            guestMeals += m.guestCount || 0;
            if (isAdmin) {
                const uid = typeof m.user === 'object' ? m.user?._id : m.user;
                if (uid) userIds.add(uid);
            }
        }

        const items = [
            {
                icon: HiOutlineSparkles,
                label: 'Total Records',
                value: meals.length,
                color: COLORS.primary,
            },
            {
                icon: IoFastFoodOutline,
                label: 'Total Meals',
                value: totalMeals,
                color: COLORS.accent,
            },
        ];

        if (guestMeals > 0) {
            items.push({
                icon: HiOutlineUserGroup,
                label: 'Guest Meals',
                value: guestMeals,
                color: COLORS.amber,
            });
        }

        if (isAdmin) {
            items.push({
                icon: HiOutlineUserGroup,
                label: 'Members',
                value: userIds.size,
                color: COLORS.secondary,
            });
        }

        return items;
    }, [meals, isAdmin]);

    const gridLayoutClass = cn(
        'grid gap-3 sm:gap-4',
        stats.length === 2 && 'grid-cols-2 max-w-2xl',
        stats.length === 3 && 'grid-cols-2 md:grid-cols-3',
        stats.length === 4 && 'grid-cols-2 lg:grid-cols-4'
    );

    return (
        <div
            role="status"
            aria-label="Meal statistics"
            className={gridLayoutClass}
        >
            {stats.map((s, idx) => {
                const isLastAndOdd = stats.length === 3 && idx === 2;
                return (
                    <div
                        key={s.label}
                        className={isLastAndOdd ? 'col-span-2 md:col-span-1' : 'col-span-1'}
                    >
                        <StatPill {...s} />
                    </div>
                );
            })}
        </div>
    );
});

MealStatsBar.displayName = 'MealStatsBar';

export default MealStatsBar;
