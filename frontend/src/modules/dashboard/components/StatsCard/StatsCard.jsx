import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { cn } from '@/core/utils/helpers/string.helper';

const StatsCard = ({ title, value, change, changeType, icon: Icon, colorClass, gradientClass }) => {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
            {/* Subtle background glow effect */}
            <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 dark:opacity-10 pointer-events-none transition-all duration-500 group-hover:scale-110", gradientClass)} />
            
            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                    <div className="flex items-baseline gap-x-2">
                        <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">{value}</h3>
                    </div>
                    {change && (
                        <div className="mt-2 flex items-center text-sm font-medium">
                            <span className={cn(
                                "flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mr-2 transition-colors",
                                changeType === 'increase' 
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            )}>
                                {changeType === 'increase' ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
                                {change}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 text-xs">vs last month</span>
                        </div>
                    )}
                </div>
                
                <div className={cn("p-4 rounded-xl shadow-inner transition-colors", colorClass)}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
            </div>
        </div>
    );
};

export default StatsCard;
