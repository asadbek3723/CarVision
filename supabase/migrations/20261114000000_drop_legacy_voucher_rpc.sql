-- The legacy voucher RPC from the first schema is no longer used (redeem_booking replaced it).
-- It is SECURITY DEFINER, never had its EXECUTE grant revoked and has no search_path, so anyone
-- with the anon key could call it through /rest/v1/rpc. Drop it.
DROP FUNCTION IF EXISTS public.redeem_booking_voucher(TEXT, UUID);
