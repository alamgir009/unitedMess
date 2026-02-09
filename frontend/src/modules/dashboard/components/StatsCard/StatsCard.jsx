import React from 'react';
import { Card } from '@/shared/ui/Card/Card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

const StatsCard = ({ title, value, change, changeType, icon: Icon, color }) => {
    return (
        <div className="overflow-hidden rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
            <div className="flex items-center gap-x-4">
                <div className={cn("rounded-lg p-3", color)}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <div className="flex items-baseline gap-x-2">
                        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                        {change && (
                            <span className={cn(
                                "flex items-baseline text-sm font-semibold",
                                changeType === 'increase' ? "text-green-600" : "text-red-600"
                            )}>
                                {changeType === 'increase' ? <ArrowUp className="h-4 w-4 self-center shrink-0" /> : <ArrowDown className="h-4 w-4 self-center shrink-0" />}
                                {change}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsCard;
