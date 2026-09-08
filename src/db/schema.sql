-- D1 schema for corgi-au.
-- corgi's own VIN tables are created and managed by its D1 adapter
-- (see @cardog/corgi/d1-adapter). Do NOT hand-roll those here.
-- This file only defines the app-level EV charging station cache.

CREATE TABLE IF NOT EXISTS charging_stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ocm_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  connector_types TEXT NOT NULL DEFAULT '[]',
  last_updated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_charging_stations_lat_lng
  ON charging_stations (lat, lng);

CREATE INDEX IF NOT EXISTS idx_charging_stations_last_updated
  ON charging_stations (last_updated);
