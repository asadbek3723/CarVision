import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface RawOrderRow {
  id: string;
  user_id?: string | null;
  seller_id?: string | null;
  total?: number | string | null;
  status?: string | null;
  phone?: string | null;
  note?: string | null;
  created_at?: string | null;
  order_items?: Array<{
    id: string;
    product_name: string;
    price: number;
    quantity: number;
    product_image_url?: string | null;
  }> | null;
  sellers?:
    | {
        id: string;
        business_name?: string | null;
        address?: string | null;
        phone?: string | null;
      }
    | Array<{
        id: string;
        business_name?: string | null;
        address?: string | null;
        phone?: string | null;
      }>
    | null;
}

function mapOrderRow(o: RawOrderRow) {
  const items = o.order_items || [];
  const primaryItem = items[0];
  const seller = Array.isArray(o.sellers) ? o.sellers[0] : o.sellers;

  const rawNote = o.note || '';
  const codeMatch = rawNote.match(/#((?:CV|ORD)-[0-9A-Z]+)/i);
  const shortHex = o.id.slice(0, 4).toUpperCase();
  const orderNumber = codeMatch && codeMatch[1] ? codeMatch[1].toUpperCase() : `ORD-${shortHex}`;

  let customerName = 'Mijoz';
  let cleanNote = rawNote;

  if (rawNote.includes('•')) {
    const bulletParts = rawNote.split('•').map((s) => s.trim());
    if (bulletParts[1] && !bulletParts[1].startsWith('[')) {
      customerName = bulletParts[1];
    }
    cleanNote = bulletParts[bulletParts.length - 1] || rawNote;
  } else if (rawNote.includes(':')) {
    const colonParts = rawNote.split(':');
    customerName = colonParts[0]?.trim() || 'Mijoz';
    cleanNote = colonParts.slice(1).join(':').trim();
  }

  const paymentMatch = rawNote.match(/\[(Click|Payme|Uzum|Bank)\]/i);
  const paymentMethod = paymentMatch ? paymentMatch[1] : 'Click';

  const rawTotal = Number(o.total) || 0;
  const totalUSD = rawTotal > 50000 ? Math.round(rawTotal / 13000) : rawTotal;
  const totalUZS = rawTotal > 50000 ? rawTotal : Math.round(rawTotal * 13000);
  const depositUSD = totalUSD > 0 ? Math.max(1, Math.round(totalUSD * 0.03)) : 0;
  const depositUZS = Math.round(totalUZS * 0.03);
  const remainingUSD = Math.max(0, totalUSD - depositUSD);
  const remainingUZS = Math.max(0, totalUZS - depositUZS);

  let mappedStatus: 'pending' | 'verified' | 'completed' | 'cancelled' = 'pending';
  if (o.status === 'accepted' || o.status === 'verified') mappedStatus = 'verified';
  else if (o.status === 'completed') mappedStatus = 'completed';
  else if (o.status === 'cancelled') mappedStatus = 'cancelled';

  return {
    id: o.id,
    orderNumber,
    voucherCode: `CV-${shortHex}`,
    customerName,
    customerPhone: o.phone || '+998 90 000 00 00',
    totalPriceUSD: totalUSD,
    totalPriceUZS: totalUZS,
    depositUSD,
    depositUZS,
    remainingUSD,
    remainingUZS,
    paymentMethod,
    status: mappedStatus,
    appointmentDate: o.created_at
      ? new Date(o.created_at).toLocaleDateString('uz-UZ', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Yaqin kunlarda',
    itemsCount: items.length || 1,
    primaryItemName: primaryItem?.product_name || cleanNote || '4K Custom Tuning Fitment',
    primaryItemImage: primaryItem?.product_image_url || '/images/garage/bbs_wheel.jpg',
    studioName: seller?.business_name || 'Apex Customs Atelier',
    studioAddress: seller?.address || 'Tashkent, Sergeli',
    studioPhone: seller?.phone || '+998 90 123 45 67',
    note: rawNote,
    createdAt: o.created_at,
    items,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const orderId = searchParams.get('orderId');

    const supabase = createAdminClient();

    let queryBuilder = supabase
      .from('orders')
      .select(`
        id,
        user_id,
        seller_id,
        total,
        status,
        phone,
        note,
        created_at,
        order_items (
          id,
          product_name,
          price,
          quantity,
          product_image_url
        ),
        sellers (
          id,
          business_name,
          address,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (orderId) {
      queryBuilder = queryBuilder.eq('id', orderId);
    } else if (sellerId) {
      queryBuilder = queryBuilder.eq('seller_id', sellerId);
    }

    const { data: orders, error } = await queryBuilder.limit(50);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mapped = (orders || []).map((o) => mapOrderRow(o as RawOrderRow));

    return NextResponse.json({
      success: true,
      orders: mapped,
      order: orderId ? mapped[0] || null : undefined,
      count: mapped.length,
      totalDepositUSD: mapped.reduce((s, o) => s + o.depositUSD, 0),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status } = body as {
      orderId?: string;
      status?: 'pending' | 'verified' | 'completed' | 'cancelled';
    };

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'orderId and status are required' },
        { status: 400 }
      );
    }

    // Map frontend status to Supabase orders.status check constraint ('pending' | 'accepted' | 'completed' | 'cancelled')
    const dbStatus = status === 'verified' ? 'accepted' : status;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('orders')
      .update({ status: dbStatus })
      .eq('id', orderId)
      .select(`
        id,
        user_id,
        seller_id,
        total,
        status,
        phone,
        note,
        created_at,
        order_items (
          id,
          product_name,
          price,
          quantity,
          product_image_url
        ),
        sellers (
          id,
          business_name,
          address,
          phone
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order: mapOrderRow(data as RawOrderRow),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, action } = body as {
      code?: string;
      action?: 'lookup' | 'redeem';
    };

    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vaucher kodi kiritilishi shart' },
        { status: 400 }
      );
    }

    const normalized = code.trim().toUpperCase().replace(/^#/, '');
    const strippedHex = normalized.replace(/^(CV|ORD)-/, '');

    const supabase = createAdminClient();
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        seller_id,
        total,
        status,
        phone,
        note,
        created_at,
        order_items (
          id,
          product_name,
          price,
          quantity,
          product_image_url
        ),
        sellers (
          id,
          business_name,
          address,
          phone
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mappedOrders = (orders || []).map((o) => mapOrderRow(o as RawOrderRow));
    const matched =
      mappedOrders.find(
        (o) =>
          o.orderNumber.toUpperCase() === normalized ||
          o.voucherCode.toUpperCase() === normalized ||
          o.id.toUpperCase().startsWith(strippedHex) ||
          (o.note && o.note.toUpperCase().includes(normalized))
      ) || mappedOrders[0];

    if (!matched) {
      return NextResponse.json(
        { success: false, error: 'Bunday vaucher kodi topilmadi' },
        { status: 404 }
      );
    }

    if (action === 'redeem') {
      const { data: updated, error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', matched.id)
        .select(`
          id,
          user_id,
          seller_id,
          total,
          status,
          phone,
          note,
          created_at,
          order_items (
            id,
            product_name,
            price,
            quantity,
            product_image_url
          ),
          sellers (
            id,
            business_name,
            address,
            phone
          )
        `)
        .single();

      if (updateErr) {
        return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        redeemed: true,
        order: mapOrderRow(updated as RawOrderRow),
      });
    }

    return NextResponse.json({
      success: true,
      redeemed: false,
      order: matched,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
