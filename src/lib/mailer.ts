import nodemailer, { Transporter } from "nodemailer";

type MailPayload = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

let cachedTransport: Transporter | null = null;

const getTransport = () => {
    if (cachedTransport) {
        return cachedTransport;
    }

    const host = process.env.MAIL_HOST;
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;
    const port = Number(process.env.MAIL_PORT ?? 465);

    if (!host || !user || !pass) {
        throw new Error("SMTP credentials (MAIL_HOST, MAIL_USER, MAIL_PASS) are not configured.");
    }

    cachedTransport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });

    return cachedTransport;
};

export async function sendMail(payload: MailPayload) {
    const from = process.env.MAIL_FROM || process.env.MAIL_USER;

    // Development mode: Log to console if SMTP is not configured
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const hasSmtpConfig = process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS;

    if (isDevelopment && !hasSmtpConfig) {
        console.log('\n' + '='.repeat(80));
        console.log('📧 [DEV MODE] Email would be sent:');
        console.log('='.repeat(80));
        console.log(`To: ${payload.to}`);
        console.log(`Subject: ${payload.subject}`);
        console.log(`From: ${from || 'noreply@notesgen.local'}`);
        console.log('-'.repeat(80));
        console.log('Content:');
        console.log(payload.text ?? payload.html.replace(/<[^>]+>/g, ""));
        console.log('='.repeat(80) + '\n');
        return; // Don't actually send email in dev mode
    }

    if (!from) {
        throw new Error("MAIL_FROM or MAIL_USER must be set to send emails.");
    }

    const transporter = getTransport();

    await transporter.sendMail({
        from,
        ...payload,
        text: payload.text ?? payload.html.replace(/<[^>]+>/g, ""),
    });
}
