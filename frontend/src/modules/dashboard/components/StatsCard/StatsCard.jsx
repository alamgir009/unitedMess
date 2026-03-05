import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

const StatsCard = ({ title, value, change, changeType, icon: Icon, color }) => {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-x-4">
                <div className={cn("rounded-lg p-3 transition-colors", color)}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors">{title}</p>
                    <div className="flex items-baseline gap-x-2">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-50 transition-colors">{value}</h3>
                        {change && (
                            <span className={cn(
                                "flex items-baseline text-sm font-semibold transition-colors",
                                changeType === 'increase' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
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
