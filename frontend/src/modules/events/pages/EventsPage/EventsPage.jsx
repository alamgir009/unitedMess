import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import EventCalendar from '../../components/EventCalendar/EventCalendar';

const EventsPage = () => {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <EventCalendar />
      </div>
    </MainLayout>
  );
};

EventsPage.displayName = 'EventsPage';
export default EventsPage;
