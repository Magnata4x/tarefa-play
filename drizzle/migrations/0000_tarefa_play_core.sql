
-- ENUMS
create type public.app_role as enum ('user','advertiser','admin');
create type public.campaign_status as enum ('rascunho','em_analise','ativa','pausada','encerrada');
create type public.submission_status as enum ('pendente','aprovada','rejeitada','contestada');
create type public.tx_type as enum ('ganho','saque','bonus','estorno','deposito','gasto_campanha','liberacao');
create type public.withdrawal_status as enum ('solicitado','aprovado','pago','recusado');

-- SETTINGS (single row)
create table public.platform_settings (
  id int primary key default 1 check (id = 1),
  comissao_pct numeric not null default 35,
  saque_minimo numeric not null default 10,
  horas_saldo_pendente int not null default 24,
  dias_conta_nova int not null default 7,
  score_auto_aprovacao int not null default 70,
  score_revisao int not null default 30,
  limite_bronze int not null default 10,
  limite_prata int not null default 20,
  limite_ouro int not null default 40,
  limite_diamante int not null default 80
);
insert into public.platform_settings (id) values (1);
grant select on public.platform_settings to anon, authenticated;
grant all on public.platform_settings to service_role;
alter table public.platform_settings enable row level security;
create policy "settings readable" on public.platform_settings for select using (true);

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  avatar_url text,
  xp int not null default 0,
  tarefas_aprovadas int not null default 0,
  score_confianca int not null default 80,
  cpf_hash text unique,
  telefone text unique,
  telefone_verificado boolean not null default false,
  device_hash text,
  referral_code text unique default substr(md5(gen_random_uuid()::text),1,8),
  status text not null default 'ativo',
  streak int not null default 0,
  ultimo_dia_ativo date,
  aceite_termos_em timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

-- prevent users changing protected profile columns
create or replace function public.protect_profile_cols() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if current_setting('app.trusted', true) = '1' or public.has_role(auth.uid(),'admin') then return new; end if;
  new.xp := old.xp; new.tarefas_aprovadas := old.tarefas_aprovadas; new.score_confianca := old.score_confianca;
  new.status := old.status; new.telefone_verificado := old.telefone_verificado; new.referral_code := old.referral_code;
  new.streak := old.streak; new.ultimo_dia_ativo := old.ultimo_dia_ativo; new.created_at := old.created_at;
  return new;
end $$;
create trigger trg_protect_profile before update on public.profiles for each row execute function public.protect_profile_cols();

-- SOCIAL ACCOUNTS
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  rede text not null,
  handle text not null,
  verificada boolean not null default false,
  created_at timestamptz not null default now(),
  unique (rede, handle)
);
grant select, insert, delete on public.social_accounts to authenticated;
grant all on public.social_accounts to service_role;
alter table public.social_accounts enable row level security;
create policy "own social" on public.social_accounts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and verificada = false);

-- CAMPAIGNS
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null,
  titulo text not null,
  descricao text,
  rede text not null,
  tipo_tarefa text not null,
  url_alvo text not null,
  recompensa_usuario numeric not null check (recompensa_usuario > 0),
  custo_anunciante numeric not null,
  quantidade int not null check (quantidade > 0),
  orcamento_total numeric not null,
  orcamento_restante numeric not null,
  vagas_restantes int not null,
  max_por_usuario int not null default 1,
  tempo_minimo_seg int not null default 15,
  exige_prova boolean not null default true,
  nivel_minimo int not null default 0,
  instrucoes text,
  status public.campaign_status not null default 'em_analise',
  created_at timestamptz not null default now()
);
grant select on public.campaigns to anon, authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "active campaigns public" on public.campaigns for select using (status = 'ativa' or advertiser_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- TASK STARTS (server-side timer)
create table public.task_starts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null,
  started_at timestamptz not null default now(),
  ip text,
  unique (campaign_id, user_id)
);
grant select on public.task_starts to authenticated;
grant all on public.task_starts to service_role;
alter table public.task_starts enable row level security;
create policy "own starts" on public.task_starts for select to authenticated using (user_id = auth.uid());

-- SUBMISSIONS
create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null,
  status public.submission_status not null default 'pendente',
  prova_url text,
  prova_hash text,
  comentario_texto text,
  tempo_gasto_seg int not null default 0,
  motivo_rejeicao text,
  revisado_por uuid,
  revisado_em timestamptz,
  valor numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);
