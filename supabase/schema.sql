-- ============================================
-- FEASTWALA — SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- 1. SETTINGS TABLE
create table if not exists settings (
  id integer primary key default 1,
  accept_orders boolean default true,
  show_thali_menu boolean default true,
  show_chinese_menu boolean default true,
  free_delivery boolean default false,
  cod_enabled boolean default true,
  delivery_charge integer default 50,
  free_delivery_threshold integer default 269,
  opening_time text default '11:00',
  closing_time text default '23:00',
  thali_advance_minutes integer default 90,
  announcement text default '',
  whatsapp_primary text default '919711386962',
  whatsapp_secondary text default '919217291488',
  constraint single_row check (id = 1)
);

-- Insert default settings row
insert into settings (id) values (1) on conflict (id) do nothing;

-- 2. MENU ITEMS TABLE
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (brand in ('thali', 'chinese')),
  category text not null,
  name text not null,
  description text default '',
  price integer,
  half_price integer,
  full_price integer,
  in_stock boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 3. ORDERS TABLE
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_id text unique not null,
  customer_name text not null,
  phone text not null,
  address text default '',
  order_type text default 'delivery' check (order_type in ('delivery', 'pickup')),
  items jsonb not null default '[]',
  subtotal integer not null default 0,
  delivery_charge integer default 0,
  total integer not null default 0,
  payment_mode text default 'COD',
  payment_id text default '',
  status text default 'pending' check (status in ('pending','accepted','dispatched','delivered','cancelled')),
  distance_km numeric(5,2) default 0,
  estimated_time text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. DELIVERY PARTNERS TABLE
create table if not exists delivery_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  vehicle text default 'bike',
  zone text default 'all',
  status text default 'available' check (status in ('available','busy','off_duty')),
  created_at timestamptz default now()
);

-- 5. BROADCAST HISTORY TABLE
create table if not exists broadcast_history (
  id uuid primary key default gen_random_uuid(),
  segment text not null,
  message text not null,
  recipient_count integer default 0,
  sent_at timestamptz default now()
);

-- ============================================
-- ENABLE REALTIME on orders and menu_items
-- ============================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table menu_items;
alter publication supabase_realtime add table settings;

-- ============================================
-- ROW LEVEL SECURITY — open for now (tighten later)
-- ============================================
alter table settings enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table delivery_partners enable row level security;
alter table broadcast_history enable row level security;

create policy "Public read settings" on settings for select using (true);
create policy "Public update settings" on settings for update using (true);
create policy "Public read menu" on menu_items for select using (true);
create policy "Public all menu" on menu_items for all using (true);
create policy "Public insert orders" on orders for insert with check (true);
create policy "Public read orders" on orders for select using (true);
create policy "Public update orders" on orders for update using (true);
create policy "Public all partners" on delivery_partners for all using (true);
create policy "Public all broadcast" on broadcast_history for all using (true);

-- ============================================
-- SEED MENU DATA — MAA KI THALI & COMBOS
-- ============================================
insert into menu_items (brand, category, name, description, price, sort_order) values
-- Thalis
('thali','Thalis','Thali Veg','Dal, Rice, 4 Roti, Sabzi, Salad, Water Bottle',299,1),
('thali','Thalis','Delux Veg Thali','Dal, Rice, 6 Roti, Paneer Sabzi, Sweet, Salad+Raita, Water Bottle',311,2),
-- Combos
('thali','Combos','Dal Makhani Combo','Dal Makhani with Rice and 2 Roti',137,1),
('thali','Combos','Dal Tadka Combo','Dal Tadka with Rice and 2 Roti',119,2),
('thali','Combos','Kadhai Paneer Combo','Kadhai Paneer with Rice and 2 Roti',137,3),
('thali','Combos','Kadhi Pakoda Combo','Kadhi Pakoda with Rice and 2 Roti',137,4),
('thali','Combos','Matar Paneer Combo','Matar Paneer with Rice and 2 Roti',137,5),
('thali','Combos','Paneer Masala Combo','Paneer Masala with Rice and 2 Roti',149,6),
('thali','Combos','Rajma Combo','Rajma with Rice and 2 Roti',119,7),
-- Rice Bowls
('thali','Rice Bowls','Paneer Rice Bowl','Paneer with flavoured rice',149,1),
('thali','Rice Bowls','Dal Rice Bowl','Dal with steamed rice',99,2),
('thali','Rice Bowls','Rajma Rice Bowl','Rajma with steamed rice',109,3),
-- Main Course
('thali','Main Course','Dal Makhani','Rich creamy black dal',89,1),
('thali','Main Course','Dal Tadka','Yellow dal with tadka',79,2),
('thali','Main Course','Kadhai Paneer','Paneer in spiced kadhai gravy',119,3),
('thali','Main Course','Matar Paneer','Peas and paneer in tomato gravy',119,4),
('thali','Main Course','Paneer Masala','Paneer in rich masala gravy',129,5),
('thali','Main Course','Rajma','Kidney beans in thick gravy',89,6),
('thali','Main Course','Kadhi Pakoda','Yogurt curry with pakoda',89,7),
-- Rice
('thali','Rice','Jeera Rice','Cumin flavoured basmati rice',89,1),
('thali','Rice','Peas Rice','Rice with green peas',119,2),
('thali','Rice','Plain Rice','Steamed basmati rice',77,3),
-- Raita & Salad
('thali','Raita & Salad','Boondi Raita','Yogurt with boondi',42,1),
('thali','Raita & Salad','Plain Raita','Simple yogurt',36,2),
('thali','Raita & Salad','Mixed Raita','Yogurt with mixed veggies',48,3),
('thali','Raita & Salad','Green Salad','Fresh garden salad',47,4),
-- Breads
('thali','Breads','Phulka Roti','Soft whole wheat roti',15,1),
('thali','Breads','Butter Phulka','Roti with butter',20,2),
('thali','Breads','Plain Paratha','Layered whole wheat paratha',30,3),
('thali','Breads','Aloo Paratha','Stuffed potato paratha',40,4),
('thali','Breads','Aloo & Onion Paratha','Stuffed aloo onion paratha',55,5),
('thali','Breads','Onion Paratha','Stuffed onion paratha',45,6);

