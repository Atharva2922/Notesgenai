import { Schema, model, models, Document } from "mongoose";

export interface IPlan extends Document {
    name: string;
    price: string;
    credits: string;
    activeUsers: number;
}

const PlanSchema = new Schema<IPlan>(
    {
        name: { type: String, required: true },
        price: { type: String, required: true },
        credits: { type: String, required: true },
        activeUsers: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const PlanModel = models.Plan || model<IPlan>("Plan", PlanSchema);

export default PlanModel;
