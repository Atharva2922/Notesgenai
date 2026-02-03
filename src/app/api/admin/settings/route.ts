import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/db";
import AdminSettingModel from "@/models/AdminSetting";

const toDto = (doc: any) => ({
    id: doc._id?.toString(),
    appName: doc.appName,
    logo: doc.logo,
    maxPdf: doc.maxPdf,
    freeLimit: doc.freeLimit,
    maxTokens: doc.maxTokens,
    modelName: doc.modelName,
    costCap: doc.costCap,
});

export async function GET() {
    try {
        await connectDB();
        const existing = await AdminSettingModel.findOne({});
        if (!existing) {
            const created = await AdminSettingModel.create({});
            return NextResponse.json(toDto(created));
        }
        return NextResponse.json(toDto(existing));
    } catch (error) {
        console.error("[admin/settings] GET failed", error);
        return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const updated = await AdminSettingModel.findOneAndUpdate({}, body, { new: true, upsert: true, setDefaultsOnInsert: true });
        return NextResponse.json(toDto(updated));
    } catch (error) {
        console.error("[admin/settings] PATCH failed", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
