"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Section {
    id: string;
    label: string;
    summary: string;
}

interface AdminSidebarProps {
    sections: Section[];
    activeSection: string;
    onSectionChange: (id: string) => void;
    onWidthChange?: (width: number) => void;
    onIsResizing?: (isResizing: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
    sections,
    activeSection,
    onSectionChange,
    onWidthChange,
    onIsResizing
}) => {
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

    return (
        <aside
            ref={sidebarRef}
            style={{ width: isCollapsed ? collapsedWidth : width }}
            className={`fixed left-0 top-14 bottom-0 bg-white border-r border-gray-200 overflow-y-auto hidden lg:block font-sans ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
        >
            <div className="p-2 h-full flex flex-col">
                <div className="mb-4 px-2 relative h-8">
                    {!isCollapsed && (
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-8">Admin Menu</span>
                    )}
                    <button
                        onClick={toggleCollapse}
                        className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 transition-all"
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16m-7-7 7 7-7 7" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m7 7-7-7 7-7" /></svg>
                        )}
                    </button>
                </div>

                {/* Navigation Items */}
                <div className="space-y-1 mb-6">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => onSectionChange(section.id)}
                            title={isCollapsed ? section.label : undefined}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${activeSection === section.id ? 'bg-slate-900 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'
                                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                        >
                            <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center ${activeSection === section.id ? 'text-white' : 'text-gray-500'}`}>
                                {/* Simple icon placeholder based on first letter if no icon provided, or could map specific icons later */}
                                <span className="uppercase text-xs font-bold">{section.label.charAt(0)}</span>
                            </div>
                            {!isCollapsed && (
                                <span className="flex-1 text-left truncate">{section.label}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Footer / Back to User Panel */}
                <div className="mt-auto px-4 border-t border-gray-100 pt-4 pb-4">
                    {!isCollapsed && (
                        <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to App
                        </Link>
                    )}
                </div>

                {/* Collapse/Expand button when collapsed */}
                {isCollapsed && (
                    <div className="mt-auto pb-4 flex justify-center">
                        <button
                            onClick={toggleCollapse}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Expand sidebar"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Resize Handle */}
            <div
                onMouseDown={handleMouseDown}
                className={`absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors group ${isResizing ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-400'
                    }`}
            >
                <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 w-3 h-8 bg-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-0.5 h-4 bg-gray-500 rounded-full" />
                </div>
            </div>
        </aside>
    );
};

export default AdminSidebar;
