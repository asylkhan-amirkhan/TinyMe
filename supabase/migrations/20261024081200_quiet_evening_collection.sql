-- Additive catalogue update: existing rooms, balances and inventory are untouched.
insert into public.catalog_items (id,name,price,w,h,surface) values
('armchair-boucle','Кресло «Букле»',45,3,3,'floor'),
('table-tea','Столик «Чайный час»',30,3,2,'floor'),
('dresser-walnut','Комод «Орех»',50,4,2,'floor'),
('ottoman-knit','Пуф «Карамель»',18,2,2,'floor'),
('vase-branches','Ваза «Тихий сад»',12,1,1,'floor'),
('lamp-petal','Торшер «Лепесток»',35,2,2,'floor')
on conflict (id) do nothing;
