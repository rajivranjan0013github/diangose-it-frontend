import admin from 'firebase-admin';

let serviceAccount;

// Try to load the local file if the env var is missing
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const mod = await import('./serviceAccountKey.json', { with: { type: 'json' } });
    serviceAccount = mod.default;
  } catch (e) {
    console.warn("Firebase: serviceAccountKey.json not found.");
  }
}

if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let rawConfig = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      // Strip surrounding quotes if they exist (common issue with some .env loaders)
      if ((rawConfig.startsWith("'") && rawConfig.endsWith("'")) ||
        (rawConfig.startsWith('"') && rawConfig.endsWith('"'))) {
        rawConfig = rawConfig.slice(1, -1);
      }

      const sa = JSON.parse(rawConfig);
      if (sa.private_key) {
        // Handle various newline escaping scenarios
        sa.private_key = sa.private_key.replace(/\\n/g, '\n');
      }
      credential = admin.credential.cert(sa);
    } catch (e) {
      console.error("Firebase: Error parsing FIREBASE_SERVICE_ACCOUNT env var:", e.message);
    }
  }

  if (!credential && serviceAccount) {
    credential = admin.credential.cert(serviceAccount);
  }

  if (credential) {
    try {
      admin.initializeApp({ credential });
    } catch (error) {
      console.error("Firebase Initialization Error:", error.message);
    }
  } else {
    console.warn("Firebase: No credentials found, using applicationDefault");
    admin.initializeApp();
  }
}

export { admin };