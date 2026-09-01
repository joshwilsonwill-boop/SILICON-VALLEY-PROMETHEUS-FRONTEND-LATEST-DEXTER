import { S3Client } from "@aws-sdk/client-s3";

const accountId = (process.env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID_3 || process.env.R2_ACCOUNT_ID_2)?.trim();
const accessKeyId = (process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID_3 || process.env.R2_ACCESS_KEY_ID_2)?.trim();
const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY_3 || process.env.R2_SECRET_ACCESS_KEY_2)?.trim();

if (!accountId || !accessKeyId || !secretAccessKey) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error("Missing R2 configuration environment variables");
  } else {
    console.warn("R2 environment variables are missing. R2 features will fail.");
  }
}

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || "missing",
    secretAccessKey: secretAccessKey || "missing",
  },
});