create index on public.task_submissions (prova_hash);
grant select on public.task_submissions to authenticated;
grant all on public.task_submissions to service_role;
alter table public.task_submissions enable row level security;
create policy "submissions visible" on public.task_submissions for select to authenticated using (
  user_id = auth.uid() or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.campaigns c where c.id = campaign_id and c.advertiser_id = auth.uid()));

-- WALLETS
create table public.wallets (
  user_id uuid primary key,
  saldo_disponivel numeric not null default 0,
  saldo_pendente numeric not null default 0,
  total_ganho numeric not null default 0
);
grant select on public.wallets to authenticated;
grant all on public.wallets to service_role;
alter table public.wallets enable row level security;
create policy "own wallet" on public.wallets for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tipo public.tx_type not null,
  valor numeric not null,
  descricao text,
  referencia_id uuid,
  liberar_em timestamptz,
  liberado boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.wallet_transactions to authenticated;
grant all on public.wallet_transactions to service_role;
alter table public.wallet_transactions enable row level security;
create policy "own tx" on public.wallet_transactions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  valor numeric not null,
  chave_pix text not null,
  tipo_chave text not null,
  status public.withdrawal_status not null default 'solicitado',
  created_at timestamptz not null default now()
);
grant select on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
alter table public.withdrawals enable row level security;
create policy "own withdrawals" on public.withdrawals for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.advertiser_wallets (
  advertiser_id uuid primary key,
  saldo numeric not null default 0
);
grant select on public.advertiser_wallets to authenticated;
grant all on public.advertiser_wallets to service_role;
alter table public.advertiser_wallets enable row level security;
create policy "own adv wallet" on public.advertiser_wallets for select to authenticated using (advertiser_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null,
  referred_id uuid not null unique,
  bonus_pago boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;
create policy "own referrals" on public.referrals for select to authenticated using (referrer_id = auth.uid() or referred_id = auth.uid());

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  campaign_id uuid,
  motivo text not null,
  status text not null default 'aberta',
  created_at timestamptz not null default now()
);
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "insert own report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "read reports" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  acao text not null,
  detalhes jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "admin audit" on public.audit_log for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- SIGNUP TRIGGER
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, avatar_url, aceite_termos_em)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'avatar_url',
          case when new.raw_user_meta_data ? 'aceite_termos' then now() else null end);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  insert into public.wallets (user_id) values (new.id);
  if new.raw_user_meta_data ? 'ref' then
    insert into public.referrals (referrer_id, referred_id)
    select p.id, new.id from public.profiles p where p.referral_code = new.raw_user_meta_data->>'ref' and p.id <> new.id
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- HELPERS
create or replace function public.level_of(_aprovadas int) returns int language sql immutable as $$
  select case when _aprovadas >= 300 then 3 when _aprovadas >= 100 then 2 when _aprovadas >= 20 then 1 else 0 end
$$;

create or replace function public.daily_limit(_level int) returns int language sql stable set search_path=public as $$
  select case _level when 3 then limite_diamante when 2 then limite_ouro when 1 then limite_prata else limite_bronze end from public.platform_settings where id=1
$$;

-- release matured pending balance for the caller
create or replace function public.release_my_pending() returns void language plpgsql security definer set search_path=public as $$
declare v numeric;
begin
  select coalesce(sum(valor),0) into v from public.wallet_transactions
   where user_id = auth.uid() and liberado = false and liberar_em <= now();
  if v > 0 then
    update public.wallet_transactions set liberado = true where user_id = auth.uid() and liberado = false and liberar_em <= now();
    update public.wallets set saldo_pendente = saldo_pendente - v, saldo_disponivel = saldo_disponivel + v where user_id = auth.uid();
  end if;
end $$;

