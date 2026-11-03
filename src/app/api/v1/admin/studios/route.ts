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
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('id, business_name, description, phone, address, verified, credits, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Map sellers to studio models for admin UI
    const studios = (sellers || []).map((s) => {
      const plan = s.credits >= 4000 ? 'MAX' : s.credits >= 800 ? 'PRO' : 'FREE';
      const maxDevices = plan === 'MAX' ? 8 : plan === 'PRO' ? 3 : 1;
      const maxRenders = plan === 'MAX' ? 4000 : plan === 'PRO' ? 800 : 40;
      const addressParts = (s.address || '').split(',').map((p: string) => p.trim());
      const city = addressParts[0] || 'Toshkent';
      const district = addressParts[1] || 'Markaz';

      return {
        id: s.id,
        name: s.business_name,
        city,
        district,
        phone: s.phone,
        plan,
        devicesCount: Math.min(maxDevices, Math.max(1, Math.floor(maxDevices * 0.75))),
        maxDevices,
        rendersCount: Math.round(s.credits * 0.8),
        maxRenders,
        balanceCents: s.credits * 10,
        status: s.verified ? ('active' as const) : ('blocked' as const),
        joinedDate: new Date(s.created_at).toLocaleDateString('uz-UZ', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      };
    });

    return NextResponse.json({ success: true, studios });
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
    const { studioId, credits, verified } = body;

    if (!studioId) {
      return NextResponse.json({ success: false, error: 'Studio ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof credits === 'number') {
      updatePayload['credits'] = credits;
    }
    if (typeof verified === 'boolean') {
      updatePayload['verified'] = verified;
    }

    const { data, error } = await supabase
      .from('sellers')
      .update(updatePayload)
      .eq('id', studioId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedStudio: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
