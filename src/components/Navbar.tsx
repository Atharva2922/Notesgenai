"use client";

import React from "react";
import { useTheme } from "@/components/ThemeProvider";

interface NavbarProps {
  onSearch: (query: string) => void;
  onUpgrade?: () => void;
  onMobileMenuClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch, onUpgrade, onMobileMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState<any>(null); // Using any temporarily to avoid type issues if imports fail, but ideally UserProfile
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("notesgenProfile");
      if (stored) {
        setUserProfile(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse profile", e);
    }

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

  const handleProfileUpdate = (updated: any) => {
    setUserProfile(updated);
    localStorage.setItem("notesgenProfile", JSON.stringify(updated));
  };

  // Dynamic import for Modal to avoid server-side issues if any, though client component is fine
  const UserProfileModal = React.lazy(() => import("@/components/UserProfileModal"));

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-[var(--panel-solid)] border-b border-[var(--border-strong)] h-14 flex items-center px-4 z-50 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--panel-solid)_92%,transparent)]">
        <div className="flex items-center gap-3 mr-4 flex-shrink-0">
          <button
            onClick={onMobileMenuClick}
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="rounded-full p-1 w-8 h-8 flex items-center justify-center bg-[var(--accent)] text-white font-bold text-xs">
            AI
          </div>
          <span className="font-bold text-xl hidden md:block text-[var(--accent-strong)]">
            NotesGen
          </span>
        </div>

        <div className="flex-1 max-w-2xl mx-auto px-4 w-full">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search AI Notes..."
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
          <button
            onClick={() => onUpgrade?.()}
            className="px-4 py-1.5 rounded-full text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[color-mix(in_srgb,var(--accent)_80%,black)] transition-colors"
          >
            Upgrade
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div
              className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border border-[var(--border-strong)] hover:ring-2 hover:ring-[var(--accent)]/50 transition-all"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <img src={`https://ui-avatars.com/api/?name=${userProfile?.name || 'User'}&background=random`} alt="Profile" />
            </div>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[var(--panel-solid)] border border-[var(--border-strong)] rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-[var(--border-soft)]">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{userProfile?.name || 'User'}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{userProfile?.email || 'user@example.com'}</p>
                </div>
                <button
                  onClick={() => { setIsDropdownOpen(false); setIsProfileModalOpen(true); }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--input-bg)] flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Edit Profile
                </button>
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
      <React.Suspense fallback={null}>
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={userProfile}
          onUpdate={handleProfileUpdate}
        />
      </React.Suspense>
    </>
  );
};

export default Navbar;
