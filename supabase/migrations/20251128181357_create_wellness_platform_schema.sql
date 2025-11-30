/*
  # Wellness Platform Database Schema

  ## Overview
  Complete database schema for a wellness booking platform connecting clients, experts, and providers (studios/praxen).

  ## New Tables

  ### `profiles`
  - `id` (uuid, FK to auth.users)
  - `role` (text) - client, expert, provider, admin
  - `email` (text)
  - `full_name` (text)
  - `phone` (text)
  - `avatar_url` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `expert_profiles`
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `bio` (text)
  - `specializations` (text[])
  - `certifications` (text[])
  - `hourly_rate` (decimal)
  - `years_experience` (int)
  - `rating` (decimal)
  - `total_reviews` (int)
  - `is_verified` (boolean)
  - `created_at` (timestamptz)

  ### `provider_profiles`
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `business_name` (text)
  - `business_type` (text) - studio, praxis
  - `description` (text)
  - `address` (text)
  - `city` (text)
  - `postal_code` (text)
  - `amenities` (text[])
  - `images` (text[])
  - `created_at` (timestamptz)

  ### `rooms`
  - `id` (uuid, PK)
  - `provider_id` (uuid, FK to provider_profiles)
  - `name` (text)
  - `description` (text)
  - `size_sqm` (int)
  - `hourly_rate` (decimal)
  - `amenities` (text[])
  - `images` (text[])
  - `is_available` (boolean)
  - `created_at` (timestamptz)

  ### `expert_offers`
  - `id` (uuid, PK)
  - `expert_id` (uuid, FK to expert_profiles)
  - `title` (text)
  - `description` (text)
  - `category` (text)
  - `format` (text) - online, in-person
  - `duration_minutes` (int)
  - `price` (decimal)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### `appointments`
  - `id` (uuid, PK)
  - `client_id` (uuid, FK to profiles)
  - `expert_id` (uuid, FK to expert_profiles)
  - `offer_id` (uuid, FK to expert_offers)
  - `room_id` (uuid, FK to rooms, nullable)
  - `start_time` (timestamptz)
  - `end_time` (timestamptz)
  - `status` (text) - pending, confirmed, completed, cancelled
  - `notes` (text)
  - `total_price` (decimal)
  - `created_at` (timestamptz)

  ### `room_bookings`
  - `id` (uuid, PK)
  - `room_id` (uuid, FK to rooms)
  - `expert_id` (uuid, FK to expert_profiles)
  - `start_time` (timestamptz)
  - `end_time` (timestamptz)
  - `status` (text) - pending, confirmed, completed, cancelled
  - `total_price` (decimal)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can read their own profile data
  - Clients can view expert profiles and create appointments
  - Experts can manage their offers and view their appointments
  - Providers can manage their rooms and bookings
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client',
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create expert_profiles table
CREATE TABLE IF NOT EXISTS expert_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bio text DEFAULT '',
  specializations text[] DEFAULT '{}',
  certifications text[] DEFAULT '{}',
  hourly_rate decimal(10,2) DEFAULT 0,
  years_experience int DEFAULT 0,
  rating decimal(3,2) DEFAULT 0,
  total_reviews int DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expert_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view expert profiles"
  ON expert_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Experts can update own profile"
  ON expert_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Experts can insert own profile"
  ON expert_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create provider_profiles table
CREATE TABLE IF NOT EXISTS provider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT '',
  business_type text DEFAULT 'studio',
  description text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  postal_code text DEFAULT '',
  amenities text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view provider profiles"
  ON provider_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can update own profile"
  ON provider_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Providers can insert own profile"
  ON provider_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  size_sqm int DEFAULT 0,
  hourly_rate decimal(10,2) DEFAULT 0,
  amenities text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage own rooms"
  ON rooms FOR ALL
  TO authenticated
  USING (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));

-- Create expert_offers table
CREATE TABLE IF NOT EXISTS expert_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  category text DEFAULT '',
  format text DEFAULT 'online',
  duration_minutes int DEFAULT 60,
  price decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expert_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active offers"
  ON expert_offers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Experts can manage own offers"
  ON expert_offers FOR ALL
  TO authenticated
  USING (expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expert_id uuid NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES expert_offers(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  total_price decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Experts can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Clients can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Experts can update their appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()))
  WITH CHECK (expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

-- Create room_bookings table
CREATE TABLE IF NOT EXISTS room_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  expert_id uuid NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'pending',
  total_price decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can view own bookings"
  ON room_bookings FOR SELECT
  TO authenticated
  USING (expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Providers can view room bookings"
  ON room_bookings FOR SELECT
  TO authenticated
  USING (room_id IN (SELECT id FROM rooms WHERE provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Experts can create bookings"
  ON room_bookings FOR INSERT
  TO authenticated
  WITH CHECK (expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can update own bookings"
  ON room_bookings FOR UPDATE
  TO authenticated
  USING (expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()))
  WITH CHECK (expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Providers can update room bookings"
  ON room_bookings FOR UPDATE
  TO authenticated
  USING (room_id IN (SELECT id FROM rooms WHERE provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())))
  WITH CHECK (room_id IN (SELECT id FROM rooms WHERE provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())));
