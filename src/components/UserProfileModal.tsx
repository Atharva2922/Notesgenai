"use client";

import React, { useState, useEffect } from "react";
import { UserProfile } from "@/types";
import { updateProfileFields } from "@/actions/userProfile";

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile | null;
    onUpdate: (updatedUser: UserProfile) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
    isOpen,
    onClose,
    user,
    onUpdate,
}) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            // Don't set password, it's new only
        }
    }, [user, isOpen]);

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            setError(null);
            setSuccess(null);
            setPassword("");
            setConfirmPassword("");
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setError(null);
        setSuccess(null);

        if (password && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password && password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setIsSubmitting(true);

        try {
            const updates: any = { name };
            if (password) {
                updates.password = password;
            }

            const updatedProfile = await updateProfileFields(user.slug, updates);

            if (updatedProfile) {
                onUpdate(updatedProfile);
                setSuccess("Profile updated successfully!");
                setPassword("");
                setConfirmPassword("");
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError("Failed to update profile.");
            }
        } catch (err) {
            console.error("Profile update error:", err);
            setError("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-1 hover:bg-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm font-medium border border-green-100">
                            {success}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-600">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none"
                        />
                        <p className="text-xs text-gray-400">Email cannot be changed.</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-300"
                            placeholder="Your Name"
                        />
                    </div>

                    <div className="pt-2 border-t border-gray-100 mt-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Change Password (Optional)</p>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-300"
                                    placeholder="Leave blank to keep current"
                                />
                            </div>

                            {password && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-blue-500/25 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserProfileModal;
