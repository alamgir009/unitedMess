import React from 'react';
import { FiEdit2 } from 'react-icons/fi';

const MemberRowActions = ({ user, onEdit }) => {
    return (
        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Universal edit button — always visible */}
            <button
                onClick={() => onEdit && onEdit(user)}
                className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition-colors shadow-sm"
                title="Edit Member"
            >
                <FiEdit2 size={16} />
            </button>
        </div>
    );
};

export default React.memo(MemberRowActions);
