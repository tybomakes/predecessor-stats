-- Supabase Database Schema for Predecessor Stats

-- Create tracked_players table
CREATE TABLE tracked_players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    region VARCHAR(50) DEFAULT 'na',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    added_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- Create builds table
CREATE TABLE builds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    hero_id INTEGER NOT NULL,
    role VARCHAR(50) NOT NULL,
    items INTEGER[] NOT NULL,
    skill_order VARCHAR(10)[] DEFAULT ARRAY[]::VARCHAR(10)[],
    description TEXT,
    notes TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    CONSTRAINT builds_items_length CHECK (array_length(items, 1) = 6)
);

-- Create indexes for better performance
CREATE INDEX idx_tracked_players_player_id ON tracked_players(player_id);
CREATE INDEX idx_tracked_players_is_active ON tracked_players(is_active);
CREATE INDEX idx_builds_player_id ON builds(player_id);
CREATE INDEX idx_builds_hero_id ON builds(hero_id);
CREATE INDEX idx_builds_role ON builds(role);
CREATE INDEX idx_builds_is_public ON builds(is_public);

-- Enable Row Level Security (RLS)
ALTER TABLE tracked_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required)
-- Anyone can read tracked players
CREATE POLICY "Public tracked players are viewable by everyone"
    ON tracked_players FOR SELECT
    USING (true);

-- Anyone can insert tracked players (for now)
CREATE POLICY "Anyone can add tracked players"
    ON tracked_players FOR INSERT
    WITH CHECK (true);

-- Anyone can update tracked players
CREATE POLICY "Anyone can update tracked players"
    ON tracked_players FOR UPDATE
    USING (true);

-- Anyone can delete tracked players
CREATE POLICY "Anyone can delete tracked players"
    ON tracked_players FOR DELETE
    USING (true);

-- Anyone can read public builds
CREATE POLICY "Public builds are viewable by everyone"
    ON builds FOR SELECT
    USING (is_public = true);

-- Anyone can read all builds (for now, can be restricted later)
CREATE POLICY "All builds are viewable by everyone"
    ON builds FOR SELECT
    USING (true);

-- Anyone can insert builds
CREATE POLICY "Anyone can create builds"
    ON builds FOR INSERT
    WITH CHECK (true);

-- Anyone can update builds
CREATE POLICY "Anyone can update builds"
    ON builds FOR UPDATE
    USING (true);

-- Anyone can delete builds
CREATE POLICY "Anyone can delete builds"
    ON builds FOR DELETE
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for builds table
CREATE TRIGGER update_builds_updated_at BEFORE UPDATE ON builds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();