-- internal: approve a submission and credit
create or replace function public._approve_submission(_sub_id uuid, _reviewer uuid) returns void language plpgsql security definer set search_path=public as $$
declare s public.task_submissions; p public.profiles; st public.platform_settings; nova boolean; ref public.referrals;
begin
  select * into s from public.task_submissions where id = _sub_id for update;
  if s.status = 'aprovada' then return; end if;
  select * into p from public.profiles where id = s.user_id;
  select * into st from public.platform_settings where id=1;
  nova := p.created_at > now() - make_interval(days => st.dias_conta_nova);
  update public.task_submissions set status='aprovada', revisado_por=_reviewer, revisado_em=now(), motivo_rejeicao=null where id=_sub_id;
  if nova then
    insert into public.wallet_transactions(user_id,tipo,valor,descricao,referencia_id,liberar_em,liberado)
      values (s.user_id,'ganho',s.valor,'Tarefa aprovada',s.id, now()+make_interval(hours=>st.horas_saldo_pendente), false);
    update public.wallets set saldo_pendente=saldo_pendente+s.valor, total_ganho=total_ganho+s.valor where user_id=s.user_id;
  else
    insert into public.wallet_transactions(user_id,tipo,valor,descricao,referencia_id) values (s.user_id,'ganho',s.valor,'Tarefa aprovada',s.id);
    update public.wallets set saldo_disponivel=saldo_disponivel+s.valor, total_ganho=total_ganho+s.valor where user_id=s.user_id;
  end if;
  perform set_config('app.trusted','1',true);
  update public.profiles set tarefas_aprovadas=tarefas_aprovadas+1, xp=xp+10, score_confianca=least(100,score_confianca+1) where id=s.user_id;
  -- referral bonus after 10 approved tasks (single level)
  select * into ref from public.referrals where referred_id=s.user_id and bonus_pago=false;
  if found and p.tarefas_aprovadas + 1 >= 10 then
    update public.referrals set bonus_pago=true where id=ref.id;
    insert into public.wallet_transactions(user_id,tipo,valor,descricao,referencia_id) values (ref.referrer_id,'bonus',2,'Bônus de indicação',ref.id);
    update public.wallets set saldo_disponivel=saldo_disponivel+2, total_ganho=total_ganho+2 where user_id=ref.referrer_id;
  end if;
end $$;
revoke all on function public._approve_submission(uuid,uuid) from public, anon, authenticated;

create or replace function public._reject_submission(_sub_id uuid, _reviewer uuid, _motivo text) returns void language plpgsql security definer set search_path=public as $$
declare s public.task_submissions; st public.platform_settings;
begin
  select * into s from public.task_submissions where id=_sub_id for update;
  if s.status = 'rejeitada' then return; end if;
  if s.status = 'aprovada' then raise exception 'Submissão já aprovada'; end if;
  select * into st from public.platform_settings where id=1;
  update public.task_submissions set status='rejeitada', revisado_por=_reviewer, revisado_em=now(), motivo_rejeicao=_motivo where id=_sub_id;
  -- return slot and budget to campaign
  update public.campaigns set vagas_restantes=vagas_restantes+1, orcamento_restante=orcamento_restante+s.valor where id=s.campaign_id;
  perform set_config('app.trusted','1',true);
  update public.profiles set score_confianca=greatest(0,score_confianca-5),
    status = case when score_confianca-5 < st.score_revisao and status='ativo' then 'em_revisao' else status end
   where id=s.user_id;
end $$;
revoke all on function public._reject_submission(uuid,uuid,text) from public, anon, authenticated;

-- START TASK
create or replace function public.start_task(_campaign_id uuid) returns timestamptz language plpgsql security definer set search_path=public as $$
declare c public.campaigns; p public.profiles; lvl int; hoje int; t timestamptz;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  select * into p from public.profiles where id=auth.uid();
  if p.status <> 'ativo' then raise exception 'Sua conta está %', p.status; end if;
  select * into c from public.campaigns where id=_campaign_id;
  if not found or c.status <> 'ativa' then raise exception 'Campanha indisponível'; end if;
  if c.advertiser_id = auth.uid() then raise exception 'Você não pode executar sua própria campanha'; end if;
  if c.vagas_restantes <= 0 then raise exception 'Sem vagas restantes'; end if;
  lvl := public.level_of(p.tarefas_aprovadas);
  if lvl < c.nivel_minimo then raise exception 'Nível insuficiente para esta tarefa'; end if;
  if exists (select 1 from public.task_submissions where campaign_id=_campaign_id and user_id=auth.uid()) then raise exception 'Você já executou esta tarefa'; end if;
  select count(*) into hoje from public.task_starts where user_id=auth.uid() and started_at > date_trunc('day', now());
  select started_at into t from public.task_starts where campaign_id=_campaign_id and user_id=auth.uid();
  if t is not null then return t; end if;
  if hoje >= public.daily_limit(lvl) then raise exception 'Limite diário de tarefas atingido para seu nível'; end if;
  insert into public.task_starts(campaign_id,user_id) values (_campaign_id, auth.uid()) returning started_at into t;
  -- streak
  perform set_config('app.trusted','1',true);
  update public.profiles set
    streak = case when ultimo_dia_ativo = current_date then streak when ultimo_dia_ativo = current_date - 1 then streak+1 else 1 end,
    ultimo_dia_ativo = current_date where id=auth.uid();
  return t;
