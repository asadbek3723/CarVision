/**
 * Official contacts, set once in the environment and used everywhere: the landing footer and the
 * Organization JSON-LD (`sameAs`, `email`). Search engines and AI assistants use them to tie the
 * brand to its real profiles, so a link is shown only when it is configured; never a dead `#`.
 *
 *  NEXT_PUBLIC_SOCIAL_LINKS   comma-separated https URLs (Telegram, Instagram, YouTube...)
 *  NEXT_PUBLIC_SUPPORT_EMAIL  e.g. support@carvision.uz
 */
export type SocialNetwork = 'telegram' | 'instagram' | 'youtube' | 'linkedin' | 'x' | 'facebook' | 'tiktok';

const HOSTS: Array<[RegExp, SocialNetwork]> = [
  [/(^|\.)(t\.me|telegram\.me)$/, 'telegram'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)linkedin\.com$/, 'linkedin'],
  [/(^|\.)(x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)facebook\.com$/, 'facebook'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
];

// Literal `process.env.NEXT_PUBLIC_*` reads so Next inlines them into the client bundle too.
const RAW_LINKS = process.env.NEXT_PUBLIC_SOCIAL_LINKS || '';
const RAW_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';

export function socialLinks(): string[] {
  return RAW_LINKS.split(',')
    .map((s) => s.trim())
    .filter((s) => /^https:\/\//.test(s));
}

/** Configured profiles with the network each belongs to (unknown hosts are skipped). */
export function socialProfiles(): Array<{ network: SocialNetwork; url: string }> {
  return socialLinks().flatMap((url) => {
    let host = '';
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return [];
    }
    const hit = HOSTS.find(([re]) => re.test(host));
    return hit ? [{ network: hit[1], url }] : [];
  });
}

export function supportEmail(): string | null {
  const email = RAW_EMAIL.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
