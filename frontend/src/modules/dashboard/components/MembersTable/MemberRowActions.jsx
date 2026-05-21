import React from 'react';
import { FiEdit2 } from 'react-icons/fi';

const MemberRowActions = ({ user, onEdit }) => {
    return (
        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Universal edit button — always visible */}
            <button
                onClick={() => onEdit && onEdit(user)}
                className="p-1.5 rounded-lg border border-primary/10 text-primary bg-primary/10 hover:bg-primary/20 transition-all duration-150 transform-gpu hover:-translate-y-0.5 shadow-sm"
                title="Edit Member"
            >
                <FiEdit2 size={16} />
            </button>
        </div>
    );
};

export default React.memo(MemberRowActions);