-- ============================================
-- SEED MENU DATA — CHINESE & MORE BY FEASTWALA
-- ============================================
insert into menu_items (brand, category, name, description, half_price, full_price, sort_order) values
-- Chaap
('chinese','Chaap','Malai Chaap','Creamy malai marinated chaap',180,252,1),
('chinese','Chaap','Tandoori Chaap','Smoky tandoor-fired chaap',234,324,2),
('chinese','Chaap','Paneeri Tikka Chaap','Paneer-stuffed tikka chaap',234,324,3),
('chinese','Chaap','Mushroom Chaap','Juicy mushroom chaap',234,324,4),
('chinese','Chaap','Achari Chaap','Tangy pickle-spiced chaap',199,270,5),
('chinese','Chaap','Schezwan Chaap','Spicy schezwan chaap',199,270,6),
('chinese','Chaap','Afghani Chaap','Creamy Afghani style chaap',199,270,7),
-- Rice
('chinese','Rice','Paneer Fried Rice','Wok-tossed rice with paneer',180,240,1),
('chinese','Rice','Veg Fried Rice','Classic veg fried rice',140,200,2),
('chinese','Rice','Garlic Fried Rice','Aromatic garlic rice',100,180,3),
('chinese','Rice','Hakka Rice','Indo-Chinese hakka rice',160,260,4),
('chinese','Rice','Chilli Rice','Spicy chilli flavoured rice',160,260,5),
-- Noodles
('chinese','Noodles','Veg Hakka Noodles','Classic hakka noodles',160,234,1),
('chinese','Noodles','Schezwan Noodles','Spicy schezwan noodles',160,234,2),
('chinese','Noodles','Paneer Garlic Noodles','Noodles with paneer and garlic',199,270,3),
('chinese','Noodles','Singapuri Noodles','Singapore style noodles',199,270,4),
-- Momos
('chinese','Momos','Veg Steamed Momos','Classic steamed veg dumplings',126,160,1),
('chinese','Momos','Veg Fried Momos','Crispy fried veg momos',136,180,2),
('chinese','Momos','Paneer Steamed Momos','Paneer stuffed steamed momos',149,199,3),
('chinese','Momos','Paneer Fried Momos','Crispy paneer momos',160,220,4),
('chinese','Momos','Tandoori Momos','Smoky tandoor-fired momos',160,220,5),
('chinese','Momos','Afghani Momos','Creamy Afghani momos',160,220,6),
('chinese','Momos','Schezwan Momos','Spicy schezwan momos',149,199,7),
('chinese','Momos','Kurkure Momos','Crispy coated momos',160,220,8),
('chinese','Momos','Momo Soup','Steamed momos in spicy broth',149,199,9),
('chinese','Momos','Afghani Paneer Momos','Premium Afghani paneer momos',220,360,10);

-- Single price items for Chinese menu
insert into menu_items (brand, category, name, description, price, sort_order) values
('chinese','Veg Starters','Spring Rolls','Crispy vegetable spring rolls',149,1),
('chinese','Veg Starters','Veg Manchurian','Veg balls in manchurian sauce',149,2),
('chinese','Veg Starters','Paneer Chilli','Paneer in spicy chilli sauce',179,3),
('chinese','Veg Starters','Honey Chilli Potato','Crispy potato in honey chilli',149,4),
('chinese','Veg Starters','Chilli Potato','Spicy chilli potato',129,5),
('chinese','Specials','Gym Diet Combo','High protein balanced meal combo',340,1);
