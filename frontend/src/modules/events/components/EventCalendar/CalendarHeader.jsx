import { memo } from 'react';
import MemberFilterDropdown from '../MemberFilterDropdown/MemberFilterDropdown';

const CalendarHeader = memo(({ isAdmin, selectedMemberId, onMemberFilter }) => {
  if (!isAdmin) return null;

  return (
    <div className="mb-2">
      <MemberFilterDropdown
        selectedMemberId={selectedMemberId}
        onSelect={onMemberFilter}
      />
    </div>
  );
});

CalendarHeader.displayName = 'CalendarHeader';
export default CalendarHeader;
