import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
    User,
    Mail,
    Phone,
    Shield,
    Settings,
    Bell,
    LogOut,
    Edit3,
    RotateCcw
} from 'lucide-react';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import { Card, CardContent } from '@/shared/ui/Card/Card';
import { useDispatch } from 'react-redux';
import { logout } from '@/modules/auth/store/auth.slice';
import { useNavigate } from 'react-router-dom';
import { useCallback, useState, useMemo } from 'react';
import { EditModal } from '../../components/EditModal/EditModal';
import { EditForm } from '../../components/EditForm/EditForm';

const ProfilePage = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await dispatch(logout());
        navigate('/');
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
    };

    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleEdit = () => {
        setIsModalOpen(true)
    }

    const handleClose = () => {
        setIsModalOpen(false)
    }
    // const handleClose = useCallback(()=>{ setIsModalOpen(false) },[])

    const memberSinceText = useMemo(() => {
        const dateValue = user?.createdAt;
        if (!dateValue) return 'Not available';
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, [user?.createdAt]);

    const lastUpdatedText = useMemo(() => {
        const dateValue = user?.updatedAt || user?.createdAt;
        if (!dateValue) return 'Not available';
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString('en-US', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }, [user?.updatedAt, user?.createdAt]);

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-8">

                {/* ── Page Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 transition-colors">My Profile</h2>
                        <p className="text-muted-foreground text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                            Manage your personal information and preferences.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    {/* ── Left Column: Avatar & Quick Info ── */}
                    <motion.div variants={itemVariants} className="md:col-span-1 space-y-6">
                        <Card className="overflow-hidden border-border/40 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-lg transition-colors">
                            <CardContent className="p-6">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="relative group">
                                        <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 p-[3px] shadow-md">
                                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden relative">
                                                {user?.image ? (
                                                    <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-12 h-12 text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
                                                )}

                                                {/* Edit overlay */}
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm rounded-full">
                                                    <Edit3 className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50 transition-colors">{user?.name || 'Member User'}</h3>
                                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 mt-1">
                                            <Shield className="w-3.5 h-3.5" />
                                            {user?.role === 'admin' ? 'Administrator' : 'Member'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card className="border-border/40 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-md transition-colors">
                            <CardContent className="p-4 space-y-2">
                                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-300">
                                    <span className="flex items-center gap-3 text-sm font-medium">
                                        <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        Account Settings
                                    </span>
                                </button>
                                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-300">
                                    <span className="flex items-center gap-3 text-sm font-medium">
                                        <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        Notifications
                                    </span>
                                </button>
                                <div className="h-px bg-gray-200 dark:bg-slate-800 my-2" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-600 dark:text-red-400"
                                >
                                    <span className="flex items-center gap-3 text-sm font-medium">
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </span>
                                </button>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* ── Right Column: Details ── */}
                    <motion.div variants={itemVariants} className="md:col-span-2 space-y-6">
                        <Card className="border-border/40 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-lg h-full transition-colors">
                            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between transition-colors">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 transition-colors">Personal Details</h3>
                                <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                                    onClick={handleEdit}>
                                    <Edit3 className="w-4 h-4" />
                                    Edit
                                </button>
                            </div>
                            <CardContent className="p-6">
                                <div className="space-y-6">
                                    {/* Name */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <User className="w-4 h-4" /> Full Name
                                        </div>
                                        <div className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {user?.name || 'Not provided'}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-slate-800/60" />

                                    {/* Email */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <Mail className="w-4 h-4" /> Email Address
                                        </div>
                                        <div className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {user?.email || 'Not provided'}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-slate-800/60" />

                                    {/* Phone (mocked for now) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <Phone className="w-4 h-4" /> Phone Number
                                        </div>
                                        <div className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {user?.phone || '+91 XXX XXX XXXX'}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-slate-800/60" />

                                    {/* Account ID / Member since (mocked for now) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <Shield className="w-4 h-4" /> Member Since
                                        </div>
                                        <div className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {memberSinceText}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-slate-800/60" />

                                    {/* Account ID / Last Updated (mocked for now) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <RotateCcw className="w-4 h-4" /> Last Updated
                                        </div>

                                        <div className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {lastUpdatedText}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* ———Modal——— */}
                <EditModal isOpen={isModalOpen} onClose={handleClose} title="Edit Profile">
                    <EditForm handleClose={handleClose} initialData={user} />
                </EditModal>
            </div>
        </MainLayout>
    );
};

export default ProfilePage;
