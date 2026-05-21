import React from 'react';
import StatsCard from '../StatsCard/StatsCard';

const StatOverview = ({ stats }) => {
    return (
        <div className="grid gap-2 sm:gap-6 grid-cols-2 lg:grid-cols-4 mb-6">
            {stats.map((stat) => (
                <StatsCard key={stat.title} {...stat} />
            ))}
        </div>
    );
};

export default StatOverview;
