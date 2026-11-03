const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kktbqwuzhumphdhuaibg.supabase.co',
  'sb_secret_g4ZscLJDO7IHJKjeZ-t4WQ_8ttFRgeH'
);

async function seed() {
  console.log('--- 1. Seeding Studio Partners into users & sellers ---');

  const studiosData = [
    {
      userLogin: 'apex_customs',
      name: 'Sanjar Usmonov (Apex Customs)',
      phone: '+998901234567',
      business_name: 'Apex Customs Studio',
      description: 'Premial darajadagi avtomobillarni tashqi tuning qilish, 4K render loyihalari va original disklar o‘rnatish.',
      address: 'Toshkent, Yunusobod tumani, Amir Temur ko‘chasi, 42',
      credits: 4000,
      verified: true,
    },
    {
      userLogin: 'autotune_pro',
      name: 'Bekzod Rahimov (Autotune Pro)',
      phone: '+998977654321',
      business_name: 'Autotune Pro Tashkent',
      description: 'Dyno stend, sport podveska va maxsus bamperlar bo‘yicha ixtisoslashgan Toshkentdagi yetakchi servis.',
      address: 'Toshkent, Chilonzor tumani, Bunyodkor shox ko‘chasi, 18',
      credits: 800,
      verified: true,
    },
    {
      userLogin: 'dubai_custom_wheels',
      name: 'Alisher Qodirov (Dubai Wheels)',
      phone: '+998998887766',
      business_name: 'Dubai Custom Wheels',
      description: 'BAA va AQShdan to‘g‘ridan-to‘g‘ri keltirilgan HRE, Vossen va BBS soxtalashtirilgan (forged) g‘ildiraklar markazi.',
      address: 'Toshkent, Mirzo Ulug‘bek tumani, Mustaqillik shox ko‘chasi, 7',
      credits: 4000,
      verified: true,
    },
    {
      userLogin: 'samarkand_tuning_lab',
      name: 'Sherzod Mirzaev (Samarkand Lab)',
      phone: '+998934567890',
      business_name: 'Samarkand Tuning Lab',
      description: 'Samarqanddagi zamonaviy tuning atelyesi. Aerodinamik splitlar, diffuzorlar va keramika qoplamalari.',
      address: 'Samarqand, Registon ko‘chasi, 55',
      credits: 800,
      verified: true,
    },
    {
      userLogin: 'fergana_tuning_studio',
      name: 'Mansur Karimov (Fergana Studio)',
      phone: '+998912345678',
      business_name: 'Fergana Tuning Studio',
      description: 'Farg‘ona vodiysidagi eng yirik avto-restayling va tana qismlari o‘rnatish ustaxonasi.',
      address: 'Farg‘ona, Al-Farg‘oniy ko‘chasi, 12',
      credits: 40,
      verified: true,
    },
    {
      userLogin: 'buxoro_auto_custom',
      name: 'Rustam Jo‘rayev (Buxoro Custom)',
      phone: '+998943456789',
      business_name: 'Buxoro Auto Custom',
      description: 'Buxorodagi professional avtoservis. Sport glushitellar va bamper restaylingi.',
      address: 'Buxoro, G‘ijduvon shox ko‘chasi, 29',
      credits: 800,
      verified: true,
    },
  ];

  const createdSellers = [];

  for (const st of studiosData) {
    // Check if seller already exists
    const { data: existingSeller } = await supabase
      .from('sellers')
      .select('id, business_name')
      .eq('business_name', st.business_name)
      .maybeSingle();

    if (existingSeller) {
      console.log(`Seller "${st.business_name}" already exists:`, existingSeller.id);
      createdSellers.push(existingSeller);
      continue;
    }

    // Check or create user
    let userId;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('login', st.userLogin)
      .maybeSingle();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: errUser } = await supabase
        .from('users')
        .insert({
          login: st.userLogin,
          name: st.name,
          phone: st.phone,
          role: 'seller',
          is_active: true,
        })
        .select()
        .single();

      if (errUser) {
        console.error('Error creating user for', st.userLogin, errUser.message);
        continue;
      }
      userId = newUser.id;
    }

    // Create seller record
    const { data: newSeller, error: errSeller } = await supabase
      .from('sellers')
      .insert({
        user_id: userId,
        business_name: st.business_name,
        description: st.description,
        phone: st.phone,
        address: st.address,
        credits: st.credits,
        verified: st.verified,
      })
      .select()
      .single();

    if (errSeller) {
      console.error('Error creating seller for', st.business_name, errSeller.message);
    } else {
      console.log(`Created seller "${st.business_name}":`, newSeller.id);
      createdSellers.push(newSeller);
    }
  }

  console.log('--- 2. Seeding Real 3% Escrow Orders into orders & order_items ---');

  // Fetch available products from Supabase
  const { data: products } = await supabase.from('products').select('id, name, price, image_url').limit(6);
  const { data: guestUser } = await supabase.from('users').select('id').eq('role', 'user').maybeSingle();

  if (createdSellers.length > 0 && products && products.length > 0 && guestUser) {
    const ordersData = [
      {
        user_id: guestUser.id,
        seller_id: createdSellers[0].id,
        total: 2400000,
        status: 'new',
        phone: '+998977654321',
        note: 'Bobur Karimov: Malibu 2 uchun 3% zakalat to‘landi. O‘rnatish Shanba kuni.',
        product: products[0],
      },
      {
        user_id: guestUser.id,
        seller_id: createdSellers[1] ? createdSellers[1].id : createdSellers[0].id,
        total: 4800000,
        status: 'accepted',
        phone: '+998909991122',
        note: 'Sherzod Aliyev: BMW M4 Carbon Fiber aerodinamik split va diffuzor. Payme orqali tasdiqlangan.',
        product: products[1] || products[0],
      },
      {
        user_id: guestUser.id,
        seller_id: createdSellers[2] ? createdSellers[2].id : createdSellers[0].id,
        total: 3600000,
        status: 'accepted',
        phone: '+998931112233',
        note: 'Jasur Ergashev: Porsche 911 Titanium glushitel. Uzum orqali 3% kafolatlangan.',
        product: products[2] || products[0],
      },
      {
        user_id: guestUser.id,
        seller_id: createdSellers[3] ? createdSellers[3].id : createdSellers[0].id,
        total: 950000,
        status: 'new',
        phone: '+998913334455',
        note: 'Farrux Toshmatov: Tracker 2 sport podveska va prujinalar jamlanmasi.',
        product: products[3] || products[0],
      },
    ];

    for (const od of ordersData) {
      const { data: newOrder, error: errOrder } = await supabase
        .from('orders')
        .insert({
          user_id: od.user_id,
          seller_id: od.seller_id,
          total: od.total,
          status: od.status,
          phone: od.phone,
          note: od.note,
        })
        .select()
        .single();

      if (errOrder) {
        console.error('Error inserting order:', errOrder.message);
      } else {
        console.log('Created order:', newOrder.id, 'Total:', newOrder.total);

        // Insert order item
        await supabase.from('order_items').insert({
          order_id: newOrder.id,
          product_id: od.product.id,
          quantity: 1,
          price: od.total,
          product_name: od.product.name,
          product_image_url: od.product.image_url,
        });
      }
    }
  }

  console.log('--- 3. Verifying Final Database Records ---');
  const { count: sellersCount } = await supabase.from('sellers').select('*', { count: 'exact', head: true });
  const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`SUCCESS! Live Supabase contains: ${sellersCount} studios, ${ordersCount} orders, and ${productsCount} products.`);
}

seed().catch(console.error);
