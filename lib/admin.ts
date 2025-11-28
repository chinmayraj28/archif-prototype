const RAW_ADMIN_EMAILS =
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
  process.env.ADMIN_EMAILS ||
  "admin@example.com";

export const ADMIN_EMAILS = RAW_ADMIN_EMAILS.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.some((allowed) => allowed === email.toLowerCase());
}

