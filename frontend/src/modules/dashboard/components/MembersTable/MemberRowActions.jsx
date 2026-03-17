import React from 'react';
import { FiCheckCircle, FiXCircle, FiDollarSign, FiDroplet, FiEdit2 } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { approveUser, denyUser, updatePaymentStatus, updateGasBillStatus, fetchUsers } from '../../../members/store/members.slice';
import toast from 'react-hot-toast';

const MemberRowActions = ({ user, onEdit }) => {
    const dispatch = useDispatch();

    const handleApprove = async () => {
        try {
            await dispatch(approveUser(user._id)).unwrap();
            toast.success(`${user.name} approved successfully`);
            dispatch(fetchUsers({ page: 1, limit: 10 })); // Or pass current filter state ideally
        } catch (error) {
            toast.error(error || 'Failed to approve user');
        }
    };

    const handleDeny = async () => {
        try {
            await dispatch(denyUser(user._id)).unwrap();
            toast.success(`${user.name} denied successfully`);
            dispatch(fetchUsers({ page: 1, limit: 10 }));
        } catch (error) {
            toast.error(error || 'Failed to deny user');
        }
    };

    const handlePaymentToggle = async () => {
        try {
            const isPaid = user.paymentStatus === 'paid';
            await dispatch(updatePaymentStatus({ 
                userId: user._id, 
                paymentData: { status: isPaid ? 'unpaid' : 'paid', amount: 0 } // Amount needs proper handling, assuming 0 for toggle logic
            })).unwrap();
            toast.success(`Payment marked as ${isPaid ? 'Unpaid' : 'Paid'}`);
            dispatch(fetchUsers({ page: 1, limit: 10 }));
        } catch (error) {
            toast.error(error || 'Failed to update payment status');
        }
    };

    const handleGasBillToggle = async () => {
        try {
            const isPaid = user.gasBillStatus === 'paid';
            await dispatch(updateGasBillStatus({ 
                userId: user._id, 
                gasBillData: { status: isPaid ? 'unpaid' : 'paid', amount: 0 }
            })).unwrap();
            toast.success(`Gas Bill marked as ${isPaid ? 'Unpaid' : 'Paid'}`);
            dispatch(fetchUsers({ page: 1, limit: 10 }));
        } catch (error) {
            toast.error(error || 'Failed to update gas bill status');
        }
    };

    return (
        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            {user.status === 'pending' && (
                <>
                    <button 
                        onClick={handleApprove}
                        className="p-1.5 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                        title="Approve User"
                    >
                        <FiCheckCircle size={16} />
                    </button>
                    <button 
                        onClick={handleDeny}
                        className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                        title="Deny User"
                    >
                        <FiXCircle size={16} />
                    </button>
                </>
            )}
            
            {user.status === 'active' && (
                <>
                    <button 
                        onClick={handlePaymentToggle}
                        className={`p-1.5 rounded-lg transition-colors ${user.paymentStatus === 'paid' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-500 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700'}`}
                        title={user.paymentStatus === 'paid' ? "Mark Meal Bill Unpaid" : "Mark Meal Bill Paid"}
                    >
                        <FiDollarSign size={16} />
                    </button>
                    <button 
                        onClick={handleGasBillToggle}
                        className={`p-1.5 rounded-lg transition-colors ${user.gasBillStatus === 'paid' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700'}`}
                        title={user.gasBillStatus === 'paid' ? "Mark Gas Bill Unpaid" : "Mark Gas Bill Paid"}
                    >
                        <FiDroplet size={16} />
                    </button>
                </>
            )}

            {/* Universal Edit Action for detailed view */}
            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />
            <button 
                onClick={() => onEdit && onEdit(user)}
                className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition-colors shadow-sm"
                title="Edit Detailed Report"
            >
                <FiEdit2 size={16} />
            </button>
        </div>
    );
};

export default React.memo(MemberRowActions);
