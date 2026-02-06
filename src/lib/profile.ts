import { IUserProfile } from "@/models/UserProfile";

const toDateString = (value?: Date | string | number) => {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const serializeProfile = (profile: Partial<IUserProfile> & { [key: string]: any }) => {
    if (!profile) {
        return null;
    }

    return {
        slug: profile.slug,
        name: profile.name,
        email: profile.email,
        plan: profile.plan,
        planId: profile.planId,
        creditsTotal: profile.creditsTotal,
        creditsUsed: profile.creditsUsed,
        status: profile.status,
        joinedAt: toDateString(profile.joinedAt),
        lastActive: toDateString(profile.lastActive),
        createdAt: toDateString(profile.createdAt),
        updatedAt: toDateString(profile.updatedAt),
    };
};
