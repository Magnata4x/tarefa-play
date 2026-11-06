
create policy "upload own proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read proofs" on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.task_submissions s join public.campaigns c on c.id = s.campaign_id
               where s.prova_url = storage.objects.name and c.advertiser_id = auth.uid())
  ));
