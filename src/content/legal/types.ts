/**
 * Legal documents (Terms of Use, Privacy Policy) as data, rendered by `LegalDocument`.
 * Inline `**bold**` is supported in every string.
 */
export type LegalBlock =
  | string
  | { list: string[]; ordered?: boolean }
  | { table: { head: string[]; rows: string[][] } }
  | { note: string };

export interface LegalSection {
  /** Anchor id, stable across languages (links point to it). */
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  eyebrow: string;
  title: string;
  /** One paragraph shown under the title. */
  lead: string;
  sections: LegalSection[];
}

/** Interface words of the legal pages (not the documents themselves). */
export interface LegalUi {
  contents: string;
  effective: string;
  version: string;
  home: string;
  otherDoc: { terms: string; privacy: string };
  languageNote: string | null;
  backToTop: string;
}

export const LEGAL_VERSION = '1.0';
/** Date the current version takes effect (ISO). */
export const LEGAL_EFFECTIVE = '2026-11-14';
