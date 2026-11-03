import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';

const createOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.number().positive(),
          quantity: z.number().int().positive(),
          brand: z.string().optional(),
          image: z.string().optional(),
        })
      )
      .min(1, 'Savat bo‘sh bo‘lishi mumkin emas'),
    customerName: z.string().min(2, 'Ismingizni kiriting').max(100),
    customerPhone: z.string().min(9, 'Telefon raqam noto‘g‘ri kiritildi'),
    studioId: z.string().uuid().optional(),
    appointmentDate: z.string().optional(),
    customerNote: z.string().max(500).optional(),
    paymentMethod: z.enum(['Click', 'Payme', 'Uzum', 'Bank']).default('Click'),
  })
  .strict();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    const body = await request.json();
    const validated = createOrderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validated.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      items,
      customerName,
      customerPhone,
      studioId,
      appointmentDate,
      customerNote,
      paymentMethod,
    } = validated.data;

    const supabase = createAdminClient();

    // 1. Resolve partner atelier / studio
    let resolvedSellerId = studioId;
    let studioName = 'Apex Customs Studio';

    if (studioId) {
      const { data: seller } = await supabase
        .from('sellers')
        .select('id, business_name')
        .eq('id', studioId)
        .maybeSingle();

      if (seller) {
        resolvedSellerId = seller.id;
        studioName = seller.business_name;
      }
    }

    if (!resolvedSellerId) {
      // Default to premier verified partner
      const { data: defaultSeller } = await supabase
        .from('sellers')
        .select('id, business_name')
        .order('verified', { ascending: false })
        .limit(1)
        .single();

      if (defaultSeller) {
        resolvedSellerId = defaultSeller.id;
        studioName = defaultSeller.business_name;
      } else {
        return NextResponse.json(
          { success: false, error: 'No partner studios available in system' },
          { status: 500 }
        );
      }
    }

    // 2. The order always belongs to the signed-in user
    const resolvedUserId = guard.value.userId;

    // 3. Financial calculations (USD & UZS 3% Escrow deposit)
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const depositUSD = Math.round(totalPrice * 0.03 * 100) / 100;
    const uzsRate = 13000;
    const depositUZS = Math.round(depositUSD * uzsRate);
    const orderNumber = `CV-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    // Build structured note for Admin Escrow audit
    const itemsSummary = items.map((i) => `${i.name} (x${i.quantity})`).join(', ');
    const note = `${customerName} (#${orderNumber}) [${paymentMethod}]: ${itemsSummary}${
      appointmentDate ? ` | O‘rnatish: ${appointmentDate}` : ''
    }${customerNote ? ` | Izoh: ${customerNote}` : ''}`;

    // 4. Insert into live Supabase `orders` table
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: resolvedUserId,
        seller_id: resolvedSellerId,
        total: totalPrice,
        status: 'new',
        phone: customerPhone,
        note,
      })
      .select('id, created_at')
      .single();

    if (orderError || !newOrder) {
      console.error('Order creation DB error:', orderError);
      return NextResponse.json(
        { success: false, error: orderError?.message || 'Failed to create order' },
        { status: 500 }
      );
    }

    // 5. Insert order items into `order_items` table
    // Pre-fetch a valid product ID as fallback if cart item ID is a catalog slug
    const { data: defaultProduct } = await supabase
      .from('products')
      .select('id')
      .limit(1)
      .single();

    const fallbackProductId = defaultProduct?.id;

    for (const item of items) {
      const validProductId =
        item.id && UUID_REGEX.test(item.id) ? item.id : fallbackProductId;

      if (validProductId) {
        await supabase.from('order_items').insert({
          order_id: newOrder.id,
          product_id: validProductId,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
          product_image_url: item.image || '/assets/wheel-CiWWvvai.jpg',
        });
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: newOrder.id,
        orderNumber,
        status: 'pending',
        customerName,
        customerPhone,
        studioName,
        totalPrice,
        depositUSD,
        depositUZS,
        paymentMethod,
        appointmentDate: appointmentDate || 'Kelishtiriladi',
        createdAt: newOrder.created_at,
        paymentDetails: {
          recipientName: 'CarVision Escrow MCHJ (Kapitalbank ATB)',
          cardPanMasked: '8600 4902 1184 9921',
          bankName: 'Kapitalbank ATB',
          currency: 'UZS',
          depositUZSFormatted: `${new Intl.NumberFormat('uz-UZ').format(depositUZS)} UZS`,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('Orders route exception:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

    const supabase = createAdminClient();

    if (orderId) {
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          status,
          phone,
          note,
          created_at,
          order_items (
            id,
            product_name,
            quantity,
            price,
            product_image_url
          ),
          sellers (
            id,
            business_name,
            address,
            phone
          )
        `)
        .eq('id', orderId)
        .eq('user_id', guard.value.userId)
        .single();

      if (error || !order) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, order });
    }

    // If no orderId is provided, fetch list of recent orders for the user/atelier
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
          price,
          product_image_url
        ),
        sellers (
          id,
          business_name,
          address,
          phone
        )
      `)
      .eq('user_id', guard.value.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mapped = (orders || []).map((o, idx) => {
      const orderNumberMatch = o.note?.match(/#(CV-[0-9A-Z]+)/);
      const orderNumber = orderNumberMatch ? orderNumberMatch[1] : `CV-${9821 - idx}`;
      const firstItem = Array.isArray(o.order_items) && o.order_items[0] ? o.order_items[0] : null;
      const seller = Array.isArray(o.sellers) ? o.sellers[0] : o.sellers;
      const studioName = seller?.business_name || 'Apex Customs Atelier';
      const itemDescription = firstItem?.product_name || o.note || 'Tuning to‘plami';
      const rawTotal = Number(o.total || 0);
      const totalPrice = rawTotal > 50000 ? Math.round(rawTotal / 13000) : rawTotal;
      const totalUZS = rawTotal > 50000 ? rawTotal : Math.round(rawTotal * 13000);
      const depositUSD = totalPrice > 0 ? Math.max(1, Math.round(totalPrice * 0.03)) : 0;
      const depositUZS = Math.round(totalUZS * 0.03);

      const paymentMatch = o.note?.match(/\[(Click|Payme|Uzum|Bank)\]/i);
      const paymentMethod = paymentMatch
        ? paymentMatch[1]
        : (idx % 3 === 0 ? 'Click' : idx % 3 === 1 ? 'Payme' : 'Uzum');

      return {
        id: o.id,
        orderNumber,
        title: itemDescription,
        itemsCount: Array.isArray(o.order_items) ? o.order_items.length : 1,
        studioName,
        totalPrice,
        totalUZS,
        depositUSD,
        depositUZS,
        paymentMethod,
        status: o.status,
        createdAt: o.created_at,
        items: o.order_items || [],
      };
    });

    return NextResponse.json({ success: true, orders: mapped });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
