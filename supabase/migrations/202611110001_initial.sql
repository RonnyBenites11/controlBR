begin;

create type public.app_role as enum ('admin', 'staff');
create type public.live_status as enum ('open', 'closed', 'cancelled');
create type public.payment_method as enum ('yape', 'plin', 'transferencia', 'efectivo');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 2 and 100),
  role public.app_role not null default 'staff',
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (sku ~ '^[A-Z0-9-]{2,30}$'),
  name text not null check (length(trim(name)) between 2 and 100),
  base_price numeric(12,2) not null check (base_price > 0 and base_price <= 1000000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create sequence public.barcode_sequence;
create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  color text not null check (length(trim(color)) between 2 and 40),
  size smallint not null check (size between 10 and 45),
  barcode text not null unique default ('BR' || lpad(nextval('public.barcode_sequence')::text, 12, '0')),
  stock integer not null default 0 check (stock >= 0),
  minimum_stock integer not null default 3 check (minimum_stock >= 0),
  unique (product_id, color, size),
  check (barcode ~ '^BR[0-9]{12}$')
);
create table public.lives (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  status public.live_status not null default 'open',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id),
  check ((status = 'open' and closed_at is null and closed_by is null)
     or (status <> 'open' and closed_at is not null and closed_by is not null))
);
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  live_id uuid not null references public.lives(id),
  buyer text not null check (length(trim(buyer)) between 2 and 100),
  payment_method public.payment_method not null,
  notes text not null default '' check (length(notes) <= 500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancellation_reason text,
  check ((cancelled_at is null and cancelled_by is null and cancellation_reason is null)
    or (cancelled_at is not null and cancelled_by is not null and length(trim(cancellation_reason)) between 3 and 300))
);
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id),
  variant_id uuid not null references public.variants(id),
  quantity integer not null check (quantity between 1 and 10000),
  unit_price numeric(12,2) not null check (unit_price > 0 and unit_price <= 1000000),
  product_name text not null,
  color text not null,
  size smallint not null,
  barcode text not null,
  unique (sale_id, variant_id)
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.variants(id),
  kind text not null check (kind in ('production', 'adjustment', 'sale')),
  quantity integer not null check (quantity <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (length(trim(reason)) between 3 and 300),
  live_id uuid references public.lives(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((kind = 'sale' and live_id is not null and quantity < 0)
     or (kind = 'production' and live_id is null and quantity > 0)
     or (kind = 'adjustment' and live_id is null))
);
create unique index one_movement_per_live_variant on public.stock_movements(live_id, variant_id) where kind = 'sale';
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id),
  storage_path text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index variants_product_idx on public.variants(product_id);
create index sales_live_idx on public.sales(live_id);
create index sales_created_idx on public.sales(created_at);
create index items_variant_idx on public.sale_items(variant_id);
create index receipts_sale_idx on public.receipts(sale_id);
create index movements_variant_date_idx on public.stock_movements(variant_id, created_at desc);
create index lives_date_idx on public.lives(created_at desc);

-- No se crea un administrador automáticamente por registrarse.
create function public.on_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Pendiente de acceso'), 100));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.on_new_user();

create function public.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active);
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active and role = 'admin');
$$;
create function public.require_staff() returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Acceso no autorizado.' using errcode = '42501'; end if;
  return auth.uid();
end;
$$;
create function public.require_admin() returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Esta operación requiere administrador.' using errcode = '42501'; end if;
  return auth.uid();
end;
$$;

alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.lives enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.receipts enable row level security;
create policy products_read on public.products for select to authenticated using (public.is_staff());
create policy variants_read on public.variants for select to authenticated using (public.is_staff());
create policy lives_read on public.lives for select to authenticated using (public.is_staff());
create policy sales_read on public.sales for select to authenticated using (public.is_staff());
create policy items_read on public.sale_items for select to authenticated using (public.is_staff());
create policy movements_read on public.stock_movements for select to authenticated using (public.is_staff());
create policy receipts_read on public.receipts for select to authenticated using (public.is_staff());

