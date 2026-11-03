import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface VehicleResponse {
  id: string;
  name: string;
  chassis: string;
  image: string;
  stage: string;
  specs: string[];
  hp: string;
  lastModified: string;
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: models, error } = await supabase
      .from('vehicle_models')
      .select('id, brand, model, body_type, year_from, year_to')
      .order('brand', { ascending: true })
      .limit(8);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Curated high-res imagery and tuning stages mapped to real Supabase vehicle models
    const visualMappings: Record<string, { image: string; stage: string; specs: string[]; hp: string }> = {
      'Malibu': {
        image: '/images/car-after.jpg',
        stage: 'Stage 1 Street Build',
        specs: ['20" Gloss Black Forged Wheels', 'Nardo Grey Wrap', 'Lowered Stance Springs', 'Carbon Ducktail Spoiler'],
        hp: '280 HP / 400 Nm',
      },
      'Gentra': {
        image: '/images/car-before.jpg',
        stage: 'Scheduled for 3D Scan',
        specs: ['17" Vossen Style Wheels', 'Sport Exhaust System', 'Tint 70% VLT'],
        hp: '135 HP / 1.5L DOHC',
      },
      'Cobalt': {
        image: '/images/garage/bbs_wheel.jpg',
        stage: 'Fitting In Progress',
        specs: ['BBS 16" Forged Alloys', 'Ceramic Shield Coat', 'LED Optic Tuning'],
        hp: '125 HP / 1.5L Ecotec',
      },
      'K5': {
        image: '/assets/car-CjioCIbt.jpg',
        stage: 'Stage 2 Completed',
        specs: ['VZ-01 20" Forged Monoblock', 'Akrapovič Titanium Exhaust', 'KW V4 Coilovers'],
        hp: '290 HP / 2.5T AWD',
      },
      'Camry': {
        image: '/images/studio/studio_coupe_tuned.jpg',
        stage: 'Stage 2 Completed',
        specs: ['TRD Aero Bodykit', 'Dry Carbon Front Splitter', 'Forged 19" Alloys'],
        hp: '301 HP / 3.5L V6',
      },
      'Sonata': {
        image: '/assets/garage-Bst4bQtu.jpg',
        stage: 'Fitting In Progress',
        specs: ['N-Line Aerodynamic Diffuser', 'Custom Valved Exhaust', 'Lowering Kit'],
        hp: '290 HP / 2.5T Smartstream',
      },
      'Tracker': {
        image: '/images/veloce_black_coupe.jpg',
        stage: 'Stage 1 Street Build',
        specs: ['Redline Carbon Trim', '18" Matte Black Rims', 'Roof Rack & Aero Rails'],
        hp: '132 HP / 1.2T',
      },
      'Chazor': {
        image: '/images/studio/studio_coupe_factory.jpg',
        stage: 'Scheduled for 3D Scan',
        specs: ['Electric Blue Accent Wrap', 'Low Drag Forged Wheels', 'Ceramic Window Tint'],
        hp: '218 HP / DM-i Hybrid',
      },
    };

    const vehicles: VehicleResponse[] = (models || []).map((m, idx) => {
      const mapping = visualMappings[m.model] || {
        image: '/assets/car-CjioCIbt.jpg',
        stage: idx % 2 === 0 ? 'Stage 2 Completed' : 'Fitting In Progress',
        specs: ['Carbon Fiber Aero Lip', 'Forged Custom Wheels', 'Sport Suspension'],
        hp: '250+ HP / Turbocharged',
      };

      return {
        id: m.id,
        name: `${m.brand} ${m.model}`,
        chassis: `${m.body_type ? m.body_type.toUpperCase() : 'COUPE'} • ${m.year_from}–${m.year_to}`,
        image: mapping.image,
        stage: mapping.stage,
        specs: mapping.specs,
        hp: mapping.hp,
        lastModified: idx === 0 ? 'Bugun, 14:30' : idx === 1 ? 'Kecha, 18:45' : `${10 + idx} Okt, 2026`,
      };
    });

    return NextResponse.json({ success: true, vehicles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
