-- Security hardening for privileged RPCs.
-- Keep this migration additive: do not rewrite the already-applied core migration.

create or replace function public.review_submission(
  _sub_id uuid,
  _aprovar boolean,
  _motivo text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '42501';
  end if;

  select c.advertiser_id
    into v_owner
    from public.task_submissions s
    join public.campaigns c on c.id = s.campaign_id
   where s.id = _sub_id;

  if not found then
    raise exception 'Submissão não encontrada' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_role(v_user_id, 'admin'), false)
     and v_owner is distinct from v_user_id then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  if _aprovar then
    perform public._approve_submission(_sub_id, v_user_id);
  else
    perform public._reject_submission(
      _sub_id,
      v_user_id,
      coalesce(_motivo, 'Comprovação inválida')
    );
  end if;

  insert into public.audit_log(actor_id, acao, detalhes)
  values (
    v_user_id,
    case when _aprovar then 'aprovar_submissao' else 'rejeitar_submissao' end,
    jsonb_build_object('id', _sub_id)
  );
end;
$$;

revoke all on function public.review_submission(uuid, boolean, text)
  from public, anon;
grant execute on function public.review_submission(uuid, boolean, text)
  to authenticated;

--> statement-breakpoint

create or replace function public.set_campaign_status(
  _id uuid,
  _status public.campaign_status
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  c public.campaigns;
  refund numeric;
  st public.platform_settings;
  v_is_admin boolean;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '42501';
  end if;

  select *
    into c
    from public.campaigns
   where id = _id
   for update;

  if not found then
    raise exception 'Campanha não encontrada' using errcode = 'P0002';
  end if;

  v_is_admin := coalesce(public.has_role(v_user_id, 'admin'), false);

  if not v_is_admin and c.advertiser_id is distinct from v_user_id then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  if c.status = 'encerrada' then
    raise exception 'Campanha já encerrada';
  end if;

  if _status = 'ativa' and c.status = 'em_analise' and not v_is_admin then
    raise exception 'Aguardando aprovação do admin' using errcode = '42501';
  end if;

  if _status not in ('ativa', 'pausada', 'encerrada') then
    raise exception 'Status inválido';
  end if;

  if _status = 'encerrada' then
    select * into st from public.platform_settings where id = 1;
    refund := round(c.orcamento_restante * (1 + st.comissao_pct / 100), 2);

    update public.campaigns
       set status = 'encerrada',
           orcamento_restante = 0,
           vagas_restantes = 0
     where id = _id;

    if refund > 0 then
      update public.advertiser_wallets
         set saldo = saldo + refund
       where advertiser_id = c.advertiser_id;

      insert into public.wallet_transactions(user_id, tipo, valor, descricao, referencia_id)
      values (c.advertiser_id, 'estorno', refund, 'Estorno: ' || c.titulo, c.id);
    end if;
  else
    update public.campaigns set status = _status where id = _id;
  end if;

  insert into public.audit_log(actor_id, acao, detalhes)
  values (v_user_id, 'campanha_' || _status, jsonb_build_object('id', _id));
end;
$$;

revoke all on function public.set_campaign_status(uuid, public.campaign_status)
  from public, anon;
grant execute on function public.set_campaign_status(uuid, public.campaign_status)
  to authenticated;

--> statement-breakpoint

-- Deposits must only be credited after a verified payment-provider webhook.
-- The former mock implementation directly increased the advertiser balance.
create or replace function public.mock_deposit(_valor numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Depósitos simulados desativados. Aguarde a integração de pagamento confirmada.'
    using errcode = '0A000';
end;
$$;

revoke all on function public.mock_deposit(numeric)
  from public, anon, authenticated, service_role;
