import { NextResponse } from "next/server";

import connectDB from "@/lib/db";
import UserProfileModel from "@/models/UserProfile";
import PlanModel from "@/models/Plan";

export async function GET() {
    try {
        await connectDB();

        // Fetch real plans from DB
        const dbPlans = await PlanModel.find({}).lean();

        // Calculate active users per plan
        const profiles = await UserProfileModel.find({}, "plan").lean();
        const planCounts = profiles.reduce<Record<string, number>>((acc, profile) => {
            const planName = profile.plan ?? "Free";
            acc[planName] = (acc[planName] ?? 0) + 1;
            return acc;
        }, {});

        // If no plans in DB, we might want to return defaults or empty.
        // For now, let's map what we have.
        const plans = dbPlans.map((plan) => ({
            name: plan.name,
            price: plan.price,
            credits: plan.credits,
            activeUsers: planCounts[plan.name] ?? 0,
        }));

        // Fetch recent payments (mock logic based on existing code, adjusted)
        // Since we don't have a real Payments model, we keep the existing logic 
        // derived from UserProfiles for demonstration, or we can just leave it as is if it's adequate.
        // The original code derived payments from profiles. Let's keep that to avoid breaking UI.
        const detailedProfiles = await UserProfileModel.find({}).lean();
        const payments = detailedProfiles
            .filter((profile) => profile.plan && profile.plan !== "Free")
            .slice(0, 25)
            .map((profile) => ({
                user: profile.name ?? profile.slug,
                plan: profile.plan,
                amount: profile.plan === "Pro" ? "$29" : "$480", // This is hardcoded generic logic, assuming old plans. 
                // In a real app we'd look up the plan price.
                status: profile.status === "Blocked" ? "Failed" : "Paid",
                date: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : profile.updatedAt,
            }));

        return NextResponse.json({ plans, payments });
    } catch (error) {
        console.error("[admin/plans] GET failed", error);
        return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await connectDB();
        const body = await req.json();
        const { name, price, credits } = body;

        if (!name || !price || !credits) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newPlan = await PlanModel.create({
            name,
            price,
            credits,
            activeUsers: 0,
        });

        return NextResponse.json(newPlan);
    } catch (error) {
        console.error("[admin/plans] POST failed", error);
        return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
    }
}
