-- ============================================================
-- Seller Profile Auto-Creation Trigger
-- Migration: 20260225000000_seller_profile_trigger.sql
-- ============================================================
-- Automatically creates seller_profiles + seller_accounts rows
-- whenever a new user signs up (email/password or OAuth).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create seller_profiles row
  INSERT INTO public.seller_profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- Create seller_accounts row (initialized with 3 free plan reservations)
  INSERT INTO public.seller_accounts (seller_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
