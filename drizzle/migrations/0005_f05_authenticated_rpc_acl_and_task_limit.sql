-- F-05: close the remaining public execution surface of authenticated SECURITY DEFINER RPCs.
-- Also serialize daily task-start limits per user and make contest/advertiser RPCs explicit.
-- Data-preserving: only replaces function definitions and function ACLs.

DO $preflight$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.task_starts') IS NULL
     OR to_regclass('public.task_submissions') IS NULL
     OR to_regprocedure('public.start_task(uuid)') IS NULL
     OR to_regprocedure('public.submit_task(uuid,text,text,text)') IS NULL
     OR to_regprocedure('public.contest_submission(uuid)') IS NULL
     OR to_regprocedure('public.admin_set_withdrawal(uuid,public.withdrawal_status)') IS NULL
     OR to_regprocedure('public.become_advertiser()') IS NULL
     OR to_regprocedure('public.create_campaign(text,text,text,text,text,numeric,integer,integer,boolean,text)') IS NULL THEN
    RAISE EXCEPTION 'F-05 preflight failed: expected authenticated RPCs or tables are missing';
  END IF;
END;
$preflight$;

--> statement-breakpoint

-- Every RPC below derives the caller from auth.uid(); anon and service-role calls
-- are not supported application flows. Internal trigger functions are not exposed.
REVOKE ALL ON FUNCTION public.start_task(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.start_task(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_task(uuid, text, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_task(uuid, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.contest_submission(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.contest_submission(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_withdrawal(uuid, public.withdrawal_status) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_withdrawal(uuid, public.withdrawal_status) TO authenticated;

REVOKE ALL ON FUNCTION public.become_advertiser() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.become_advertiser() TO authenticated;

REVOKE ALL ON FUNCTION public.create_campaign(text, text, text, text, text, numeric, integer, integer, boolean, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_campaign(text, text, text, text, text, numeric, integer, integer, boolean, text) TO authenticated;

--> statement-breakpoint

-- Serialize the per-user daily limit. Checking for an existing start before the
-- count also makes retries idempotent even when the daily quota is already full.
CREATE OR REPLACE FUNCTION public.start_task(_campaign_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  c public.campaigns;
  p public.profiles;
  lvl integer;
  hoje integer;
  t timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO p
    FROM public.profiles
   WHERE id = auth.uid()
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF p.status <> 'ativo' THEN
    RAISE EXCEPTION 'Sua conta está %', p.status;
  END IF;

  SELECT *
    INTO c
    FROM public.campaigns
   WHERE id = _campaign_id;

  IF NOT FOUND OR c.status <> 'ativa' THEN
    RAISE EXCEPTION 'Campanha indisponível';
  END IF;

  IF c.advertiser_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode executar sua própria campanha';
  END IF;

  IF c.vagas_restantes <= 0 THEN
    RAISE EXCEPTION 'Sem vagas restantes';
  END IF;

  lvl := public.level_of(p.tarefas_aprovadas);
  IF lvl < c.nivel_minimo THEN
    RAISE EXCEPTION 'Nível insuficiente para esta tarefa';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.task_submissions
     WHERE campaign_id = _campaign_id
       AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Você já executou esta tarefa';
  END IF;

  SELECT started_at
    INTO t
    FROM public.task_starts
   WHERE campaign_id = _campaign_id
     AND user_id = auth.uid();

  IF t IS NOT NULL THEN
    RETURN t;
  END IF;

  SELECT count(*)::integer
    INTO hoje
    FROM public.task_starts
   WHERE user_id = auth.uid()
     AND started_at > date_trunc('day', now());

  IF hoje >= public.daily_limit(lvl) THEN
    RAISE EXCEPTION 'Limite diário de tarefas atingido para seu nível';
  END IF;

  INSERT INTO public.task_starts(campaign_id, user_id)
  VALUES (_campaign_id, auth.uid())
  RETURNING started_at INTO t;

  UPDATE public.profiles
     SET streak = CASE
       WHEN ultimo_dia_ativo = current_date THEN streak
       WHEN ultimo_dia_ativo = current_date - 1 THEN streak + 1
       ELSE 1
     END,
     ultimo_dia_ativo = current_date
   WHERE id = auth.uid();

  RETURN t;
END;
$function$;

--> statement-breakpoint

-- Explicitly reject anonymous calls and lock the target submission during contest.
CREATE OR REPLACE FUNCTION public.contest_submission(_sub_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  s public.task_submissions;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO s
    FROM public.task_submissions
   WHERE id = _sub_id
     AND user_id = auth.uid()
   FOR UPDATE;

  IF NOT FOUND
     OR s.status <> 'rejeitada'
     OR s.revisado_em IS NULL
     OR s.revisado_em <= now() - interval '48 hours' THEN
    RAISE EXCEPTION 'Não é possível contestar';
  END IF;

  UPDATE public.task_submissions
     SET status = 'contestada'
   WHERE id = _sub_id;
END;
$function$;

--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.become_advertiser()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (v_user_id, 'advertiser')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.advertiser_wallets(advertiser_id)
  VALUES (v_user_id)
  ON CONFLICT DO NOTHING;
END;
$function$;

--> statement-breakpoint

DO $permissions$
BEGIN
  IF has_function_privilege('anon', 'public.start_task(uuid)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.submit_task(uuid,text,text,text)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.contest_submission(uuid)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.admin_set_withdrawal(uuid,public.withdrawal_status)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.become_advertiser()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.create_campaign(text,text,text,text,text,numeric,integer,integer,boolean,text)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('service_role', 'public.start_task(uuid)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('service_role', 'public.submit_task(uuid,text,text,text)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('service_role', 'public.contest_submission(uuid)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('service_role', 'public.admin_set_withdrawal(uuid,public.withdrawal_status)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('service_role', 'public.become_advertiser()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('service_role', 'public.create_campaign(text,text,text,text,text,numeric,integer,integer,boolean,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'F-05 permission check failed: anon or service_role retains RPC execution';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.start_task(uuid)'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.submit_task(uuid,text,text,text)'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.contest_submission(uuid)'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.admin_set_withdrawal(uuid,public.withdrawal_status)'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.become_advertiser()'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.create_campaign(text,text,text,text,text,numeric,integer,integer,boolean,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'F-05 permission check failed: authenticated is missing required RPC execution';
  END IF;
END;
$permissions$;