end $$;

-- SUBMIT TASK
create or replace function public.submit_task(_campaign_id uuid, _prova_url text, _prova_hash text, _comentario text)
returns public.submission_status language plpgsql security definer set search_path=public as $$
declare c public.campaigns; p public.profiles; st public.platform_settings; t timestamptz; secs int; sid uuid; dup boolean;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  select * into c from public.campaigns where id=_campaign_id for update;
  if not found or c.status <> 'ativa' then raise exception 'Campanha indisponível'; end if;
  if c.vagas_restantes <= 0 or c.orcamento_restante < c.recompensa_usuario then raise exception 'Sem vagas restantes'; end if;
  select started_at into t from public.task_starts where campaign_id=_campaign_id and user_id=auth.uid();
  if t is null then raise exception 'Inicie a tarefa antes de concluir'; end if;
  secs := extract(epoch from (now()-t))::int;
  if secs < c.tempo_minimo_seg then raise exception 'Tempo mínimo não cumprido (% de % s)', secs, c.tempo_minimo_seg; end if;
  if c.exige_prova and coalesce(_prova_url,'') = '' then raise exception 'Envie o print de comprovação'; end if;
  if c.tipo_tarefa = 'comentar' and length(coalesce(_comentario,'')) < 10 then raise exception 'Escreva o comentário que você publicou (mín. 10 caracteres)'; end if;
  dup := _prova_hash is not null and exists (select 1 from public.task_submissions where prova_hash=_prova_hash);
  select * into p from public.profiles where id=auth.uid();
  select * into st from public.platform_settings where id=1;
  insert into public.task_submissions(campaign_id,user_id,prova_url,prova_hash,comentario_texto,tempo_gasto_seg,valor)
    values (_campaign_id, auth.uid(), _prova_url, _prova_hash, _comentario, secs, c.recompensa_usuario) returning id into sid;
  update public.campaigns set vagas_restantes=vagas_restantes-1, orcamento_restante=orcamento_restante-c.recompensa_usuario,
    status = case when vagas_restantes-1 <= 0 then 'encerrada'::public.campaign_status else status end where id=_campaign_id;
  if dup then
    perform public._reject_submission(sid, null, 'Print reutilizado detectado');
    return 'rejeitada';
  end if;
  if p.score_confianca >= st.score_auto_aprovacao and p.status='ativo' then
    perform public._approve_submission(sid, null);
    return 'aprovada';
  end if;
  return 'pendente';
end $$;

-- REVIEW (admin or campaign owner)
create or replace function public.review_submission(_sub_id uuid, _aprovar boolean, _motivo text default null) returns void language plpgsql security definer set search_path=public as $$
declare owner uuid;
begin
  select c.advertiser_id into owner from public.task_submissions s join public.campaigns c on c.id=s.campaign_id where s.id=_sub_id;
  if not (public.has_role(auth.uid(),'admin') or owner = auth.uid()) then raise exception 'Sem permissão'; end if;
  if _aprovar then perform public._approve_submission(_sub_id, auth.uid());
  else perform public._reject_submission(_sub_id, auth.uid(), coalesce(_motivo,'Comprovação inválida')); end if;
  insert into public.audit_log(actor_id,acao,detalhes) values (auth.uid(), case when _aprovar then 'aprovar_submissao' else 'rejeitar_submissao' end, jsonb_build_object('id',_sub_id));
end $$;

