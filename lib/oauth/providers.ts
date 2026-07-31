export interface ProviderConfig {
  name: string;
  authorizeUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  scopes: string[];
  scopeSeparator: " " | ",";
  pkce: boolean;
  clientIdParam?: string; // Default: client_id
  clientIdEnvVar?: string; // Default: PROVIDER_CLIENT_ID
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  google_drive: {
    name: "Google Drive",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
    scopeSeparator: " ",
    pkce: true,
    clientIdEnvVar: "GOOGLE_CLIENT_ID",
  },
  youtube: {
    name: "YouTube",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
    scopeSeparator: " ",
    pkce: true,
    clientIdEnvVar: "YOUTUBE_CLIENT_ID",
  },
  tiktok: {
    name: "TikTok",
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    revokeUrl: "https://open.tiktokapis.com/v2/oauth/revoke/",
    scopes: ["video.upload", "video.list", "user.info.basic"],
    scopeSeparator: ",",
    pkce: true,
    clientIdParam: "client_key",
    clientIdEnvVar: "TIKTOK_CLIENT_KEY",
  },
  instagram: {
    name: "Instagram",
    authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_content_publish"],
    scopeSeparator: ",",
    pkce: false,
    clientIdEnvVar: "FACEBOOK_CLIENT_ID",
  },
  x: {
    name: "X (Twitter)",
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    revokeUrl: "https://api.twitter.com/2/oauth2/revoke",
    scopes: ["tweet.write", "users.read", "offline.access"],
    scopeSeparator: " ",
    pkce: true,
    clientIdEnvVar: "X_CLIENT_ID",
  },
  facebook: {
    name: "Facebook",
    authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    revokeUrl: "https://graph.facebook.com/v18.0/me/permissions",
    scopes: ["pages_manage_posts", "pages_read_engagement"],
    scopeSeparator: ",",
    pkce: false,
    clientIdEnvVar: "FACEBOOK_CLIENT_ID",
  },
  linkedin: {
    name: "LinkedIn",
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    revokeUrl: "https://www.linkedin.com/oauth/v2/revoke",
    scopes: ["w_member_social", "r_basicprofile"],
    scopeSeparator: " ",
    pkce: true,
    clientIdEnvVar: "LINKEDIN_CLIENT_ID",
  },
  dropbox: {
    name: "Dropbox",
    authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    revokeUrl: "https://api.dropboxapi.com/2/auth/token/revoke",
    scopes: [],
    scopeSeparator: " ",
    pkce: true,
    clientIdEnvVar: "DROPBOX_CLIENT_ID",
  },
};
