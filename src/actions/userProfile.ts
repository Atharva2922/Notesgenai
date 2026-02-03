"use server";

import connectDB from "@/lib/db";
import UserProfileModel, { IUserProfile, IUserFact } from "@/models/UserProfile";
import { DEFAULT_PROFILE, DEFAULT_SLUG, slugFromEmail } from "@/lib/userDefaults";
import { UserProfile, UserFact } from "@/types";

const normalizeProfile = (profile: IUserProfile): UserProfile => ({
    slug: profile.slug,
    name: profile.name,
    email: profile.email,
    plan: profile.plan,
    creditsTotal: profile.creditsTotal,
    creditsUsed: profile.creditsUsed,
    status: profile.status,
    joinedAt: profile.joinedAt?.getTime(),
    lastActive: profile.lastActive?.getTime(),
    facts: profile.facts.map((fact) => ({
        key: fact.key,
        value: fact.value,
        source: fact.source,
        updatedAt: fact.updatedAt ? fact.updatedAt.getTime() : undefined,
    })),
    createdAt: profile.createdAt.getTime(),
    updatedAt: profile.updatedAt.getTime(),
});

export async function getOrCreateProfile(slug: string = DEFAULT_SLUG): Promise<UserProfile> {
    await connectDB();
    const existing = await UserProfileModel.findOne({ slug });
    if (existing) {
        return normalizeProfile(existing);
    }

    const created = await UserProfileModel.create({ ...DEFAULT_PROFILE, slug });
    return normalizeProfile(created);
}

export async function upsertFacts(facts: UserFact[], slug: string = DEFAULT_SLUG): Promise<UserProfile> {
    if (!facts.length) {
        return getOrCreateProfile(slug);
    }
    await connectDB();
    const profile =
        (await UserProfileModel.findOne({ slug })) ||
        (await UserProfileModel.create({ ...DEFAULT_PROFILE, slug }));

    facts.forEach((fact: UserFact) => {
        const existing = profile.facts.find((stored: IUserFact) => stored.key === fact.key);
        if (existing) {
            existing.value = fact.value;
            existing.source = fact.source;
            existing.updatedAt = new Date();
        } else {
            profile.facts.push({
                key: fact.key,
                value: fact.value,
                source: fact.source,
            } as IUserFact);
        }
    });

    profile.lastActive = new Date();
    await profile.save();
    return normalizeProfile(profile);
}

export async function updateCredits(slug: string, delta: number): Promise<UserProfile> {
    await connectDB();
    const profile =
        (await UserProfileModel.findOne({ slug })) ||
        (await UserProfileModel.create({ ...DEFAULT_PROFILE, slug }));

    profile.creditsUsed = Math.max(0, profile.creditsUsed + delta);
    profile.lastActive = new Date();
    await profile.save();
    return normalizeProfile(profile);
}

export async function updateProfileFields(slug: string, updates: Partial<IUserProfile>): Promise<UserProfile | null> {
    await connectDB();

    // If password is being updated, hash it
    if (updates.password) {
        const bcrypt = (await import("bcryptjs")).default;
        updates.password = await bcrypt.hash(updates.password, 10);
    }

    const profile = await UserProfileModel.findOneAndUpdate(
        { slug },
        { $set: updates, $currentDate: { lastActive: true } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return profile ? normalizeProfile(profile) : null;
}
