-- ═══════════════════════════════════════════════════════════════
-- CricketAuction Migration V2
-- Run this in your Supabase SQL Editor AFTER supabase_schema.sql
-- ═══════════════════════════════════════════════════════════════

-- 1. Link players to registered user accounts
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Food Coupons table (one coupon = one event + meal)
CREATE TABLE IF NOT EXISTS food_coupons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  event_name text NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Lunch','Dinner','Breakfast','Snacks')),
  coupon_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Coupon Recipients (1 row per player per coupon)
CREATE TABLE IF NOT EXISTS coupon_recipients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id uuid REFERENCES food_coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  player_name text,
  redeemed boolean DEFAULT false,
  redeemed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  auction_id uuid REFERENCES auctions(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 5. Auction Video Links
CREATE TABLE IF NOT EXISTS auction_videos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id),
  title text NOT NULL,
  youtube_url text NOT NULL,
  is_match_video boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── Enable RLS ────────────────────────────────────────────────
ALTER TABLE food_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_videos ENABLE ROW LEVEL SECURITY;

-- ── Food Coupons Policies ─────────────────────────────────────
DROP POLICY IF EXISTS "Food coupons read" ON food_coupons;
CREATE POLICY "Food coupons read" ON food_coupons FOR SELECT USING (
  EXISTS (SELECT 1 FROM auctions WHERE id = food_coupons.auction_id AND (host_id = auth.uid() OR EXISTS (SELECT 1 FROM auction_members WHERE auction_id = auctions.id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM players WHERE auction_id = auctions.id AND user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Food coupons insert" ON food_coupons;
CREATE POLICY "Food coupons insert" ON food_coupons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM auctions WHERE id = food_coupons.auction_id AND (host_id = auth.uid() OR (co_hosts IS NOT NULL AND auth.jwt()->>'email' = ANY(co_hosts))))
);
DROP POLICY IF EXISTS "Food coupons delete" ON food_coupons;
CREATE POLICY "Food coupons delete" ON food_coupons FOR DELETE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM auctions WHERE id = food_coupons.auction_id AND host_id = auth.uid())
);

-- ── Coupon Recipients Policies ────────────────────────────────
DROP POLICY IF EXISTS "Coupon recipients read" ON coupon_recipients;
CREATE POLICY "Coupon recipients read" ON coupon_recipients FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM food_coupons fc
    JOIN auctions a ON a.id = fc.auction_id
    WHERE fc.id = coupon_recipients.coupon_id
    AND (a.host_id = auth.uid() OR (a.co_hosts IS NOT NULL AND auth.jwt()->>'email' = ANY(a.co_hosts)))
  )
);
DROP POLICY IF EXISTS "Coupon recipients insert" ON coupon_recipients;
CREATE POLICY "Coupon recipients insert" ON coupon_recipients FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM food_coupons fc
    JOIN auctions a ON a.id = fc.auction_id
    WHERE fc.id = coupon_recipients.coupon_id
    AND (a.host_id = auth.uid() OR (a.co_hosts IS NOT NULL AND auth.jwt()->>'email' = ANY(a.co_hosts)))
  )
);
DROP POLICY IF EXISTS "Coupon recipients update" ON coupon_recipients;
CREATE POLICY "Coupon recipients update" ON coupon_recipients FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM food_coupons fc
    JOIN auctions a ON a.id = fc.auction_id
    WHERE fc.id = coupon_recipients.coupon_id
    AND (a.host_id = auth.uid() OR (a.co_hosts IS NOT NULL AND auth.jwt()->>'email' = ANY(a.co_hosts)))
  )
);
DROP POLICY IF EXISTS "Coupon recipients delete" ON coupon_recipients;
CREATE POLICY "Coupon recipients delete" ON coupon_recipients FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM food_coupons fc
    JOIN auctions a ON a.id = fc.auction_id
    WHERE fc.id = coupon_recipients.coupon_id
    AND a.host_id = auth.uid()
  )
);

-- ── Notifications Policies ────────────────────────────────────
DROP POLICY IF EXISTS "Notifications read own" ON notifications;
CREATE POLICY "Notifications read own" ON notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Notifications insert" ON notifications;
CREATE POLICY "Notifications insert" ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Notifications update own" ON notifications;
CREATE POLICY "Notifications update own" ON notifications FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Notifications delete own" ON notifications;
CREATE POLICY "Notifications delete own" ON notifications FOR DELETE USING (user_id = auth.uid());

-- ── Auction Videos Policies ───────────────────────────────────
DROP POLICY IF EXISTS "Auction videos read" ON auction_videos;
CREATE POLICY "Auction videos read" ON auction_videos FOR SELECT USING (
  EXISTS (SELECT 1 FROM auctions WHERE id = auction_videos.auction_id AND (host_id = auth.uid() OR EXISTS (SELECT 1 FROM auction_members WHERE auction_id = auctions.id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM players WHERE auction_id = auctions.id AND user_id = auth.uid())))
  OR added_by = auth.uid()
);
DROP POLICY IF EXISTS "Auction videos insert" ON auction_videos;
CREATE POLICY "Auction videos insert" ON auction_videos FOR INSERT WITH CHECK (auth.uid() = added_by);
DROP POLICY IF EXISTS "Auction videos delete" ON auction_videos;
CREATE POLICY "Auction videos delete" ON auction_videos FOR DELETE USING (
  added_by = auth.uid() OR
  EXISTS (SELECT 1 FROM auctions WHERE id = auction_videos.auction_id AND host_id = auth.uid())
);
