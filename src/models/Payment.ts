import { Schema, model, models, Document } from "mongoose";

export type PaymentStatus = "created" | "paid" | "failed";

export interface IPayment extends Document {
    userSlug: string;
    planId: string;
    planName: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    metadata?: Record<string, any>;
    errorMessage?: string;
}

const PaymentSchema = new Schema<IPayment>(
    {
        userSlug: { type: String, required: true },
        planId: { type: String, required: true },
        planName: { type: String, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: "INR" },
        status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },
        metadata: { type: Schema.Types.Mixed },
        errorMessage: { type: String },
    },
    { timestamps: true }
);

const PaymentModel = models.Payment || model<IPayment>("Payment", PaymentSchema);

export default PaymentModel;
