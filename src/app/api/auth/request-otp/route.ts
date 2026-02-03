import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { generateOtp, hashOtp } from "@/lib/otp";
import OtpToken from "@/models/OtpToken";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const email = String(body?.email ?? "").trim().toLowerCase();

        if (!email || (!email.endsWith("@gmail.com") && !email.endsWith("@test.com"))) {
            return NextResponse.json({ error: "Please provide a valid Gmail address." }, { status: 400 });
        }

        await connectDB();

        // Check if user exists
        // We only allow OTP login for EXISTING users. New users must register first.
        const UserProfile = (await import("@/models/UserProfile")).default;
        const existingUser = await UserProfile.findOne({ email });

        if (!existingUser) {
            return NextResponse.json({
                error: "Account not found. Please click 'I'm new here' to create an account."
            }, { status: 404 });
        }

        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // DEV: Write OTP to file for testing
        const fs = await import('fs');
        const path = await import('path');
        fs.writeFileSync(path.join(process.cwd(), 'otp_temp.txt'), code);

        await OtpToken.findOneAndUpdate(
            { email },
            { code: hashOtp(code), expiresAt },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        await sendMail({
            to: email,
            subject: "Your NotesGen login code",
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <p>Hi there,</p>
                    <p>Use the following one-time code to finish signing in to <strong>NotesGen</strong>:</p>
                    <p style="font-size: 28px; letter-spacing: 8px; font-weight: bold;">${code}</p>
                    <p>This code expires in 10 minutes. If you didn’t request it, you can safely ignore this email.</p>
                </div>
            `,
        });

        return NextResponse.json({
            success: true,
            message: "OTP sent to your Gmail inbox.",
        });
    } catch (error) {
        console.error("[auth/request-otp] POST failed", error);
        return NextResponse.json({ error: "Unable to send OTP right now." }, { status: 500 });
    }
}
