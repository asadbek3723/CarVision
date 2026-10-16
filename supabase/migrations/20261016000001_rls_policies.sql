-- CarVision Row Level Security (RLS) Policies
-- Migration: 20261016000001_rls_policies.sql

-- Enable RLS on ALL tables
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 1. pricing_plans: Public read-only; Super Admin write
CREATE POLICY "Public can view active pricing plans"
    ON pricing_plans FOR SELECT
    USING (is_active = TRUE OR is_super_admin());

CREATE POLICY "Super admin can manage pricing plans"
    ON pricing_plans FOR ALL
    USING (is_super_admin());

-- 2. system_settings: Public read-only; Super Admin write
CREATE POLICY "Public can view system settings"
    ON system_settings FOR SELECT
    USING (TRUE);

CREATE POLICY "Super admin can manage system settings"
    ON system_settings FOR ALL
    USING (is_super_admin());

-- 3. profiles: Users can view & update own profile; Super Admin all
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id OR is_super_admin());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id OR is_super_admin());

-- 4. shops: Public can view verified shops; Owner can view & edit; Super Admin all
CREATE POLICY "Public can view verified shops"
    ON shops FOR SELECT
    USING (is_verified = TRUE OR owner_id = auth.uid() OR is_super_admin());

CREATE POLICY "Shop owners can update own shop"
    ON shops FOR UPDATE
    USING (owner_id = auth.uid() OR is_super_admin());

-- 5. master_catalog: Public can read active items; Super Admin write
CREATE POLICY "Public can view active catalog items"
    ON master_catalog FOR SELECT
    USING (is_active = TRUE OR is_super_admin());

CREATE POLICY "Super admin can manage master catalog"
    ON master_catalog FOR ALL
    USING (is_super_admin());

-- 6. shop_inventory: Public can view active in-stock items; Shop owner can manage
CREATE POLICY "Public can view active shop inventory"
    ON shop_inventory FOR SELECT
    USING (is_active = TRUE OR shop_id = current_user_shop_id() OR is_super_admin());

CREATE POLICY "Shop owners can manage own inventory"
    ON shop_inventory FOR ALL
    USING (shop_id = current_user_shop_id() OR is_super_admin());

-- 7. car_sessions: User who created or shop owner can view
CREATE POLICY "Users and shops can view their car sessions"
    ON car_sessions FOR SELECT
    USING (user_id = auth.uid() OR shop_id = current_user_shop_id() OR is_super_admin());

CREATE POLICY "Users can create car sessions"
    ON car_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and shops can update their car sessions"
    ON car_sessions FOR UPDATE
    USING (user_id = auth.uid() OR shop_id = current_user_shop_id() OR is_super_admin());

-- 8. session_photos: Viewable by session owner
CREATE POLICY "Session owners can manage photos"
    ON session_photos FOR ALL
    USING (EXISTS (
        SELECT 1 FROM car_sessions s
        WHERE s.id = session_photos.session_id
        AND (s.user_id = auth.uid() OR s.shop_id = current_user_shop_id() OR is_super_admin())
    ));

-- 9. generations: Viewable by session owner; Service role or RPC writes
CREATE POLICY "Users and shops can view own generations"
    ON generations FOR SELECT
    USING (user_id = auth.uid() OR shop_id = current_user_shop_id() OR is_super_admin());

-- 10. credit_ledger: Read-only for owner; Writes strictly via RPC functions
CREATE POLICY "Users can view own credit ledger"
    ON credit_ledger FOR SELECT
    USING (user_id = auth.uid() OR shop_id = current_user_shop_id() OR is_super_admin());

-- 11. bookings: User and Workshop can view; Super admin all
CREATE POLICY "Users and shops can view own bookings"
    ON bookings FOR SELECT
    USING (user_id = auth.uid() OR shop_id = current_user_shop_id() OR is_super_admin());

CREATE POLICY "Users can create bookings"
    ON bookings FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 12. active_devices: User can view and manage own devices
CREATE POLICY "Users can view own active devices"
    ON active_devices FOR ALL
    USING (user_id = auth.uid() OR is_super_admin());

-- 13. admin_audit_log: Super Admin strictly
CREATE POLICY "Only super admins can view audit log"
    ON admin_audit_log FOR SELECT
    USING (is_super_admin());
