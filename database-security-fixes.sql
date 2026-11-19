-- =====================================================
-- SECURITY FIXES MIGRATION
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run. Runs in a single transaction: if any step fails, nothing changes.
--
-- What it does:
--   1. Stops users from making themselves admin (is_admin / role / is_active are
--      now only changeable by an admin or the server's service-role key).
--   2. Removes the browser's ability to create or edit orders / order items.
--      Orders are now created only by the API server after it verifies payment.
--   3. Adds checkout_sessions (server-only) to hold the server-calculated price
--      between "create payment" and "payment verified".
--   4. Fixes the order-total trigger, which was ignoring discounts.
--   5. Adds a server-only function to count promo code usage.
--
-- Deploy order: deploy the new server + frontend FIRST, then run this right after.
--   * Running it before the deploy would let the OLD frontend take a payment and
--     then fail to save the order (it writes orders from the browser).
--   * In the short gap after the deploy, checkout fails at "create payment"
--     (checkout_sessions doesn't exist yet), before any money is taken.
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Admin helper functions: pin search_path, ignore deactivated accounts
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.is_admin = true
          AND COALESCE(u.is_active, true) = true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_by_role()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
    RETURN public.is_admin();
END;
$$;

-- -----------------------------------------------------
-- 2. Block privilege escalation on public.users
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_user_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- No end-user JWT (service-role key, SQL editor, auth signup trigger): allow.
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    -- Admins may manage other accounts.
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- A user creating their own profile row always starts as a normal user.
        NEW.is_admin   := false;
        NEW.role       := 'user';
        NEW.is_active  := true;
        NEW.created_by := NULL;
    ELSIF NEW.is_admin   IS DISTINCT FROM OLD.is_admin
       OR NEW.role       IS DISTINCT FROM OLD.role
       OR NEW.is_active  IS DISTINCT FROM OLD.is_active
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.id         IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Not allowed to change account privileges'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_privileged_columns_trigger ON public.users;
CREATE TRIGGER protect_user_privileged_columns_trigger
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.protect_user_privileged_columns();

-- -----------------------------------------------------
-- 3. Rebuild RLS policies on users / orders / order_items from scratch.
--    Drops EVERY existing policy on these tables (including any added later in the
--    dashboard) so no forgotten permissive policy survives.
-- -----------------------------------------------------
DO $$
DECLARE p record;
BEGIN
    FOR p IN
        SELECT policyname, tablename FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('users', 'orders', 'order_items')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
    END LOOP;
END $$;

ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- users: own row, or admin. Privileged columns are guarded by the trigger above.
CREATE POLICY "users_select_own_or_admin" ON public.users
    FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "users_insert_own_or_admin" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "users_update_own_or_admin" ON public.users
    FOR UPDATE USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- orders: customers can only READ their own. Creation, cancellation and refunds
-- go through the API server (service role), which bypasses RLS.
CREATE POLICY "orders_select_own" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_admin_all" ON public.orders
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- order_items: same rule.
CREATE POLICY "order_items_select_own" ON public.order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.orders o
                WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
    );
CREATE POLICY "order_items_admin_all" ON public.order_items
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -----------------------------------------------------
-- 4. Checkout sessions (server-only: RLS on, no policies, no grants)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
    razorpay_order_id TEXT PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email        TEXT,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    quote        JSONB NOT NULL,
    status       TEXT NOT NULL DEFAULT 'created'
                 CHECK (status IN ('created', 'processing', 'completed', 'failed')),
    order_id     UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    payment_id   TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_sessions FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user ON public.checkout_sessions(user_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_code TEXT;

-- One order per payment (backs up the existing check trigger against races).
DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_payment_id
        ON public.orders(payment_id) WHERE payment_id IS NOT NULL;
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Duplicate payment_id rows exist in orders; unique index skipped. Clean them up and re-run.';
END $$;

-- -----------------------------------------------------
-- 5. Order totals trigger: include the discount (it was being dropped)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_order_id UUID := COALESCE(NEW.order_id, OLD.order_id);
    v_subtotal DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
    FROM public.order_items WHERE order_id = v_order_id;

    -- An order with no items yet keeps the totals it was created with.
    IF v_subtotal = 0 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    UPDATE public.orders
    SET subtotal   = v_subtotal,
        total      = GREATEST(v_subtotal + COALESCE(shipping_amount, 0)
                              + COALESCE(tax_amount, 0)
                              - COALESCE(discount_amount, 0), 0.01),
        updated_at = NOW()
    WHERE id = v_order_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- -----------------------------------------------------
-- 6. Promo usage counter (callable only with the service-role key)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_promo_usage(p_code TEXT)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.promo_codes
    SET used_count = used_count + 1, updated_at = NOW()
    WHERE code = UPPER(p_code);
$$;
REVOKE EXECUTE ON FUNCTION public.increment_promo_usage(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_usage(TEXT) TO service_role;

-- -----------------------------------------------------
-- 7. Stock adjustment (service-role only): -1 when an order is paid,
--    +1 when it is cancelled. Never goes below zero.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_items JSONB, p_direction INTEGER)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE item JSONB;
BEGIN
    IF p_direction NOT IN (-1, 1) THEN
        RAISE EXCEPTION 'p_direction must be -1 or 1';
    END IF;
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        UPDATE public.products
        SET stock = GREATEST(COALESCE(stock, 0) + p_direction * (item->>'quantity')::INTEGER, 0),
            updated_at = NOW()
        WHERE id = (item->>'product_id')::UUID;
    END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(JSONB, INTEGER) TO service_role;

COMMIT;

-- =====================================================
-- VERIFY (run these after the migration)
-- =====================================================
-- Policies now in place:
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename IN ('users','orders','order_items')
--   ORDER BY tablename, policyname;
--
-- Any public table WITHOUT row-level security (should return no rows):
--   SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;
--
-- Who is an admin right now (check nobody unexpected is on this list):
--   SELECT id, email, role, is_admin FROM public.users WHERE is_admin OR role <> 'user';
