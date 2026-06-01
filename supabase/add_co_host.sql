-- SQL Script to enable Co-Hosts in Cricket Auction
-- Run this in your Supabase SQL Editor

-- 1. Create the Co-Hosts table
CREATE TABLE IF NOT EXISTS auction_co_hosts (
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (auction_id, user_id)
);

-- 2. Enable RLS on the new table
ALTER TABLE auction_co_hosts ENABLE ROW LEVEL SECURITY;

-- 3. Policies for auction_co_hosts
-- Hosts can see and add co-hosts for their own auctions
CREATE POLICY "Hosts can manage co-hosts" ON auction_co_hosts
FOR ALL USING (
  EXISTS (SELECT 1 FROM auctions WHERE id = auction_co_hosts.auction_id AND host_id = auth.uid())
);

-- Co-hosts can read their own access
CREATE POLICY "Co-hosts can read" ON auction_co_hosts
FOR SELECT USING (user_id = auth.uid());

-- 4. Update existing RLS policies to give Co-Hosts permission

-- Auctions update/delete
DROP POLICY IF EXISTS "Auctions update" ON auctions;
CREATE POLICY "Auctions update" ON auctions FOR UPDATE USING (
  auth.uid() = host_id OR 
  EXISTS (SELECT 1 FROM auction_co_hosts WHERE auction_id = id AND user_id = auth.uid())
);

-- Teams mod (insert/update/delete)
DROP POLICY IF EXISTS "Teams mod" ON teams;
CREATE POLICY "Teams mod" ON teams FOR ALL USING (
  EXISTS (SELECT 1 FROM auctions WHERE id = teams.auction_id AND (
    host_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM auction_co_hosts WHERE auction_id = teams.auction_id AND user_id = auth.uid())
  ))
);

-- Players mod (insert/update/delete)
DROP POLICY IF EXISTS "Players mod" ON players;
CREATE POLICY "Players mod" ON players FOR ALL USING (
  EXISTS (SELECT 1 FROM auctions WHERE id = players.auction_id AND (
    host_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM auction_co_hosts WHERE auction_id = players.auction_id AND user_id = auth.uid())
  ))
);

-- 5. Helper function to add a co-host by phone number
CREATE OR REPLACE FUNCTION add_co_host_by_phone(p_auction_id UUID, p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_host BOOLEAN;
BEGIN
  -- Check if caller is the primary host
  SELECT (host_id = auth.uid()) INTO v_is_host FROM auctions WHERE id = p_auction_id;
  IF NOT v_is_host THEN
    RAISE EXCEPTION 'Only the primary host can add co-hosts';
  END IF;

  -- Find the user by phone (from profiles or auth.users indirectly)
  -- Since we have a profiles table that stores phone
  SELECT id INTO v_user_id FROM profiles WHERE phone = p_phone LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. They must sign in at least once.';
  END IF;

  INSERT INTO auction_co_hosts (auction_id, user_id) 
  VALUES (p_auction_id, v_user_id) 
  ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$;
