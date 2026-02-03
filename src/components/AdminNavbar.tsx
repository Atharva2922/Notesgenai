"use client";

import React from "react";
import { useTheme } from "@/components/ThemeProvider";

interface AdminNavbarProps {
    onSearch: (query: string) => void;
}

const AdminNavbar: React.FC<AdminNavbarProps> = ({ onSearch }) => {
    const { theme, toggleTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("notesgenProfile");
        window.location.href = "/login";
    };

    return (
        <nav className="fixed top-0 left-0 right-0 bg-[var(--panel-solid)] border-b border-[var(--border-strong)] h-14 flex items-center px-4 z-50 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--panel-solid)_92%,transparent)] font-sans">
            <div className="flex items-center gap-2 mr-4 flex-shrink-0">
                <div className="rounded-full p-1 w-8 h-8 flex items-center justify-center bg-gray-800 text-white font-bold text-xs">
                    AD
                </div>
                <span className="font-bold text-xl hidden md:block text-[var(--text-primary)]">
                    Admin Console
                </span>
            </div>

            <div className="flex-1 max-w-2xl mx-auto px-4 w-full">
                {/* Search could be added here if there's a global admin search, for now kept as placeholder or limited */}
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Search Admin..."
                        onChange={(e) => onSearch(e.target.value)}
                        className="w-full bg-[var(--input-bg)] text-[var(--text-primary)] border border-transparent rounded-full py-2 px-10 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:bg-[color-mix(in_srgb,var(--input-bg)_70%,white)] transition-all text-sm placeholder:text-[var(--text-muted)]/70"
                    />
                    <svg
                        className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
                <button
                    onClick={toggleTheme}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
                    aria-label="Toggle color theme"
                >
                    <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3v2m0 14v2m7-9h2M3 12H1m16.95 6.95-1.414-1.414M6.464 6.464 5.05 5.05m13.9 0-1.414 1.414M6.464 17.536 5.05 18.95M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                        />
                    </svg>
                    {theme === "light" ? "Light" : "Dark"}
                </button>

                <div className="relative" ref={dropdownRef}>
                    <div
                        className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border border-[var(--border-strong)] bg-slate-900 text-white flex items-center justify-center font-bold text-xs"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        NG
                    </div>

                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-[var(--panel-solid)] border border-[var(--border-strong)] rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-2 border-b border-[var(--border-soft)]">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Administrator</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default AdminNavbar;
