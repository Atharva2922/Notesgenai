import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/db";
import { getFirebaseAdminAuth } from "@/lib/firebaseAdmin";
import UserProfile from "@/models/UserProfile";
import { slugFromEmail } from "@/lib/userDefaults";

const serializeProfile = (user: any) => ({
  slug: user.slug,
  name: user.name,
  email: user.email,
  plan: user.plan,
  creditsTotal: user.creditsTotal,
  creditsUsed: user.creditsUsed,
  status: user.status,
});

async function ensureUser(email: string, name?: string) {
  await connectDB();
  let user = await UserProfile.findOne({ email });
  if (user) {
    user.lastActive = new Date();
    await user.save();
    return user;
  }

  const baseSlug = slugFromEmail(email);
  let slug = baseSlug;
  let suffix = 1;
  // Guarantee slug uniqueness
  while (await UserProfile.exists({ slug })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  user = await UserProfile.create({
    name: name || email.split("@")[0] || "NotesGen User",
    email,
    slug,
    plan: "Free",
    status: "Active",
    creditsTotal: 150,
    creditsUsed: 0,
  });

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const idToken = typeof body?.idToken === "string" ? body.idToken : "";

    if (!idToken) {
      return NextResponse.json({ error: "Google ID token missing" }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Google account email not available" }, { status: 400 });
    }

    const user = await ensureUser(email, decoded.name ?? decoded.email);

    if (user.status === "Blocked") {
      return NextResponse.json({ error: "This account is blocked." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: "Signed in with Google.",
      profile: serializeProfile(user),
    });
  } catch (error) {
    console.error("[auth/google] POST failed", error);
    return NextResponse.json({ error: "Unable to verify Google sign-in." }, { status: 500 });
  }
}