create function public.save_product(p_id uuid, p_sku text, p_name text, p_price numeric, p_active boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_admin();
  if p_price is null or p_price <> round(p_price, 2) then raise exception 'El precio debe tener como máximo dos decimales.'; end if;
  if p_id is null then
    insert into public.products(sku, name, base_price, active) values (upper(trim(p_sku)), trim(p_name), p_price, p_active) returning id into v_id;
  else
    update public.products set sku = upper(trim(p_sku)), name = trim(p_name), base_price = p_price, active = p_active where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Modelo no encontrado.'; end if;
  end if;
  return v_id;
end;
$$;
create function public.create_variant(p_product_id uuid, p_color text, p_size smallint, p_minimum integer default 3)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_admin();
  insert into public.variants(product_id, color, size, minimum_stock) values (p_product_id, initcap(trim(p_color)), p_size, p_minimum) returning id into v_id;
  return v_id;
end;
$$;
create function public.change_stock(p_variant_id uuid, p_quantity integer, p_kind text, p_reason text, p_request_id uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_balance integer;
begin
  v_actor := public.require_admin();
  if p_kind not in ('production', 'adjustment') or p_kind is null then raise exception 'Tipo de movimiento inválido.'; end if;
  if p_quantity is null or p_quantity = 0 or (p_kind = 'production' and p_quantity < 0) then raise exception 'Cantidad inválida.'; end if;
  select stock into v_balance from public.variants where id = p_variant_id for update;
  if not found then raise exception 'Variante no encontrada.'; end if;
  if p_request_id is not null and exists(select 1 from public.stock_movements where id = p_request_id) then
    if not exists(select 1 from public.stock_movements where id = p_request_id and variant_id = p_variant_id and quantity = p_quantity and kind = p_kind and created_by = v_actor) then
      raise exception 'El identificador ya corresponde a otro movimiento.';
    end if;
    return v_balance;
  end if;
  v_balance := v_balance + p_quantity;
  if v_balance < 0 then raise exception 'Stock insuficiente. El ajuste dejaría stock negativo.'; end if;
  update public.variants set stock = v_balance where id = p_variant_id;
  insert into public.stock_movements(id, variant_id, kind, quantity, balance_after, reason, created_by)
    values (coalesce(p_request_id, gen_random_uuid()), p_variant_id, p_kind, p_quantity, v_balance, trim(p_reason), v_actor);
  return v_balance;
end;
$$;
create function public.create_live(p_name text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_actor uuid;
begin
  v_actor := public.require_staff();
  insert into public.lives(name, created_by) values (trim(p_name), v_actor) returning id into v_id;
  return v_id;
end;
$$;

create function public.create_sale(p_live_id uuid, p_buyer text, p_payment public.payment_method, p_notes text, p_items jsonb, p_request_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sale uuid; v_actor uuid; v_status public.live_status; v_item jsonb; v_variant record;
begin
  v_actor := public.require_staff();
  -- Todas las escrituras de un Live toman el mismo bloqueo antes de tocar ventas.
  select status into v_status from public.lives where id = p_live_id for update;
  if not found then raise exception 'Live no encontrado.'; end if;
  if p_request_id is not null and exists(select 1 from public.sales where id = p_request_id and live_id = p_live_id and created_by = v_actor) then
    if not exists(select 1 from public.sales where id = p_request_id and buyer = trim(p_buyer) and payment_method = p_payment and notes = coalesce(trim(p_notes), ''))
      or (select count(*) from public.sale_items where sale_id = p_request_id) <> jsonb_array_length(p_items)
      or exists(select 1 from jsonb_array_elements(p_items) x where not exists(
        select 1 from public.sale_items i where i.sale_id = p_request_id and i.variant_id = (x->>'variant_id')::uuid
          and i.quantity = (x->>'quantity')::integer and i.unit_price = (x->>'unit_price')::numeric
      )) then
      raise exception 'La solicitud ya se guardó con otros datos. Revisa el historial antes de registrar otra venta.';
    end if;
    return p_request_id;
  end if;
  if not found or v_status <> 'open' then raise exception 'El Live no está abierto.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 or p_items is null then
    raise exception 'La venta debe tener entre 1 y 100 variantes.';
  end if;
  insert into public.sales(id, live_id, buyer, payment_method, notes, created_by)
    values (coalesce(p_request_id, gen_random_uuid()), p_live_id, trim(p_buyer), p_payment, coalesce(trim(p_notes), ''), v_actor) returning id into v_sale;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if (v_item->>'unit_price')::numeric <> round((v_item->>'unit_price')::numeric, 2) then
      raise exception 'El precio debe tener como máximo dos decimales.';
    end if;
    select v.*, p.name as product_name into v_variant from public.variants v join public.products p on p.id = v.product_id
      where v.id = (v_item->>'variant_id')::uuid and p.active;
    if not found then raise exception 'Variante inexistente o modelo archivado.'; end if;
    insert into public.sale_items(sale_id, variant_id, quantity, unit_price, product_name, color, size, barcode)
      values (v_sale, v_variant.id, (v_item->>'quantity')::integer, (v_item->>'unit_price')::numeric,
        v_variant.product_name, v_variant.color, v_variant.size, v_variant.barcode);
  end loop;
  return v_sale;
end;
$$;
create function public.cancel_sale(p_sale_id uuid, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_live_id uuid; v_status public.live_status;
begin
  v_actor := public.require_staff();
  select live_id into v_live_id from public.sales where id = p_sale_id;
  if not found then raise exception 'Venta no encontrada.'; end if;
  select status into v_status from public.lives where id = v_live_id for update;
  if v_status <> 'open' then raise exception 'Solo puedes anular ventas de un Live abierto.'; end if;
  update public.sales set cancelled_at = now(), cancelled_by = v_actor, cancellation_reason = trim(p_reason)
    where id = p_sale_id and cancelled_at is null;
  if not found then raise exception 'La venta ya fue anulada.'; end if;
end;
$$;

create function public.close_live(p_live_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_live public.lives; v_row record; v_stock integer; v_pairs integer := 0; v_total numeric := 0;
begin
  v_actor := public.require_staff();
  select * into v_live from public.lives where id = p_live_id for update;
  if not found then raise exception 'Live no encontrado.'; end if;
  if v_live.status = 'closed' then return jsonb_build_object('already_closed', true); end if;
  if v_live.status <> 'open' then raise exception 'No puedes cerrar un Live cancelado.'; end if;
  -- Orden global de bloqueo: evita interbloqueos al cerrar dos Lives diferentes.
  for v_row in
    select i.variant_id, sum(i.quantity)::integer as qty, sum(i.quantity * i.unit_price) as total
    from public.sale_items i join public.sales s on s.id = i.sale_id
    where s.live_id = p_live_id and s.cancelled_at is null
    group by i.variant_id order by i.variant_id
  loop
    select stock into v_stock from public.variants where id = v_row.variant_id for update;
    if v_stock < v_row.qty then
      raise exception 'Stock insuficiente para %. Disponible: %, vendido: %. No se descontó ningún producto.',
        (select barcode from public.variants where id = v_row.variant_id), v_stock, v_row.qty;
    end if;
    v_stock := v_stock - v_row.qty;
    update public.variants set stock = v_stock where id = v_row.variant_id;
    insert into public.stock_movements(variant_id, kind, quantity, balance_after, reason, live_id, created_by)
      values (v_row.variant_id, 'sale', -v_row.qty, v_stock, 'Cierre de Live: ' || v_live.name, p_live_id, v_actor);
    v_pairs := v_pairs + v_row.qty; v_total := v_total + v_row.total;
  end loop;
  update public.lives set status = 'closed', closed_at = now(), closed_by = v_actor where id = p_live_id;
  return jsonb_build_object('already_closed', false, 'pairs', v_pairs, 'total', v_total);
end;
$$;
create function public.cancel_live(p_live_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_status public.live_status;
begin
  v_actor := public.require_admin();
  select status into v_status from public.lives where id = p_live_id for update;
  if not found or v_status <> 'open' then raise exception 'El Live no está abierto.'; end if;
  if exists(select 1 from public.sales where live_id = p_live_id and cancelled_at is null) then
    raise exception 'Anula las ventas activas antes de cancelar el Live.';
  end if;
  update public.lives set status = 'cancelled', closed_at = now(), closed_by = v_actor where id = p_live_id;
end;
$$;
create function public.manage_profile(p_id uuid, p_name text, p_role public.app_role, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Serializa cambios de permisos para proteger al último administrador.
  perform pg_advisory_xact_lock(741129);
  perform public.require_admin();
  if p_id = auth.uid() then raise exception 'Pide a otro administrador que modifique tu acceso.'; end if;
  update public.profiles set display_name = trim(p_name), role = p_role, active = p_active where id = p_id;
  if not found then raise exception 'Usuario no encontrado. Créalo primero en Supabase Auth.'; end if;
  if not exists(select 1 from public.profiles where active and role = 'admin') then raise exception 'Debe existir un administrador activo.'; end if;
end;
$$;

-- API: lectura mediante RLS y mutaciones exclusivamente por RPC validada.
revoke all on public.profiles, public.products, public.variants, public.lives, public.sales, public.sale_items, public.stock_movements, public.receipts from anon, authenticated;
grant select on public.profiles, public.products, public.variants, public.lives, public.sales, public.sale_items, public.stock_movements, public.receipts to authenticated;
revoke all on sequence public.barcode_sequence from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_staff(), public.is_admin(), public.require_staff(), public.require_admin() to authenticated;
grant execute on function public.save_product(uuid,text,text,numeric,boolean), public.create_variant(uuid,text,smallint,integer),
 public.change_stock(uuid,integer,text,text,uuid), public.create_live(text), public.create_sale(uuid,text,public.payment_method,text,jsonb,uuid),
 public.cancel_sale(uuid,text), public.close_live(uuid), public.cancel_live(uuid), public.manage_profile(uuid,text,public.app_role,boolean) to authenticated;

commit;
