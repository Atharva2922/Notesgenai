"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CollectionDefinition } from '@/types';

interface SidebarProps {
    onWidthChange?: (width: number) => void;
    onIsResizing?: (isResizing: boolean) => void;
    onUpgrade?: () => void;
    noteCounts?: { [key: string]: number };
    isOpenMobile?: boolean;
    onCloseMobile?: () => void;
    collections?: CollectionDefinition[];
    activeCollection?: string | null;
    onCollectionSelect?: (collection: CollectionDefinition) => void;
    onClearCollection?: () => void;
    onCollectionDelete?: (collection: CollectionDefinition) => void;
    onRequestCreateCollection?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    onWidthChange,
    onIsResizing,
    onUpgrade,
    noteCounts = {},
    isOpenMobile = false,
    onCloseMobile,
    collections = [],
    activeCollection = null,
    onCollectionSelect,
    onClearCollection,
    onCollectionDelete,
    onRequestCreateCollection,
}) => {
    const pathname = usePathname();
    const sidebarRef = useRef<HTMLElement>(null);
    const [width, setWidth] = useState(256); // Default 256px (w-64)
    const [isResizing, setIsResizing] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const frameRef = useRef<number | null>(null);
    const pendingWidth = useRef(width);
    const savedWidth = useRef(width);

    const minWidth = 200;
    const maxWidth = 420;
    const collapsedWidth = 64;

    const navItems = [
        { href: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { href: '/explore', label: 'Explore', icon: 'M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ];

    const hasCollections = collections.length > 0;

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isCollapsed) return;
        e.preventDefault();
        setIsResizing(true);
        onIsResizing?.(true);
    }, [isCollapsed, onIsResizing]);

    const scheduleWidthUpdate = useCallback((nextWidth: number) => {
        pendingWidth.current = nextWidth;

        if (frameRef.current) return;

        frameRef.current = requestAnimationFrame(() => {
            setWidth(pendingWidth.current);
            frameRef.current = null;
        });
    }, []);

    const toggleCollapse = () => {
        if (isCollapsed) {
            setIsCollapsed(false);
            scheduleWidthUpdate(savedWidth.current || 256);
        } else {
            savedWidth.current = width;
            setIsCollapsed(true);
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);
        savedWidth.current = newWidth;
        scheduleWidthUpdate(newWidth);
    }, [isResizing, maxWidth, minWidth, scheduleWidthUpdate]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
        onIsResizing?.(false);
    }, [onIsResizing]);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    useEffect(() => {
        onWidthChange?.(isCollapsed ? 60 : width);
    }, [width, isCollapsed, onWidthChange]);

    // Mobile overlay handling
    useEffect(() => {
        if (isOpenMobile) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpenMobile]);

    const sidebarClasses = `
        fixed top-14 bottom-0 bg-white border-r border-gray-200 overflow-y-auto 
        z-40 transition-all duration-300 ease-in-out
        ${isOpenMobile ? 'left-0 shadow-2xl' : '-left-full lg:left-0'} 
        ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}
    `;

    // Overlay for mobile
    const overlay = isOpenMobile ? (
        <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
        />
    ) : null;

    return (
        <>
            {overlay}
            <aside
                ref={sidebarRef}
                style={{ width: (isOpenMobile ? 280 : (isCollapsed ? collapsedWidth : width)) }}
                className={sidebarClasses}
            >
                <div className="p-2 h-full flex flex-col">
                    <div className="mb-4 px-2 relative h-8 flex items-center justify-between">
                        {!isCollapsed && (
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-8">Dashboard</span>
                        )}
                        {/* Desktop collapse button */}
                        <button
                            onClick={toggleCollapse}
                            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 transition-all ml-auto"
                            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isCollapsed ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16m-7-7 7 7-7 7" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m7 7-7-7 7-7" /></svg>
                            )}
                        </button>
                        {/* Mobile close button */}
                        {isOpenMobile && (
                            <button
                                onClick={onCloseMobile}
                                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Navigation Items */}
                    <div className="space-y-1 mb-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={isCollapsed ? item.label : undefined}
                                onClick={onCloseMobile}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all group ${pathname === item.href ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-100 text-gray-700'
                                    } ${isCollapsed && !isOpenMobile ? 'justify-center px-2' : ''}`}
                            >
                                <svg className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${pathname === item.href ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                </svg>
                                {(!isCollapsed || isOpenMobile) && (
                                    <span className="flex-1 text-left truncate group-hover:translate-x-0.5 transition-transform">{item.label}</span>
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Collections - Hidden when collapsed */}
                    {(!isCollapsed || isOpenMobile) && hasCollections && (
                        <>
                            <div className="mt-4 px-4">
                                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">My Collections</h3>
                                <div className="space-y-1">
                                    {collections.map((collection) => {
                                        const count = noteCounts[collection.label] ?? 0;
                                        const isActive = activeCollection === collection.label;
                                        return (
                                            <div key={collection.label} className="flex items-center gap-2">
                                                <button
                                                    className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left group ${isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                                                    onClick={() => onCollectionSelect?.(collection)}
                                                >
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200 group-hover:scale-110'}`}>
                                                        {collection.label.charAt(0)}
                                                    </div>
                                                    <span className="truncate flex-1">{collection.label}</span>
                                                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[1.75rem] text-center transition-colors ${isActive ? 'bg-white text-blue-600 shadow-sm' : 'bg-gray-50 text-gray-500'}`}>
                                                        {count}
                                                    </span>
                                                </button>
                                                {!collection.readonly && (
                                                    <button
                                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        onClick={() => onCollectionDelete?.(collection)}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors text-left font-medium group"
                                            onClick={onRequestCreateCollection}
                                        >
                                            <svg className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span className="truncate">Create Collection</span>
                                        </button>
                                        {activeCollection && (
                                            <button
                                                className="text-xs font-semibold text-blue-600 hover:underline"
                                                onClick={onClearCollection}
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto px-4 border-t border-gray-100 pt-6 pb-4">
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200 hover:shadow-md transition-shadow">
                                    <h4 className="font-bold text-sm text-orange-900 mb-1">Go Premium</h4>
                                    <p className="text-xs text-orange-800 mb-3 opacity-80 line-clamp-2">Unlimited AI generations, PDF exports, and sync across devices.</p>
                                    <button
                                        className="w-full bg-orange-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-orange-700 transition-all shadow-sm hover:translate-y-[-1px]"
                                        onClick={onUpgrade}
                                    >
                                        Upgrade Now
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Collapse/Expand button when collapsed */}
                    {isCollapsed && !isOpenMobile && (
                        <div className="mt-auto pb-4 flex justify-center">
                            <button
                                onClick={toggleCollapse}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                                title="Expand sidebar"
                            >
                                <svg className="w-5 h-5 text-gray-600 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Resize Handle - Desktop Only */}
                <div
                    onMouseDown={handleMouseDown}
                    className={`hidden lg:block absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors group ${isResizing ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-400'
                        }`}
                >
                    <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 w-3 h-8 bg-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-0.5 h-4 bg-gray-500 rounded-full" />
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
