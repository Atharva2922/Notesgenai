import { Schema, model, models, Document } from "mongoose";

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);

export interface IPlan extends Document {
    planId: string;
    name: string;
    price: string;
    priceSuffix?: string;
    credits: string;
    creditLimit?: number;
    badge?: string;
    description?: string;
    features?: string[];
    highlight?: boolean;
    currency?: string;
    amountInPaise?: number;
    activeUsers: number;
}

const PlanSchema = new Schema<IPlan>(
    {
        planId: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        price: { type: String, required: true },
        priceSuffix: { type: String },
        credits: { type: String, required: true },
        creditLimit: { type: Number },
        badge: { type: String },
        description: { type: String },
        features: { type: [String], default: [] },
        highlight: { type: Boolean, default: false },
        currency: { type: String, default: "INR" },
        amountInPaise: { type: Number },
        activeUsers: { type: Number, default: 0 },
    },
    { timestamps: true }
);

PlanSchema.pre<IPlan>("validate", function validatePlanId() {
    if (!this.planId) {
        const base = slugify(this.name || "plan");
        this.planId = `${base}-${Date.now().toString(36)}`;
    }
});

const PlanModel = models.Plan || model<IPlan>("Plan", PlanSchema);

export default PlanModel;
