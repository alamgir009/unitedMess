import React from 'react';
import { Utensils, IndianRupee, PieChart, Users } from 'lucide-react';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import StatsCard from '@/modules/dashboard/components/StatsCard/StatsCard';
import RecentActivity from '@/modules/dashboard/components/RecentActivity/RecentActivity';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/Card/Card';

const DashboardPage = () => {
    // Mock data for now
    const stats = [
        { title: 'Total Meals', value: '45', change: '12%', changeType: 'increase', icon: Utensils, color: 'bg-orange-500' },
        { title: 'Total Expense', value: '₹12,450', change: '2.4%', changeType: 'decrease', icon: IndianRupee, color: 'bg-green-500' },
        { title: 'Meal Rate', value: '₹55.2', change: '4.1%', changeType: 'increase', icon: PieChart, color: 'bg-blue-500' },
        { title: 'Active Members', value: '12', change: '0%', changeType: 'neutral', icon: Users, color: 'bg-purple-500' },
    ];

    const recentActivities = [
        { id: 1, type: 'meal', content: 'Added lunch for', target: 'John Doe', datetime: '2024-01-20T13:00' },
        { id: 2, type: 'market', content: 'Market done by', target: 'Alice Smith', datetime: '2024-01-20T10:30' },
        { id: 3, type: 'user', content: 'Payment received from', target: 'Bob Wilson', datetime: '2024-01-19T18:45' },
        { id: 4, type: 'meal', content: 'Added dinner for', target: 'All Members', datetime: '2024-01-19T20:00' },
    ];

    return (
        <MainLayout>
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
                    <p className="text-muted-foreground text-gray-500">Overview of your mess activities.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <StatsCard key={stat.title} {...stat} />
                    ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Analytics</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            {/* Placeholder for Chart */}
                            <div className="h-[200px] flex items-center justify-center text-gray-400">
                                Chart Component Placeholder
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RecentActivity activities={recentActivities} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
};

export default DashboardPage;
