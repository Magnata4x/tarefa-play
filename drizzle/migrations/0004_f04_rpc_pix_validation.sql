-- F-04: harden authenticated RPC grants and validate Pix destination data.
-- Additive and data-preserving. Does not alter wallet balances or existing withdrawals.

DO $preflight$
BEGIN
  IF to_regprocedure('public.release_my_pending()') IS NULL
     OR to_regprocedure('public.request_withdrawal(numeric,text,text)') IS NULL
     OR to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL
     OR to_regclass('public.wallets') IS NULL
     OR to_regclass('public.withdrawals') IS NULL THEN
    RAISE EXCEPTION 'F-04 preflight failed: expected core RPCs or tables are missing';
  END IF;
END;
$preflight$;

--> statement-breakpoint

-- These RPCs require the end-user JWT because they derive identity from auth.uid().
-- service_role has no end-user identity in normal server-key calls and must not be
-- advertised as an application execution path.
REVOKE ALL ON FUNCTION public.release_my_pending() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.release_my_pending() TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

--> statement-breakpoint

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
  v_key text;
  v_digits text;
  v_sum integer := 0;
  v_check_digit integer;
  v_i integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  IF _valor IS NULL OR _valor <= 0 OR _valor::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'Valor de saque inválido' USING ERRCODE = '22023';
  END IF;

  IF _tipo IS NULL OR lower(btrim(_tipo)) NOT IN ('aleatoria', 'cpf', 'email', 'telefone') THEN
    RAISE EXCEPTION 'Tipo de chave Pix inválido' USING ERRCODE = '22023';
  END IF;

  IF _chave IS NULL OR btrim(_chave) = '' THEN
    RAISE EXCEPTION 'Informe a chave Pix' USING ERRCODE = '22023';
  END IF;

  v_key := btrim(_chave);

  IF lower(btrim(_tipo)) = 'cpf' THEN
    v_digits := regexp_replace(v_key, '[^0-9]', '', 'g');
    IF length(v_digits) <> 11 OR v_digits ~ '^([0-9])\1{10}$' THEN
      RAISE EXCEPTION 'Chave Pix CPF inválida' USING ERRCODE = '22023';
    END IF;

    v_sum := 0;
    FOR v_i IN 1..9 LOOP
      v_sum := v_sum + substring(v_digits FROM v_i FOR 1)::integer * (11 - v_i);
    END LOOP;
    v_check_digit := CASE WHEN v_sum % 11 < 2 THEN 0 ELSE 11 - (v_sum % 11) END;
    IF v_check_digit <> substring(v_digits FROM 10 FOR 1)::integer THEN
      RAISE EXCEPTION 'Chave Pix CPF inválida' USING ERRCODE = '22023';
    END IF;

    v_sum := 0;
    FOR v_i IN 1..10 LOOP
      v_sum := v_sum + substring(v_digits FROM v_i FOR 1)::integer * (12 - v_i);
    END LOOP;
    v_check_digit := CASE WHEN v_sum % 11 < 2 THEN 0 ELSE 11 - (v_sum % 11) END;
    IF v_check_digit <> substring(v_digits FROM 11 FOR 1)::integer THEN
      RAISE EXCEPTION 'Chave Pix CPF inválida' USING ERRCODE = '22023';
    END IF;
  ELSIF lower(btrim(_tipo)) = 'email' THEN
    IF length(v_key) > 254 OR v_key !~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9]([A-Z0-9-]{0,61}[A-Z0-9])?(\.[A-Z0-9]([A-Z0-9-]{0,61}[A-Z0-9])?)+$' THEN
      RAISE EXCEPTION 'Chave Pix e-mail inválida' USING ERRCODE = '22023';
    END IF;
  ELSIF lower(btrim(_tipo)) = 'telefone' THEN
    v_digits := regexp_replace(v_key, '[^0-9]', '', 'g');
    IF v_digits !~ '^(55)?[1-9][0-9]{9,10}$' THEN
      RAISE EXCEPTION 'Chave Pix telefone inválida' USING ERRCODE = '22023';
    END IF;
  ELSIF lower(btrim(_tipo)) = 'aleatoria' THEN
    IF v_key !~* '^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{32})$' THEN
      RAISE EXCEPTION 'Chave Pix aleatória inválida' USING ERRCODE = '22023';
    END IF;
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
  VALUES (v_user_id, _valor, v_key, lower(btrim(_tipo)));

  INSERT INTO public.wallet_transactions(user_id, tipo, valor, descricao)
  VALUES (v_user_id, 'saque', -_valor, 'Saque via Pix solicitado');
END;
$function$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated;

--> statement-breakpoint

DO $permissions$
BEGIN
  IF has_function_privilege('anon', 'public.has_role(uuid,public.app_role)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.release_my_pending()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.request_withdrawal(numeric,text,text)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('service_role', 'public.has_role(uuid,public.app_role)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('service_role', 'public.release_my_pending()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('service_role', 'public.request_withdrawal(numeric,text,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'F-04 permission check failed: anon or service_role retains RPC execution';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.has_role(uuid,public.app_role)'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.release_my_pending()'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.request_withdrawal(numeric,text,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'F-04 permission check failed: authenticated is missing required RPC execution';
  END IF;
END;
$permissions$;
