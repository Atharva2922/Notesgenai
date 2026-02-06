import { NextResponse } from "next/server";

import connectDB from "@/lib/db";
import UserProfileModel from "@/models/UserProfile";
import PlanModel from "@/models/Plan";
import PaymentModel from "@/models/Payment";
import { formatCurrency, normalizePlanPayload, serializePlan } from "./helpers";

const mapActiveUsers = (profiles: Array<{ plan?: string | null; planId?: string | null }>) =>
    profiles.reduce<Record<string, number>>((acc, profile) => {
        const planKey = profile.planId || profile.plan || "Free";
        acc[planKey] = (acc[planKey] ?? 0) + 1;
        return acc;
    }, {});

export async function GET() {
    try {
        await connectDB();

        const [plans, profiles, payments] = await Promise.all([
            PlanModel.find({}).sort({ createdAt: 1 }).lean(),
            UserProfileModel.find({}, "plan planId").lean(),
            PaymentModel.find({}).sort({ createdAt: -1 }).limit(25).lean(),
        ]);

        const activeUsers = mapActiveUsers(profiles);
        const planRows = plans.map((plan) => serializePlan(plan, { activeUsers }));
        const paymentRows = payments.map((payment) => ({
            user: payment.userSlug,
            plan: payment.planName,
            amount: formatCurrency(payment.amount, payment.currency),
            status: payment.status === "paid" ? "Paid" : payment.status === "failed" ? "Failed" : "Pending",
            date:
                payment.createdAt instanceof Date
                    ? payment.createdAt.toISOString()
                    : payment.createdAt?.toString() ?? new Date().toISOString(),
        }));

        return NextResponse.json({ plans: planRows, payments: paymentRows });
    } catch (error) {
        console.error("[admin/plans] GET failed", error);
        return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        await connectDB();
        const body = await req.json();
        const identifier = body?.planId || body?.id;
        if (!identifier) {
            return NextResponse.json({ error: "Missing plan identifier" }, { status: 400 });
        }

        const payload = normalizePlanPayload(body);
        if (!Object.keys(payload).length) {
            return NextResponse.json({ error: "No fields provided for update" }, { status: 400 });
        }

        const selector = body?.planId ? { planId: body.planId } : { _id: body?.id };
        const updated = await PlanModel.findOneAndUpdate(selector, { $set: payload }, { new: true });

        if (!updated) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        return NextResponse.json({ plan: serializePlan(updated) });
    } catch (error) {
        console.error("[admin/plans] PATCH failed", error);
        return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        await connectDB();
        const body = await req.json().catch(() => ({}));
        const identifier = body?.planId || body?.id;
        if (!identifier) {
            return NextResponse.json({ error: "Missing plan identifier" }, { status: 400 });
        }

        const selector = body?.planId ? { planId: body.planId } : { _id: body?.id };
        const result = await PlanModel.findOneAndDelete(selector);
        if (!result) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[admin/plans] DELETE failed", error);
        return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await connectDB();
        const body = await req.json();
        const payload = normalizePlanPayload(body);

        if (!payload.name || !payload.price || !payload.credits || !payload.amountInPaise) {
            return NextResponse.json(
                { error: "Missing required fields: name, price, credits, and billing amount." },
                { status: 400 }
            );
        }

        if (!payload.currency) {
            payload.currency = "INR";
        }

        const newPlan = await PlanModel.create(payload);
        return NextResponse.json({ plan: serializePlan(newPlan) }, { status: 201 });
    } catch (error) {
        console.error("[admin/plans] POST failed", error);
        return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
    }
}
