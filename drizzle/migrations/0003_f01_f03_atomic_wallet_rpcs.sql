-- F-01/F-02/F-03 corrective migration.
-- Additive only: preserves existing wallet, withdrawal, role and storage data.
-- Do not re-run the core migration or mutate existing business rows.

DO $preflight$
BEGIN
  IF to_regclass('public.wallets') IS NULL
     OR to_regclass('public.wallet_transactions') IS NULL
     OR to_regclass('public.withdrawals') IS NULL
     OR to_regclass('public.user_roles') IS NULL
     OR to_regclass('public.campaigns') IS NULL THEN
    RAISE EXCEPTION 'F-01/F-02/F-03 preflight failed: expected core tables are missing';
  END IF;

  IF to_regprocedure('public.release_my_pending()') IS NULL
     OR to_regprocedure('public.request_withdrawal(numeric,text,text)') IS NULL
     OR to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'F-01/F-02/F-03 preflight failed: expected RPC signatures are missing';
  END IF;
END;
$preflight$;

--> statement-breakpoint

-- F-01: claim matured rows under row locks before crediting the wallet.
-- SKIP LOCKED ensures concurrent callers cannot claim the same transaction.
CREATE OR REPLACE FUNCTION public.release_my_pending()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_released numeric := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  WITH candidates AS MATERIALIZED (
    SELECT wt.id, wt.valor
      FROM public.wallet_transactions AS wt
     WHERE wt.user_id = v_user_id
       AND wt.liberado = false
       AND wt.liberar_em <= now()
     FOR UPDATE SKIP LOCKED
  ),
  totals AS (
    SELECT coalesce(sum(c.valor), 0) AS total
      FROM candidates AS c
  ),
  released AS (
    UPDATE public.wallet_transactions AS wt
       SET liberado = true
      FROM candidates AS c
      CROSS JOIN totals AS t
     WHERE wt.id = c.id
       AND t.total > 0
    RETURNING wt.valor
  )
  SELECT coalesce(sum(r.valor), 0)
    INTO v_released
    FROM released AS r;

  IF v_released > 0 THEN
    UPDATE public.wallets
       SET saldo_pendente = saldo_pendente - v_released,
           saldo_disponivel = saldo_disponivel + v_released
     WHERE user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Carteira do usuário não encontrada' USING ERRCODE = 'P0002';
    END IF;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.release_my_pending() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_my_pending() TO authenticated, service_role;

--> statement-breakpoint

-- F-02: serialize withdrawals per wallet before checking the 24-hour limit.
-- The wallet row lock is held through the daily-limit check and withdrawal insert.
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _valor numeric,
  _chave text,
  _tipo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  w public.wallets;
  st public.platform_settings;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  IF _valor IS NULL OR _valor <= 0 THEN
    RAISE EXCEPTION 'Valor de saque inválido' USING ERRCODE = '22023';
  END IF;

  PERFORM public.release_my_pending();

  SELECT *
    INTO w
    FROM public.wallets
   WHERE user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carteira não encontrada' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO st
    FROM public.platform_settings
   WHERE id = 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configurações da plataforma não encontradas' USING ERRCODE = 'P0002';
  END IF;

  IF _valor < st.saque_minimo THEN
    RAISE EXCEPTION 'Saque mínimo de R$ %', st.saque_minimo;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.withdrawals
     WHERE user_id = v_user_id
       AND created_at > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'Apenas 1 saque por dia';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.profiles
     WHERE id = v_user_id
       AND status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'Conta em revisão ou perfil indisponível';
  END IF;

  IF w.saldo_disponivel < _valor THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  UPDATE public.wallets
     SET saldo_disponivel = saldo_disponivel - _valor
   WHERE user_id = v_user_id;

  INSERT INTO public.withdrawals(user_id, valor, chave_pix, tipo_chave)
  VALUES (v_user_id, _valor, _chave, _tipo);

  INSERT INTO public.wallet_transactions(user_id, tipo, valor, descricao)
  VALUES (v_user_id, 'saque', -_valor, 'Saque via Pix solicitado');
END;
$function$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated, service_role;

--> statement-breakpoint

-- F-03: a caller may only inspect their own role membership.
-- Anonymous callers have no auth.uid(), so the function always returns false.
CREATE OR REPLACE FUNCTION public.has_role(
  _user_id uuid,
  _role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT coalesce(auth.uid() = _user_id, false)
     AND EXISTS (
       SELECT 1
         FROM public.user_roles AS ur
        WHERE ur.user_id = _user_id
          AND ur.role = _role
     );
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

--> statement-breakpoint

-- Keep anonymous campaign discovery working without granting anon access to has_role().
DROP POLICY IF EXISTS "active campaigns public" ON public.campaigns;

CREATE POLICY "active campaigns anon"
  ON public.campaigns
  FOR SELECT
  TO anon
  USING (status = 'ativa');

CREATE POLICY "campaigns authenticated"
  ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (
    status = 'ativa'
    OR advertiser_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

--> statement-breakpoint

-- Fail the migration if effective function permissions do not match the contract.
DO $permissions$
BEGIN
  IF has_function_privilege('anon', 'public.has_role(uuid,public.app_role)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.release_my_pending()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.request_withdrawal(numeric,text,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'F-01/F-02/F-03 permission check failed: anon still has RPC execution';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.has_role(uuid,public.app_role)'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.release_my_pending()'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.request_withdrawal(numeric,text,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'F-01/F-02/F-03 permission check failed: authenticated is missing required RPC execution';
  END IF;
END;
$permissions$;
