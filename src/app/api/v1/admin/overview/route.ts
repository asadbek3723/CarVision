import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Fetch live metrics from Supabase in parallel
    const [
      { count: sellersCount },
      { count: productsCount },
      { data: ordersData },
      { count: generationsCount },
      { data: recentGenerations },
      { data: recentOrders },
    ] = await Promise.all([
      supabase.from('sellers').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('id, total, status, created_at'),
      supabase.from('seller_generations').select('*', { count: 'exact', head: true }),
      supabase
        .from('seller_generations')
        .select(`
          id,
          prompt,
          result_image,
          created_at,
          sellers (
            business_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('orders')
        .select(`
          id,
          total,
          note,
          status,
          created_at,
          sellers (
            business_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const totalOrders = ordersData?.length || 0;
    const revenueUSD = (ordersData || []).reduce((acc, o) => {
      const raw = Number(o.total) || 0;
      const usd = raw > 50000 ? Math.round(raw / 13000) : raw;
      return acc + usd;
    }, 0);
    const escrowDepositUSD = Math.round(revenueUSD * 0.03);

    // 2. Build live recent activity feed from Supabase
    const liveActivity: Array<{
      id: string;
      studio: string;
      action: string;
      time: string;
      tag: string;
      tagColor: string;
    }> = [];

    (recentGenerations || []).forEach((g) => {
      const seller = Array.isArray(g.sellers) ? g.sellers[0] : g.sellers;
      const studioName = seller?.business_name || 'CarVision Studio';
      const promptTitle = g.prompt ? g.prompt.split(':')[0] : 'Avtomobil 4K renderni';
      liveActivity.push({
        id: `gen-${g.id}`,
        studio: studioName,
        action: `${promptTitle} 4K neyron fitment renderini muvaffaqiyatli yakunladi`,
        time: 'Hozirgina',
        tag: '4K Render',
        tagColor: 'text-[#D4AE62] bg-[#D4AE62]/10',
      });
    });

    (recentOrders || []).forEach((o) => {
      const seller = Array.isArray(o.sellers) ? o.sellers[0] : o.sellers;
      const studioName = seller?.business_name || 'Tuning Markazi';
      const orderNote = o.note ? o.note.split(':')[0] : 'Mijoz';
      const rawTotal = Number(o.total) || 0;
      const orderUSD = rawTotal > 50000 ? Math.round(rawTotal / 13000) : rawTotal;
      const depositAmountUSD = Math.max(1, Math.round(orderUSD * 0.03));
      liveActivity.push({
        id: `ord-${o.id}`,
        studio: studioName,
        action: `${orderNote} uchun $${depositAmountUSD} (3% zakalat depoziti) kafolatlandi`,
        time: 'Bugun',
        tag: '3% Zakalat',
        tagColor: 'text-emerald-400 bg-emerald-500/10',
      });
    });

    // 3. Weekly Dynamics calculated from live Supabase orders and generations
    const daysName = ['Yak', 'Dsh', 'Ssh', 'Chsh', 'Pay', 'Jum', 'Shb'];
    const liveWeekly = [
      { day: 'Dsh', amount: 0, renders: 0, height: '15%' },
      { day: 'Ssh', amount: 0, renders: 0, height: '15%' },
      { day: 'Chsh', amount: 0, renders: 0, height: '15%' },
      { day: 'Pay', amount: 0, renders: 0, height: '15%' },
      { day: 'Jum', amount: 0, renders: 0, height: '15%' },
      { day: 'Shb', amount: 0, renders: 0, height: '15%' },
      { day: 'Yak', amount: 0, renders: 0, height: '15%' },
    ];

    (ordersData || []).forEach((o) => {
      const d = new Date(o.created_at);
      const dayIdx = d.getDay(); // 0 is Yak
      const mappedLabel = daysName[dayIdx];
      const target = liveWeekly.find((w) => w.day === mappedLabel);
      if (target) {
        target.amount += Math.round((Number(o.total) || 0) / 13000);
      }
    });

    (recentGenerations || []).forEach((g) => {
      const d = new Date(g.created_at);
      const dayIdx = d.getDay();
      const mappedLabel = daysName[dayIdx];
      const target = liveWeekly.find((w) => w.day === mappedLabel);
      if (target) {
        target.renders += 1;
      }
    });

    // Compute relative heights for bar visualization
    const maxVal = Math.max(...liveWeekly.map((w) => w.amount), 1);
    liveWeekly.forEach((w) => {
      const pct = Math.max(15, Math.min(100, Math.round((w.amount / maxVal) * 100)));
      w.height = `${pct}%`;
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalRevenueFormatted: `$${revenueUSD.toLocaleString()}`,
        sellersCount: sellersCount ?? 0,
        productsCount: productsCount ?? 0,
        generationsCount: generationsCount ?? 0,
        escrowDepositFormatted: `$${escrowDepositUSD.toLocaleString()}`,
        activeOrdersCount: totalOrders,
      },
      recentActivity: liveActivity,
      weeklyData: liveWeekly,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
