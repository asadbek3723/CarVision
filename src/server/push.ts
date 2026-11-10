import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Web push notifications. Every call is best-effort: a missing key, a missing table or a push
 * service outage must never break the order flow that triggered it, so errors are logged and dropped.
 */

export type PushEvent = 'order_approved' | 'order_rejected' | 'refund_done' | 'new_paid_order' | 'payout_paid';

type Copy = { title: string; body: string };
const COPY: Record<PushEvent, Record<string, Copy>> = {
  order_approved: {
    uz: { title: 'To‘lov tasdiqlandi', body: 'Buyurtmangiz tayyor. Ustaxona manzili ochildi.' },
    ru: { title: 'Оплата подтверждена', body: 'Заказ готов. Адрес мастерской открыт.' },
    en: { title: 'Payment confirmed', body: 'Your order is ready. The workshop address is now open.' },
    ar: { title: 'تم تأكيد الدفع', body: 'طلبك جاهز. تم فتح عنوان الورشة.' },
    tr: { title: 'Ödeme onaylandı', body: 'Siparişiniz hazır. Atölye adresi açıldı.' },
    kk: { title: 'Төлем расталды', body: 'Тапсырыс дайын. Шеберхана мекенжайы ашылды.' },
    ky: { title: 'Төлөм ырасталды', body: 'Буйрутма даяр. Устакананын дареги ачылды.' },
    tg: { title: 'Пардохт тасдиқ шуд', body: 'Фармоиш омода аст. Суроғаи устохона кушода шуд.' },
  },
  order_rejected: {
    uz: { title: 'To‘lov tasdiqlanmadi', body: 'Chekni tekshirib, qayta yuboring.' },
    ru: { title: 'Оплата не подтверждена', body: 'Проверьте чек и отправьте снова.' },
    en: { title: 'Payment not confirmed', body: 'Please check the receipt and send it again.' },
    ar: { title: 'لم يتم تأكيد الدفع', body: 'تحقق من الإيصال وأرسله مرة أخرى.' },
    tr: { title: 'Ödeme onaylanmadı', body: 'Dekontu kontrol edip tekrar gönderin.' },
    kk: { title: 'Төлем расталмады', body: 'Чекті тексеріп, қайта жіберіңіз.' },
    ky: { title: 'Төлөм ырасталган жок', body: 'Чекти текшерип, кайра жөнөтүңүз.' },
    tg: { title: 'Пардохт тасдиқ нашуд', body: 'Чекро санҷида, дубора фиристед.' },
  },
  refund_done: {
    uz: { title: 'Pul qaytarildi', body: 'Bekor qilingan buyurtma uchun to‘lov qaytarildi.' },
    ru: { title: 'Деньги возвращены', body: 'Возврат за отменённый заказ выполнен.' },
    en: { title: 'Refund sent', body: 'Your refund for the cancelled order has been sent.' },
    ar: { title: 'تم رد المبلغ', body: 'تم إرسال المبلغ المسترد للطلب الملغى.' },
    tr: { title: 'İade yapıldı', body: 'İptal edilen sipariş için iade gönderildi.' },
    kk: { title: 'Ақша қайтарылды', body: 'Бас тартылған тапсырыс үшін қайтарым жасалды.' },
    ky: { title: 'Акча кайтарылды', body: 'Жокко чыгарылган буйрутма үчүн кайтарым жасалды.' },
    tg: { title: 'Маблағ баргардонида шуд', body: 'Барои фармоиши бекоршуда маблағ баргардонида шуд.' },
  },
  new_paid_order: {
    uz: { title: 'Yangi buyurtma', body: 'Mijoz to‘lovni amalga oshirdi. Buyurtmani ko‘ring.' },
    ru: { title: 'Новый заказ', body: 'Клиент оплатил заказ. Посмотрите детали.' },
    en: { title: 'New order', body: 'A customer has paid. Open the order.' },
    ar: { title: 'طلب جديد', body: 'قام العميل بالدفع. افتح الطلب.' },
    tr: { title: 'Yeni sipariş', body: 'Müşteri ödeme yaptı. Siparişi açın.' },
    kk: { title: 'Жаңа тапсырыс', body: 'Клиент төледі. Тапсырысты ашыңыз.' },
    ky: { title: 'Жаңы буйрутма', body: 'Кардар төлөдү. Буйрутманы ачыңыз.' },
    tg: { title: 'Фармоиши нав', body: 'Муштарӣ пардохт кард. Фармоишро кушоед.' },
  },
  payout_paid: {
    uz: { title: 'To‘lov o‘tkazildi', body: 'Buyurtma uchun hisobingizga pul o‘tkazildi.' },
    ru: { title: 'Выплата отправлена', body: 'Деньги за заказ переведены на ваш счёт.' },
    en: { title: 'Payout sent', body: 'The payout for the order has been transferred.' },
    ar: { title: 'تم التحويل', body: 'تم تحويل مستحقات الطلب إلى حسابك.' },
    tr: { title: 'Ödeme yapıldı', body: 'Sipariş ödemesi hesabınıza aktarıldı.' },
    kk: { title: 'Төлем аударылды', body: 'Тапсырыс үшін ақша шотыңызға аударылды.' },
    ky: { title: 'Төлөм которулду', body: 'Буйрутма үчүн акча эсебиңизге которулду.' },
    tg: { title: 'Пардохт гузаронида шуд', body: 'Маблағи фармоиш ба суратҳисоби шумо гузаронида шуд.' },
  },
};

let configured: boolean | null = null;
function configure(): boolean {
  if (configured !== null) return configured;
  const pub = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];
  const priv = process.env['VAPID_PRIVATE_KEY'];
  const subject = process.env['VAPID_SUBJECT'] || 'https://car-vision-omega.vercel.app';
  if (!pub || !priv) return (configured = false);
  try {
    webpush.setVapidDetails(subject, pub, priv);
    return (configured = true);
  } catch (err) {
    console.error('push: invalid VAPID settings', err);
    return (configured = false);
  }
}

/** Sends `event` to every device the user enabled notifications on. `path` is the app path (without language) to open. */
export async function notifyUser(userId: string, event: PushEvent, opts: { path: string; tag?: string }): Promise<void> {
  try {
    if (!configure()) return;
    const db = createAdminClient();
    const { data: subs, error } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth, locale').eq('user_id', userId);
    if (error || !subs?.length) return;
    await Promise.all(
      subs.map(async (s) => {
        const locale = (s.locale as string) in COPY[event] ? (s.locale as string) : 'uz';
        const copy = COPY[event][locale] ?? COPY[event]['uz']!;
        const payload = JSON.stringify({ title: copy.title, body: copy.body, url: `/${locale}${opts.path}`, tag: opts.tag ?? event });
        try {
          await webpush.sendNotification({ endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } }, payload, { TTL: 60 * 60 * 24, urgency: 'high' });
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          // The device uninstalled the app or revoked permission: forget it.
          if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id as string);
          else console.warn('push: send failed', code);
        }
      })
    );
  } catch (err) {
    console.warn('push: notifyUser failed', err);
  }
}
