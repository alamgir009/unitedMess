import React from 'react';
import { format } from 'date-fns';
import { User, ShoppingBag, Utensils } from 'lucide-react';

const RecentActivity = ({ activities = [] }) => {
    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {activities.map((activity, activityIdx) => (
                    <li key={activity.id}>
                        <div className="relative pb-8">
                            {activityIdx !== activities.length - 1 ? (
                                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${activity.type === 'meal' ? 'bg-orange-500' :
                                            activity.type === 'market' ? 'bg-blue-500' : 'bg-green-500'
                                        }`}>
                                        {activity.type === 'meal' && <Utensils className="h-4 w-4 text-white" />}
                                        {activity.type === 'market' && <ShoppingBag className="h-4 w-4 text-white" />}
                                        {activity.type === 'user' && <User className="h-4 w-4 text-white" />}
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            {activity.content} <span className="font-medium text-gray-900">{activity.target}</span>
                                        </p>
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                        <time dateTime={activity.datetime}>{format(new Date(activity.datetime), 'MMM d, h:mm a')}</time>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RecentActivity;
