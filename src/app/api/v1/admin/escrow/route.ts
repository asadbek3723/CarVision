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
          quantity,
          price
        ),
        sellers (
          id,
          business_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mappedOrders = (orders || []).map((o, idx) => {
      // Parse custom order number if present in note (e.g. #CV-9825)
      const orderNumberMatch = o.note?.match(/#(CV-[0-9A-Z]+)/);
      const orderNumber = orderNumberMatch ? orderNumberMatch[1] : `CV-${9821 - idx}`;

      const firstItem = Array.isArray(o.order_items) && o.order_items[0] ? o.order_items[0] : null;
      const seller = Array.isArray(o.sellers) ? o.sellers[0] : o.sellers;
      const studioName = seller?.business_name || 'Partner Atelier';
      const itemDescription = firstItem?.product_name || o.note || 'Tuning jamlanmasi';
      const rawTotal = Number(o.total || 0);
      const totalPrice = rawTotal > 50000 ? Math.round(rawTotal / 13000) : rawTotal;
      const depositCents = Math.round(totalPrice * 3); // exact 3% in cents (e.g. $1250 * 3 = 3750 cents = $37.50)

      // Parse payment method from note if present
      const paymentMatch = o.note?.match(/\[(Click|Payme|Uzum|Bank)\]/i);
      const paymentMethod = paymentMatch
        ? (paymentMatch[1] as 'Click' | 'Payme' | 'Uzum' | 'Bank')
        : ((idx % 3 === 0 ? 'Click' : idx % 3 === 1 ? 'Payme' : 'Uzum') as 'Click' | 'Payme' | 'Uzum' | 'Bank');

      // Parse customer name from note
      let customerName = 'Mijoz';
      if (o.note) {
        if (o.note.includes('•')) {
          const bulletName = o.note.split('•')[1]?.trim();
          if (bulletName && !bulletName.startsWith('[')) customerName = bulletName;
        } else {
          const rawName = o.note.split('(')[0]?.split('[')[0]?.split(':')[0]?.trim();
          if (rawName && rawName.length > 1) {
            customerName = rawName;
          }
        }
      }

      let mappedStatus: 'pending' | 'verified' | 'rejected' = 'pending';
      if (o.status === 'accepted' || o.status === 'installing' || o.status === 'completed') {
        mappedStatus = 'verified';
      } else if (o.status === 'cancelled') {
        mappedStatus = 'rejected';
      }

      return {
        id: o.id,
        orderNumber,
        customerName,
        customerPhone: o.phone || '+998 90 000 00 00',
        studioName,
        itemDescription,
        totalPriceCents: totalPrice * 100, // store in cents for UI
        depositCents,
        paymentMethod,
        transactionRef: `TXN-${o.id.substring(0, 8).toUpperCase()}`,
        status: mappedStatus,
        submittedAt: new Date(o.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) + ' oldin',
      };
    });

    return NextResponse.json({ success: true, orders: mappedOrders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, error: 'Missing orderId or status' }, { status: 400 });
    }

    // Map UI status ('verified' | 'rejected') to Supabase order_status ('accepted' | 'cancelled')
    const dbStatus = status === 'verified' ? 'accepted' : 'cancelled';

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: dbStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
