import { Schema, model, models, Document } from "mongoose";

export interface IAdminSetting extends Document {
    appName: string;
    logo: string;
    maxPdf: string;
    freeLimit: string;
    maxTokens: string;
    modelName: string;
    costCap: string;
}

const AdminSettingSchema = new Schema<IAdminSetting>(
    {
        appName: { type: String, default: "NotesGen Console" },
        logo: { type: String, default: "https://placehold.co/120x40" },
        maxPdf: { type: String, default: "40 MB" },
        freeLimit: { type: String, default: "100 credits" },
        maxTokens: { type: String, default: "8,000" },
        modelName: { type: String, default: "google/gemini-2.0-flash" },
        costCap: { type: String, default: "$250 / month" },
    },
    { timestamps: true }
);

const AdminSettingModel = models.AdminSetting || model<IAdminSetting>("AdminSetting", AdminSettingSchema);

export default AdminSettingModel;