-- CONTEST (user, within 48h)
create or replace function public.contest_submission(_sub_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  update public.task_submissions set status='contestada' where id=_sub_id and user_id=auth.uid() and status='rejeitada' and revisado_em > now() - interval '48 hours';
  if not found then raise exception 'Não é possível contestar'; end if;
end $$;

-- WITHDRAW
create or replace function public.request_withdrawal(_valor numeric, _chave text, _tipo text) returns void language plpgsql security definer set search_path=public as $$
declare w public.wallets; st public.platform_settings;
begin
  perform public.release_my_pending();
  select * into st from public.platform_settings where id=1;
  if _valor < st.saque_minimo then raise exception 'Saque mínimo de R$ %', st.saque_minimo; end if;
  if exists (select 1 from public.withdrawals where user_id=auth.uid() and created_at > now() - interval '24 hours') then raise exception 'Apenas 1 saque por dia'; end if;
  select * into w from public.wallets where user_id=auth.uid() for update;
  if w.saldo_disponivel < _valor then raise exception 'Saldo insuficiente'; end if;
  if (select status from public.profiles where id=auth.uid()) <> 'ativo' then raise exception 'Conta em revisão'; end if;
  update public.wallets set saldo_disponivel=saldo_disponivel-_valor where user_id=auth.uid();
  insert into public.withdrawals(user_id,valor,chave_pix,tipo_chave) values (auth.uid(),_valor,_chave,_tipo);
  insert into public.wallet_transactions(user_id,tipo,valor,descricao) values (auth.uid(),'saque',-_valor,'Saque via Pix solicitado');
end $$;

create or replace function public.admin_set_withdrawal(_id uuid, _status public.withdrawal_status) returns void language plpgsql security definer set search_path=public as $$
declare w public.withdrawals;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Sem permissão'; end if;
  select * into w from public.withdrawals where id=_id for update;
  if w.status in ('pago','recusado') then raise exception 'Saque já finalizado'; end if;
  update public.withdrawals set status=_status where id=_id;
  if _status='recusado' then
    update public.wallets set saldo_disponivel=saldo_disponivel+w.valor where user_id=w.user_id;
    insert into public.wallet_transactions(user_id,tipo,valor,descricao,referencia_id) values (w.user_id,'estorno',w.valor,'Saque recusado',w.id);
  end if;
  insert into public.audit_log(actor_id,acao,detalhes) values (auth.uid(),'saque_'||_status, jsonb_build_object('id',_id));
end $$;

-- ADVERTISER
create or replace function public.become_advertiser() returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.user_roles(user_id,role) values (auth.uid(),'advertiser') on conflict do nothing;
  insert into public.advertiser_wallets(advertiser_id) values (auth.uid()) on conflict do nothing;
end $$;

-- TODO: substituir por integração Pix real (webhook confirma o pagamento antes de creditar)
create or replace function public.mock_deposit(_valor numeric) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(),'advertiser') then raise exception 'Apenas anunciantes'; end if;
  if _valor <= 0 or _valor > 10000 then raise exception 'Valor inválido'; end if;
  update public.advertiser_wallets set saldo=saldo+_valor where advertiser_id=auth.uid();
  insert into public.wallet_transactions(user_id,tipo,valor,descricao) values (auth.uid(),'deposito',_valor,'Depósito Pix (simulado)');
end $$;

create or replace function public.create_campaign(_titulo text, _descricao text, _rede text, _tipo text, _url text,
  _recompensa numeric, _quantidade int, _tempo int, _exige_prova boolean, _instrucoes text) returns uuid
language plpgsql security definer set search_path=public as $$
declare st public.platform_settings; base numeric; total numeric; bal numeric; cid uuid;
begin
  if not public.has_role(auth.uid(),'advertiser') then raise exception 'Apenas anunciantes'; end if;
  if _recompensa < 0.05 then raise exception 'Recompensa mínima R$ 0,05'; end if;
  if _quantidade < 1 or _quantidade > 100000 then raise exception 'Quantidade inválida'; end if;
  select * into st from public.platform_settings where id=1;
  base := round(_recompensa * _quantidade, 2);
  total := round(base * (1 + st.comissao_pct/100), 2);
  select saldo into bal from public.advertiser_wallets where advertiser_id=auth.uid() for update;
  if coalesce(bal,0) < total then raise exception 'Saldo insuficiente: custo total R$ %', total; end if;
  update public.advertiser_wallets set saldo=saldo-total where advertiser_id=auth.uid();
  insert into public.campaigns(advertiser_id,titulo,descricao,rede,tipo_tarefa,url_alvo,recompensa_usuario,custo_anunciante,quantidade,
    orcamento_total,orcamento_restante,vagas_restantes,tempo_minimo_seg,exige_prova,instrucoes,status)
  values (auth.uid(),_titulo,_descricao,_rede,_tipo,_url,_recompensa,total,_quantidade,base,base,_quantidade,greatest(_tempo,5),_exige_prova,_instrucoes,'em_analise')
  returning id into cid;
  insert into public.wallet_transactions(user_id,tipo,valor,descricao,referencia_id) values (auth.uid(),'gasto_campanha',-total,'Campanha: '||_titulo,cid);
  return cid;
end $$;

