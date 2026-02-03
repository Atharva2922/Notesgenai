
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/db";
import { hashOtp, isOtpExpired } from "@/lib/otp";
import OtpToken from "@/models/OtpToken";
import UserProfile, { IUserProfile } from "@/models/UserProfile";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const email = String(body?.email ?? "").trim().toLowerCase();
        const method = body?.method === "otp" ? "otp" : "password";
        const password = typeof body?.password === "string" ? body.password : "";
        const otp = typeof body?.otp === "string" ? body.otp : "";

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        await connectDB();

        let user: IUserProfile | null = null;

        if (method === "password") {
            if (password.length < 6) {
                return NextResponse.json({ error: "Invalid password." }, { status: 400 });
            }

            // Fetch user with password
            user = await UserProfile.findOne({ email }).select("+password");

            if (!user) {
                return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
            }

            if (!user.password) {
                return NextResponse.json({ error: "This account was created via OTP. Please use OTP login or reset your password." }, { status: 401 });
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
            }

            // Success (Password)
        } else if (method === "otp") {
            if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
                return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
            }

            const token = await OtpToken.findOne({ email });
            if (!token) {
                return NextResponse.json({ error: "OTP not found. Please request a new code." }, { status: 404 });
            }

            if (isOtpExpired(token.expiresAt)) {
                await OtpToken.deleteOne({ _id: token._id });
                return NextResponse.json({ error: "OTP expired. Request a new code." }, { status: 400 });
            }

            if (token.code !== hashOtp(otp)) {
                return NextResponse.json({ error: "Incorrect OTP." }, { status: 401 });
            }

            await OtpToken.deleteOne({ _id: token._id });
            // Success (OTP)

            user = await UserProfile.findOne({ email });
            if (!user) {
                return NextResponse.json({ error: "Account not found." }, { status: 404 });
            }
        }

        if (!user) {
            user = await UserProfile.findOne({ email });
        }

        if (!user) {
            return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: method === "otp" ? "OTP verified. Welcome back!" : "Signed in successfully.",
            profile: {
                slug: user.slug,
                name: user.name,
                email: user.email,
                plan: user.plan,
                creditsTotal: user.creditsTotal,
                creditsUsed: user.creditsUsed,
                status: user.status,
            },
        });
    } catch (error) {
        console.error("[auth/login] POST failed", error);
        return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
    }
}
