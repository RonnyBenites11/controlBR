-- SOLO DESARROLLO. Ejecutar después de las migraciones. No crea usuarios ni ventas ficticias.
insert into public.products(id, sku, name, base_price) values
('10000000-0000-4000-8000-000000000001', 'BR-LUNA', 'Luna · primeros pasos', 49.90),
('10000000-0000-4000-8000-000000000002', 'BR-NUBE', 'Nube · zapatito clásico', 59.90),
('10000000-0000-4000-8000-000000000003', 'BR-SOL', 'Sol · sandalia de verano', 45.00)
on conflict (sku) do nothing;
insert into public.variants(product_id, color, size)
select p.id, c.color, s.size from public.products p
cross join (values ('Crema'), ('Rosa')) c(color)
cross join (values (18), (19), (20), (21), (22)) s(size)
where p.sku in ('BR-LUNA','BR-NUBE','BR-SOL')
on conflict (product_id, color, size) do nothing;
-- El stock empieza en 0. Registra producción desde la app para conservar el historial.
