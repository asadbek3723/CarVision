/**
 * Reads a fetch Response as JSON without ever throwing.
 * Proxies answer oversized uploads (413), gateway errors (502/504) and crashes with HTML or plain
 * text, so `res.json()` blows up and the user sees nothing. This always returns a usable object
 * with a human readable `error` for the status.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SafeJson<T = Record<string, any>> {
  ok: boolean;
  status: number;
  data: T & { success?: boolean; error?: string; code?: string };
}

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Sessiya tugagan. Qaytadan tizimga kiring',
  403: 'Bu amal uchun ruxsat yo‘q',
  404: 'Topilmadi',
  413: 'Rasm juda katta. Kichikroq rasm tanlang',
  429: 'Juda ko‘p so‘rov. Birozdan keyin qayta urinib ko‘ring',
  502: 'Server javob bermadi. Qayta urinib ko‘ring',
  503: 'Xizmat vaqtincha ishlamayapti. Qayta urinib ko‘ring',
  504: 'So‘rov juda uzoq davom etdi. Qayta urinib ko‘ring',
};

export function statusMessage(status: number): string {
  return STATUS_MESSAGES[status] ?? (status >= 500 ? 'Serverda xatolik. Qayta urinib ko‘ring' : 'So‘rovni bajarib bo‘lmadi');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJson<T = Record<string, any>>(res: Response): Promise<SafeJson<T>> {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = await res.json();
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch {
    // not JSON (HTML error page from the platform): fall through to the status text
  }
  const ok = res.ok && data['success'] !== false;
  if (!ok && typeof data['error'] !== 'string') data['error'] = statusMessage(res.status);
  return { ok, status: res.status, data: data as SafeJson<T>['data'] };
}
