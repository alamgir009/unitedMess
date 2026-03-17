import React from 'react';
import StatsCard from '../StatsCard/StatsCard';

const StatOverview = ({ stats }) => {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat, index) => (
                <StatsCard key={index} {...stat} />
            ))}
        </div>
    );
};

export default StatOverview;
