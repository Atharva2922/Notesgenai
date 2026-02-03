import crypto from "crypto";

export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const hashOtp = (code: string) => crypto.createHash("sha256").update(code).digest("hex");

export const isOtpExpired = (expiresAt: Date | string | number) => {
    const expiry = new Date(expiresAt);
    return Number.isNaN(expiry.getTime()) || expiry.getTime() < Date.now();
};
