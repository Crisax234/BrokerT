"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home,
    Users,
    UserCheck,
    Building2,
    Settings,
    Menu,
    X,
    ChevronDown,
    ChevronRight,
    LogOut,
    Key,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";

const NAV_SECTIONS = [
    {
        label: 'Principal',
        items: [
            { name: 'Dashboard', href: '/app', icon: Home },
            { name: 'Leads', href: '/app/leads', icon: Users },
            { name: 'Mi Agenda', href: '/app/my-leads', icon: UserCheck },
        ],
    },
    {
        label: 'Gestión',
        items: [
            { name: 'Stock', href: '/app/stock', icon: Building2 },
            { name: 'Mis Clientes', href: '/app/reservations', icon: Users },
        ],
    },
    {
        label: 'Cuenta',
        items: [
            { name: 'Settings', href: '/app/user-settings', icon: Settings },
        ],
    },
];

const BREADCRUMB_MAP: Record<string, string> = {
    leads: 'Leads',
    'my-leads': 'Mi Agenda',
    stock: 'Stock',
    reservations: 'Mis Clientes',
    'user-settings': 'Settings',
    escenario: 'Escenario',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isDesktopCollapsed, setDesktopCollapsed] = useState(false);
    const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { user } = useGlobal();

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setUserDropdownOpen(false);
            }
        }
        if (isUserDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isUserDropdownOpen]);

    const handleLogout = async () => {
        try {
            const client = await createSPASassClient();
            await client.logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };
    const handleChangePassword = async () => {
        router.push('/app/user-settings')
    };

    const getInitials = (email: string) => {
        const parts = email.split('@')[0].split(/[._-]/);
        return parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    };

    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    // Build breadcrumbs from pathname
    const breadcrumbs = React.useMemo(() => {
        const segments = pathname.split('/').filter(Boolean);
        // Remove 'app' prefix
        const relevant = segments.slice(1);
        if (relevant.length === 0) return [];

        return relevant.map((seg, i) => {
            const label = BREADCRUMB_MAP[seg] || decodeURIComponent(seg);
            const href = '/app/' + relevant.slice(0, i + 1).join('/');
            return { label, href, isLast: i === relevant.length - 1 };
        });
    }, [pathname]);

    return (
        <div className="min-h-screen bg-secondary-50">
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-secondary-200 transform transition-transform duration-200 ease-in-out z-30
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isDesktopCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'}`}>

                <div className="h-16 flex items-center justify-between px-4 border-b border-secondary-200 bg-gradient-to-r from-primary-50 to-transparent">
                    <span className="text-lg font-bold text-primary-700 tracking-tight">{productName}</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setDesktopCollapsed(true)}
                            className="hidden lg:block text-secondary-400 hover:text-secondary-600 p-1 rounded-md hover:bg-secondary-100"
                            title="Cerrar sidebar"
                        >
                            <PanelLeftClose className="h-5 w-5" />
                        </button>
                        <button
                            onClick={toggleSidebar}
                            className="lg:hidden text-secondary-500 hover:text-secondary-700"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="mt-2 px-2">
                    {NAV_SECTIONS.map((section) => (
                        <div key={section.label}>
                            <p className="px-3 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-400">
                                {section.label}
                            </p>
                            <div className="space-y-0.5">
                                {section.items.map((item) => {
                                    const isActive = item.href === '/app'
                                        ? pathname === '/app'
                                        : pathname.startsWith(item.href);
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`group flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                                                isActive
                                                    ? 'bg-primary-50 text-primary-700 border-l-[3px] border-primary-500 pl-[5px] pr-2'
                                                    : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900 px-2'
                                            }`}
                                        >
                                            <item.icon
                                                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                                                    isActive ? 'text-primary-500' : 'text-secondary-400 group-hover:text-secondary-500'
                                                }`}
                                            />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

            </div>

            <div className={`transition-all duration-200 ${isDesktopCollapsed ? '' : 'lg:pl-64'}`}>
                {/* Navbar */}
                <div className="sticky top-0 z-10 flex items-center justify-between h-16 bg-white/80 backdrop-blur-md border-b border-secondary-200 px-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSidebar}
                            className="lg:hidden text-secondary-500 hover:text-secondary-700"
                        >
                            <Menu className="h-6 w-6"/>
                        </button>
                        {isDesktopCollapsed && (
                            <button
                                onClick={() => setDesktopCollapsed(false)}
                                className="hidden lg:block text-secondary-400 hover:text-secondary-600 p-1 rounded-md hover:bg-secondary-100"
                                title="Abrir sidebar"
                            >
                                <PanelLeftOpen className="h-5 w-5"/>
                            </button>
                        )}

                        {/* Breadcrumbs */}
                        {breadcrumbs.length > 0 && (
                            <nav className="hidden sm:flex items-center text-sm">
                                <Link href="/app" className="text-secondary-400 hover:text-secondary-600 transition-colors">
                                    <Home className="h-4 w-4" />
                                </Link>
                                {breadcrumbs.map((crumb) => (
                                    <React.Fragment key={crumb.href}>
                                        <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-secondary-300" />
                                        {crumb.isLast ? (
                                            <span className="font-medium text-secondary-800">{crumb.label}</span>
                                        ) : (
                                            <Link href={crumb.href} className="text-secondary-400 hover:text-secondary-600 transition-colors">
                                                {crumb.label}
                                            </Link>
                                        )}
                                    </React.Fragment>
                                ))}
                            </nav>
                        )}
                    </div>

                    <div className="relative ml-auto" ref={dropdownRef}>
                        <button
                            onClick={() => setUserDropdownOpen(!isUserDropdownOpen)}
                            className="flex items-center space-x-2 text-sm text-secondary-700 hover:text-secondary-900 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-full bg-primary-100 border-2 border-primary-200 flex items-center justify-center">
                                <span className="text-primary-700 font-medium text-sm">
                                    {user ? getInitials(user.email) : '??'}
                                </span>
                            </div>
                            <span className="hidden sm:inline">{user?.email || 'Cargando...'}</span>
                            <ChevronDown className="h-4 w-4"/>
                        </button>

                        {isUserDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-secondary-200 overflow-hidden">
                                <div className="p-3 border-b border-secondary-100 bg-secondary-50/50">
                                    <p className="text-[11px] text-secondary-400 uppercase tracking-wide">Conectado como</p>
                                    <p className="text-sm font-medium text-secondary-900 truncate mt-0.5">
                                        {user?.email}
                                    </p>
                                </div>
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setUserDropdownOpen(false);
                                            handleChangePassword()
                                        }}
                                        className="w-full flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                                    >
                                        <Key className="mr-3 h-4 w-4 text-secondary-400"/>
                                        Cambiar Contraseña
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setUserDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="mr-3 h-4 w-4 text-red-400"/>
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <main className="p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
