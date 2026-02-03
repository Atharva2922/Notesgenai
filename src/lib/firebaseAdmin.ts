import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";

let cachedApp: App | null = null;
let cachedAuth: Auth | null = null;

const buildCredential = () => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT env var is missing. Provide the Firebase service account JSON string (escaped) to enable Google OAuth."
    );
  }

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(serviceAccountJson);
  } catch (error) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT must be valid JSON.");
  }

  const projectId = parsed.projectId ?? parsed.project_id;
  const clientEmail = parsed.clientEmail ?? parsed.client_email;
  const privateKey = parsed.privateKey ?? parsed.private_key;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT JSON must include projectId, clientEmail, and privateKey.");
  }

  return { projectId, clientEmail, privateKey };
};

const getFirebaseAdminApp = (): App => {
  if (cachedApp) return cachedApp;

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT env var is missing.");
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('[Firebase Admin] Initializing with project:', serviceAccount.project_id);

    cachedApp = getApps().length ? getApps()[0]! : initializeApp({
      credential: cert(serviceAccount),
    });

    console.log('[Firebase Admin] Successfully initialized');
    return cachedApp;
  } catch (error) {
    console.error('[Firebase Admin] Initialization failed');
    console.error('[Firebase Admin] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('[Firebase Admin] Full error:', JSON.stringify(error, null, 2));
    throw error;
  }
};

export const getFirebaseAdminAuth = (): Auth => {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseAdminApp();
  cachedAuth = getAuth(app);
  return cachedAuth;
};
