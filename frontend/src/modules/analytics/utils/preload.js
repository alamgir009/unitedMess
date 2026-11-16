export const loadAnalyticsPage = () => import('../pages/AnalyticsPage');
export const loadAnalyticsCharts = () => import('../components/ReportCharts');
export const prefetchAnalytics = () => {
    void Promise.all([loadAnalyticsPage(), loadAnalyticsCharts()]).catch(() => {});
};
