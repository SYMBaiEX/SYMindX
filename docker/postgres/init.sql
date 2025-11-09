-- SYMindX PostgreSQL Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS symindx;
CREATE SCHEMA IF NOT EXISTS memory;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Set default search path
ALTER DATABASE symindx SET search_path TO symindx, memory, analytics, public;

-- Create users and roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'symindx_app') THEN
        CREATE ROLE symindx_app WITH LOGIN PASSWORD 'app_password';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'symindx_readonly') THEN
        CREATE ROLE symindx_readonly WITH LOGIN PASSWORD 'readonly_password';
    END IF;
END
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA symindx TO symindx_app, symindx_readonly;
GRANT USAGE ON SCHEMA memory TO symindx_app, symindx_readonly;
GRANT USAGE ON SCHEMA analytics TO symindx_app, symindx_readonly;

GRANT CREATE ON SCHEMA symindx TO symindx_app;
GRANT CREATE ON SCHEMA memory TO symindx_app;
GRANT CREATE ON SCHEMA analytics TO symindx_app;

-- Create core tables
CREATE TABLE IF NOT EXISTS symindx.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    character_config JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS symindx.agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES symindx.agents(id) ON DELETE CASCADE,
    platform VARCHAR(100) NOT NULL,
    session_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS symindx.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES symindx.agents(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    platform VARCHAR(100),
    event_data JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agents_name ON symindx.agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_status ON symindx.agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_last_active ON symindx.agents(last_active_at);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_id ON symindx.agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_platform ON symindx.agent_sessions(platform);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON symindx.agent_sessions(status);

CREATE INDEX IF NOT EXISTS idx_events_agent_id ON symindx.events(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON symindx.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_platform ON symindx.events(platform);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON symindx.events(created_at);

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_agents_character_config_gin ON symindx.agents USING GIN(character_config);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_data_gin ON symindx.agent_sessions USING GIN(session_data);
CREATE INDEX IF NOT EXISTS idx_events_data_gin ON symindx.events USING GIN(event_data);
CREATE INDEX IF NOT EXISTS idx_events_metadata_gin ON symindx.events USING GIN(metadata);

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA symindx TO symindx_app;
GRANT SELECT ON ALL TABLES IN SCHEMA symindx TO symindx_readonly;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA symindx TO symindx_app;

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
DROP TRIGGER IF EXISTS update_agents_updated_at ON symindx.agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON symindx.agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create analytics views
CREATE OR REPLACE VIEW analytics.agent_activity_summary AS
SELECT 
    a.id,
    a.name,
    a.status,
    COUNT(e.id) as total_events,
    COUNT(DISTINCT e.platform) as platforms_used,
    MAX(e.created_at) as last_event_at,
    DATE_TRUNC('day', a.created_at) as created_date
FROM symindx.agents a
LEFT JOIN symindx.events e ON a.id = e.agent_id
GROUP BY a.id, a.name, a.status, a.created_at;

CREATE OR REPLACE VIEW analytics.platform_usage AS
SELECT 
    platform,
    COUNT(*) as event_count,
    COUNT(DISTINCT agent_id) as unique_agents,
    DATE_TRUNC('hour', created_at) as hour_bucket
FROM symindx.events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY platform, hour_bucket
ORDER BY hour_bucket DESC, event_count DESC;

-- Grant view permissions
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO symindx_app, symindx_readonly;