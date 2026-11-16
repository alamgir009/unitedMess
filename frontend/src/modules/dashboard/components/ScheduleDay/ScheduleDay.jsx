import { memo } from 'react';
import { format } from 'date-fns';

/** The current date stays identifiable independently of the selected duty. */
const ScheduleDay = memo(function ScheduleDay({ date, isSelected, isToday, isOwnDuty, onSelect }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={isSelected}
            aria-current={isToday ? 'date' : undefined}
            data-own={isOwnDuty}
            aria-label={`${format(date, 'EEEE, MMMM d')}${isToday ? ' (Today)' : ''}${isOwnDuty ? ' (Your market duty)' : ''}`}
            className="dashboard-day"
        >
            <span className="dashboard-day-weekday">{format(date, 'EEE')}</span>
            <span className="dashboard-day-date">{format(date, 'd')}</span>
            <span className="dashboard-day-marker" aria-hidden="true">
                {isToday ? 'Today' : <span />}
            </span>
        </button>
    );
});

export default ScheduleDay;
