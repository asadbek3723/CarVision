const ACTIONS: Record<string, string> = {
  ADMIN_LOGIN: 'Admin tizimga kirdi',
  ASSIGN_PLAN: 'Tarif berildi',
  ADJUST_CREDITS: 'Kredit o‘zgartirildi',
  BAN_USER: 'Foydalanuvchi bloklandi',
  UNBAN_USER: 'Foydalanuvchi blokdan chiqarildi',
  VERIFY_SHOP: 'Ustaxona tasdiqlandi',
  UNVERIFY_SHOP: 'Ustaxona tasdig‘i olib tashlandi',
  APPROVE_DEPOSIT: 'Zakalat tasdiqlandi',
  REJECT_DEPOSIT: 'Zakalat rad etildi',
};

export function actionLabel(action: string): string {
  return ACTIONS[action] ?? action;
}

const ATTEMPTS: Record<string, string> = {
  login: 'Kirish',
  admin_pin: 'Admin PIN',
  register: 'Ro‘yxatdan o‘tish',
  otp: 'SMS kod',
  camera_session: 'Kamera sessiyasi',
};

export function attemptLabel(kind: string): string {
  return ATTEMPTS[kind] ?? kind;
}
