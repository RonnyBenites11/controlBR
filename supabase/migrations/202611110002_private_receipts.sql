begin;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create function public.can_upload_receipt(p_path text) returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() and exists (
    select 1 from public.sales s join public.lives l on l.id = s.live_id
    where s.id::text = split_part(p_path, '/', 2) and l.id::text = split_part(p_path, '/', 1)
    and l.status = 'open' and s.cancelled_at is null
    and p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
  );
$$;
revoke all on function public.can_upload_receipt(text) from public, anon;
grant execute on function public.can_upload_receipt(text) to authenticated;
create policy receipts_download on storage.objects for select to authenticated
using (bucket_id = 'receipts' and public.is_staff());
create policy receipts_upload on storage.objects for insert to authenticated
with check (bucket_id = 'receipts' and public.can_upload_receipt(name));
-- Solo objetos todavía no vinculados; los comprobantes vinculados forman parte del historial.
create policy receipts_orphan_delete on storage.objects for delete to authenticated
using (bucket_id = 'receipts' and public.is_staff()
  and owner_id = auth.uid()::text
  and not exists(select 1 from public.receipts where storage_path = name));

create function public.attach_receipt(p_sale_id uuid, p_path text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_live uuid; v_status public.live_status; v_id uuid;
begin
  v_actor := public.require_staff();
  select live_id into v_live from public.sales where id = p_sale_id and cancelled_at is null;
  if not found then raise exception 'Venta inexistente o anulada.'; end if;
  select status into v_status from public.lives where id = v_live for update;
  if v_status <> 'open' then raise exception 'Solo puedes adjuntar comprobantes a un Live abierto.'; end if;
  if not public.can_upload_receipt(p_path) or split_part(p_path, '/', 2) <> p_sale_id::text then
    raise exception 'Ruta de comprobante inválida.';
  end if;
  if not exists(select 1 from storage.objects where bucket_id = 'receipts' and name = p_path) then
    raise exception 'Sube la imagen antes de vincularla.';
  end if;
  insert into public.receipts(sale_id, storage_path, created_by) values (p_sale_id, p_path, v_actor) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.attach_receipt(uuid,text) from public, anon;
grant execute on function public.attach_receipt(uuid,text) to authenticated;
commit;
