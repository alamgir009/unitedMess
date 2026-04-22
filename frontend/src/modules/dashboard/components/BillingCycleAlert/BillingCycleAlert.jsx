import React from 'react';
import { CalendarClock } from 'lucide-react';
import { motion } from 'framer-motion';

const BillingCycleAlert = () => {
    // Only show if the day of the month is between 1 and 10
    const today = new Date();
    const day = today.getDate();
    
    if (day > 10) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mb-6 overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-orange-950/20 p-4 shadow-sm"
        >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-200/50 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                    <CalendarClock className="h-7 w-7" />
                </div>
                <div className="flex-1 mt-1">
                    <h3 className="text-base font-semibold text-amber-800 dark:text-amber-200 mb-1">
                        Action Required: Upcoming Billing Cycle Transition
                    </h3>
                    <div className="text-sm text-amber-700/90 dark:text-amber-300/90 leading-relaxed font-medium">
                        <p>
                            Please review and settle all your market purchases, meals, and outstanding dues before the <strong>10th of this month</strong>. 
                            After the 10th, previous data will be finalized into your historical invoices and the dashboard will reset for the new cycle.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default BillingCycleAlert;