create or replace function public.set_campaign_status(_id uuid, _status public.campaign_status) returns void language plpgsql security definer set search_path=public as $$
declare c public.campaigns; refund numeric; st public.platform_settings; is_admin boolean;
begin
  select * into c from public.campaigns where id=_id for update;
  is_admin := public.has_role(auth.uid(),'admin');
  if not (is_admin or c.advertiser_id=auth.uid()) then raise exception 'Sem permissão'; end if;
  if c.status='encerrada' then raise exception 'Campanha já encerrada'; end if;
  if _status='ativa' and c.status='em_analise' and not is_admin then raise exception 'Aguardando aprovação do admin'; end if;
  if _status not in ('ativa','pausada','encerrada') then raise exception 'Status inválido'; end if;
  if _status='encerrada' then
    select * into st from public.platform_settings where id=1;
    refund := round(c.orcamento_restante * (1 + st.comissao_pct/100), 2);
    update public.campaigns set status='encerrada', orcamento_restante=0, vagas_restantes=0 where id=_id;
    if refund > 0 then
      update public.advertiser_wallets set saldo=saldo+refund where advertiser_id=c.advertiser_id;
      insert into public.wallet_transactions(user_id,tipo,valor,descricao,referencia_id) values (c.advertiser_id,'estorno',refund,'Estorno: '||c.titulo,c.id);
    end if;
  else
    update public.campaigns set status=_status where id=_id;
  end if;
  insert into public.audit_log(actor_id,acao,detalhes) values (auth.uid(),'campanha_'||_status, jsonb_build_object('id',_id));
end $$;

-- SEED: demo campaigns from a demo advertiser
do $$
declare adv uuid := '00000000-0000-0000-0000-00000000ad01';
begin
insert into public.campaigns(advertiser_id,titulo,descricao,rede,tipo_tarefa,url_alvo,recompensa_usuario,custo_anunciante,quantidade,orcamento_total,orcamento_restante,vagas_restantes,tempo_minimo_seg,exige_prova,nivel_minimo,instrucoes,status) values
(adv,'Assista ao trailer da Café Serra','Assista pelo menos 30 segundos do vídeo.','youtube','assistir','https://www.youtube.com',0.25,33.75,100,25,25,100,30,true,0,E'Clique em Iniciar para abrir o vídeo.\nAssista pelo menos 30 segundos.\nTire um print mostrando o vídeo em reprodução.','ativa'),
(adv,'Siga a @lojaverdejante','Siga o perfil da loja no Instagram.','instagram','seguir','https://www.instagram.com',0.40,54,100,40,40,87,15,true,0,E'Abra o perfil.\nToque em Seguir.\nEnvie um print mostrando "Seguindo".','ativa'),
(adv,'Comente sua opinião no post de lançamento','Escreva uma opinião sincera e própria.','tiktok','comentar','https://www.tiktok.com',0.60,81,100,60,60,52,20,true,0,E'Assista ao vídeo.\nEscreva um comentário com sua opinião real (nada de texto copiado).\nCole aqui o texto e envie o print.','ativa'),
(adv,'Visite o site da Padaria Aurora','Navegue pela página de cardápio.','site','visitar','https://example.com',0.15,20.25,100,15,15,140,40,false,0,E'Abra o site.\nNavegue por pelo menos 40 segundos.\nVolte e conclua.','ativa'),
(adv,'Curta o vídeo do Kwai da FitBox','Curta o vídeo indicado.','kwai','curtir','https://www.kwai.com',0.20,27,100,20,20,63,10,true,0,E'Abra o vídeo.\nToque no coração.\nEnvie o print.','ativa'),
(adv,'Responda pesquisa rápida (2 min)','Pesquisa sobre hábitos de compra.','site','pesquisa','https://example.com/pesquisa',1.20,162,100,120,120,30,90,false,1,E'Abra a pesquisa.\nResponda todas as perguntas com sinceridade.\nConclua após enviar.','ativa'),
(adv,'Compartilhe o post da campanha solidária','Compartilhe nos seus stories do Facebook.','facebook','compartilhar','https://www.facebook.com',0.50,67.5,100,50,50,44,15,true,0,E'Abra o post.\nCompartilhe publicamente.\nEnvie o print.','ativa'),
(adv,'Siga @techbr_news no X','Siga o perfil de notícias.','x','seguir','https://x.com',0.35,47.25,100,35,35,75,10,true,0,E'Abra o perfil.\nClique em Seguir.\nEnvie o print.','ativa');
end $$;
