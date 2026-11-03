import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Vehicle reference database for pickers.
 *   GET /api/v1/catalog/vehicles            -> all makes (name, model count)
 *   GET /api/v1/catalog/vehicles?make=<id>  -> models of one make
 *   GET /api/v1/catalog/vehicles?q=gentra   -> search models across all makes
 */
export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient();
    const params = new URL(request.url).searchParams;
    const makeId = params.get('make');
    const q = (params.get('q') || '').replace(/[%,()]/g, ' ').trim();

    if (q.length >= 2) {
      const { data: models } = await db
        .from('vehicle_models')
        .select('id, name, make_id, body_type')
        .eq('is_active', true)
        .ilike('name', `%${q}%`)
        .limit(40);
      const makeIds = [...new Set((models ?? []).map((m) => m.make_id as string))];
      const { data: makes } = makeIds.length ? await db.from('vehicle_makes').select('id, name').in('id', makeIds) : { data: [] };
      const makeName = new Map((makes ?? []).map((m) => [m.id as string, m.name as string]));

      // Also match by make name ("toyota" -> its models)
      const { data: matchedMakes } = await db.from('vehicle_makes').select('id, name').ilike('name', `%${q}%`).limit(5);
      let byMake: Array<{ id: string; name: string; make_id: string; body_type: string }> = [];
      if (matchedMakes?.length) {
        const { data } = await db
          .from('vehicle_models')
          .select('id, name, make_id, body_type')
          .eq('is_active', true)
          .in('make_id', matchedMakes.map((m) => m.id as string))
          .limit(60);
        byMake = (data ?? []) as typeof byMake;
        for (const m of matchedMakes) makeName.set(m.id as string, m.name as string);
      }

      const seen = new Set<string>();
      const results = [...byMake, ...((models ?? []) as typeof byMake)]
        .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
        .slice(0, 60)
        .map((m) => ({ id: m.id, makeId: m.make_id, make: makeName.get(m.make_id) ?? '', name: m.name, bodyType: m.body_type, label: `${makeName.get(m.make_id) ?? ''} ${m.name}`.trim() }));
      return NextResponse.json({ success: true, models: results });
    }

    if (makeId) {
      const { data: models } = await db
        .from('vehicle_models')
        .select('id, name, body_type')
        .eq('make_id', makeId)
        .eq('is_active', true)
        .order('name')
        .limit(500);
      return NextResponse.json({ success: true, models: models ?? [] });
    }

    const { data: makes } = await db.from('vehicle_makes').select('id, name').eq('is_active', true).order('name').limit(500);
    return NextResponse.json({ success: true, makes: makes ?? [] });
  } catch (err) {
    console.error('vehicles list error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
