import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Utensils,
    ShoppingBag,
    CreditCard,
    Users,
    MessageSquare,
    Bell,
    Settings,
    LogOut,
    X
} from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';
import { useDispatch } from 'react-redux';
import { logout } from '@/modules/auth/store/auth.slice';

const Sidebar = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Meals', href: '/meals', icon: Utensils },
        { name: 'Market', href: '/market', icon: ShoppingBag },
        { name: 'Payments', href: '/payments', icon: CreditCard },
        { name: 'Members', href: '/members', icon: Users },
        { name: 'Messages', href: '/messages', icon: MessageSquare },
        { name: 'Notifications', href: '/notifications', icon: Bell },
    ];

    const handleLogout = () => {
        dispatch(logout());
    };

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden",
                    isOpen ? "opacity-100 ease-out duration-300" : "opacity-0 ease-in duration-200 pointer-events-none"
                )}
                onClick={onClose}
            />

            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between px-6 bg-slate-950">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        UnitedMess
                    </h1>
                    <button
                        type="button"
                        className="lg:hidden text-gray-400 hover:text-white"
                        onClick={onClose}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) => cn(
                                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                                isActive
                                    ? "bg-blue-600/10 text-blue-400"
                                    : "text-gray-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer actions */}
                <div className="border-t border-slate-800 p-4 space-y-1">
                    <NavLink
                        to="/profile"
                        className={({ isActive }) => cn(
                            "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                            isActive
                                ? "bg-blue-600/10 text-blue-400"
                                : "text-gray-400 hover:bg-slate-800 hover:text-white"
                        )}
                    >
                        <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
                        Settings
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                        <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                        Logout
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
