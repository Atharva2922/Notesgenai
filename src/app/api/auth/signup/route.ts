
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import UserProfile from "@/models/UserProfile";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const name = String(body?.name ?? "").trim();
        const email = String(body?.email ?? "").trim().toLowerCase();
        const password = typeof body?.password === "string" ? body.password : "";

        if (!name || !email || password.length < 6) {
            return NextResponse.json({ error: "Name, email, and a 6+ character password are required." }, { status: 400 });
        }

        await connectDB();

        // Check if user already exists
        const existingUser = await UserProfile.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: "User with this email already exists." }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate slug (simple version)
        const baseSlug = email.split('@')[0].replace(/[^a-z0-9]/g, '');
        const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

        // Create user
        await UserProfile.create({
            name,
            email,
            password: hashedPassword,
            slug,
            plan: 'Free',
            status: 'Active'
        });

        return NextResponse.json({
            success: true,
            message: "Account created successfully. You can now log in.",
        });
    } catch (error) {
        console.error("[auth/signup] POST failed", error);
        return NextResponse.json({ error: "Unable to create account right now." }, { status: 500 });
    }
}
