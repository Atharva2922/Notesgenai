import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

import connectDB from "@/lib/db";
import PaymentModel from "@/models/Payment";
import PlanModel from "@/models/Plan";
import { PLAN_DEFINITIONS, PlanDefinition } from "@/lib/plans";

const ensureEnv = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        throw new Error("Missing Razorpay credentials");
    }
    return { keyId, keySecret };
};

const findPlan = async (planId: string): Promise<PlanDefinition | null> => {
    const localPlan = PLAN_DEFINITIONS[planId];
    if (localPlan) return localPlan;

    await connectDB();
    const dbPlan = await PlanModel.findOne({ name: planId }).lean();
    if (!dbPlan) return null;

    return {
        id: dbPlan.name,
        name: dbPlan.name,
        badge: dbPlan.badge,
        price: dbPlan.price,
        priceSuffix: dbPlan.priceSuffix,
        description: dbPlan.description,
        creditLimit: dbPlan.creditLimit,
        features: dbPlan.features,
        highlight: dbPlan.highlight,
        currency: dbPlan.currency,
        amountInPaise: dbPlan.amountInPaise,
    };
};

export async function POST(request: NextRequest) {
    try {
        const { planId, slug } = await request.json();
        if (!planId || !slug) {
            return NextResponse.json({ error: "planId and slug are required" }, { status: 400 });
        }

        const plan = await findPlan(planId);
        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        if (!plan.amountInPaise || plan.amountInPaise <= 0) {
            return NextResponse.json({ error: "Plan amount is not configured" }, { status: 400 });
        }

        const { keyId, keySecret } = ensureEnv();
        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

        const order = await razorpay.orders.create({
            amount: plan.amountInPaise,
            currency: plan.currency ?? "INR",
            notes: {
                planId: plan.id,
                planName: plan.name,
                userSlug: slug,
            },
        });

        await connectDB();
        await PaymentModel.create({
            userSlug: slug,
            planId: plan.id,
            planName: plan.name,
            amount: plan.amountInPaise / 100,
            currency: plan.currency ?? "INR",
            status: "created",
            razorpayOrderId: order.id,
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || keyId,
            plan,
        });
    } catch (error) {
        console.error("[payments/order] POST failed", error);
        return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
    }
}
