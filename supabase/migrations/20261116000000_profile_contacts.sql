-- Profile contacts: an optional e-mail next to the phone, and verification flags for both.
--
-- The phone stays the login (Supabase Auth keeps a synthetic e-mail derived from it). The e-mail here
-- is a contact address only. Both can be changed from Profile -> Edit; the server sends a one-time code
-- to the new phone (SMS) / e-mail when those services are configured, and stores the change unverified
-- until then.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email VARCHAR(254);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- One account per e-mail, case-insensitive; accounts without an e-mail are not affected.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower
    ON public.profiles (lower(email))
    WHERE email IS NOT NULL;

-- One-time codes now serve three flows; `phone` holds the target (a phone number or an e-mail).
ALTER TABLE public.otp_codes ALTER COLUMN phone TYPE VARCHAR(254);
CREATE INDEX IF NOT EXISTS idx_otp_target_purpose ON public.otp_codes (phone, purpose, created_at DESC);

-- Same guard as before, plus the new contact columns: only the server (service role) may change them.
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_privileged_caller() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.credits_balance IS DISTINCT FROM OLD.credits_balance
       OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
       OR NEW.banned_reason IS DISTINCT FROM OLD.banned_reason
       OR NEW.is_fraud_suspect IS DISTINCT FROM OLD.is_fraud_suspect
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
       OR NEW.free_credits_granted_at IS DISTINCT FROM OLD.free_credits_granted_at
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Protected profile columns cannot be modified by clients';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
