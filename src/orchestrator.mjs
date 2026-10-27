// Quetzal AOI Briefing — orchestrator v1
// Hackathon-built, Oct 26, 2026.
// Step 2 of the production plan: live telemetry adapter -> real AOI
// generation -> labelled briefing shape, with receipt.
// No keys in this file or repo. Live Meta calls (Spark, SAM, Image) are
// separate adapters, added by the owner on their own machine, never
// committed here. This file only does telemetry -> AOI.
//
// Label discipline: measured = instrument values only (magnitude,
// location, depth, time as reported by the source), computed =
// model-derived (energy via Gutenberg-Choy, grid sums, centroid),
// inferred = interpretation (a cell is "worth investigating").
// Never mix them. No prediction language anywhere in this file.
//
// Modes:
//   node src/orchestrator.mjs            -> mock mode (preserves the
//                                           original smoke test shape)
//   node src/orchestrator.mjs --live     -> try the live Quetzal feed,
//                                           fall back to mock on any
//                                           failure, labelled as mock
//   node src/orchestrator.mjs --fixture  -> fixed fixture, for tests
//
// Live source (public, no key): Quetzal Cloud Run /api/seismic/live
// The adapter accepts three shapes and normalises them, because the
// live shape has changed between local and Cloud Run versions:
//   a) GeoJSON FeatureCollection (USGS-style features)
//   b) { events: [...] } / { data: [...] } arrays
//   c) a bare array of events
// Anything it cannot parse is a failure, not a silent zero.

export const LIVE_URL =
  "https://quetzal-geophysics-972385362861.us-central1.run.app/api/seismic/live?feed=day&limit=200";

// Gutenberg-Choy proxy, as used by the Quetzal pipeline:
// log10(Es) = 4.8 + 1.5 * M. Energy is always [computed], never [measured].
export function energyJoules(magnitude) {
  return Math.pow(10, 4.8 + 1.5 * magnitude);
}

function cellKey(lat, lon) {
  // 2° x 2° grid, matching the Quetzal hotspot_detector grid.
  const latCell = Math.floor(lat / 2) * 2;
  const lonCell = Math.floor(lon / 2) * 2;
  return `${latCell}N-${lonCell}E`;
}

export function normaliseEvent(raw) {
  const props = raw.properties ?? raw;
  const geom = raw.geometry?.coordinates;
  const lat = props.latitude ?? props.lat ?? (geom ? geom[1] : undefined);
  const lon = props.longitude ?? props.lon ?? (geom ? geom[0] : undefined);
  const mag = props.magnitude ?? props.mag ?? props.magnitude_mw;
  if (typeof lat !== "number" || typeof lon !== "number" || typeof mag !== "number") {
    return null;
  }
  return {
    id: String(props.id ?? raw.id ?? `${lat},${lon},${mag}`),
    magnitude: mag,
    magnitude_label: "measured",
    latitude: lat,
    longitude: lon,
    depth_km: typeof props.depth === "number" ? props.depth : null,
    depth_label: typeof props.depth === "number" ? "measured" : null,
    time: props.time ?? props.timestamp ?? null,
    place: props.place ?? null,
    energy_joules: energyJoules(mag),
    energy_label: "computed",
    source_energy: props.estimatedRadiatedEnergyJoules ?? null,
  };
}

export function parseTelemetry(payload) {
  let list = null;
  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.features)) list = payload.features;
  else if (Array.isArray(payload?.events)) list = payload.events;
  else if (Array.isArray(payload?.data)) list = payload.data;
  if (!list) throw new Error("telemetry: unrecognised payload shape");
  const events = list.map(normaliseEvent).filter(Boolean);
  if (events.length === 0) throw new Error("telemetry: zero usable events");
  return events;
}

// Real AOI generation: grid, sum, pick the highest-energy cell.
// The polygon is the 2° cell itself. No invented smoothing, no
// interpolation, no claim about any single future event.
export function makeAOI(telemetry) {
  const cells = new Map();
  for (const ev of telemetry) {
    const key = cellKey(ev.latitude, ev.longitude);
    if (!cells.has(key)) {
      const [latCell, lonCell] = key.replace("N-", ",").replace("E", "").split(",").map(Number);
      cells.set(key, {
        key,
        lat_min: latCell,
        lat_max: latCell + 2,
        lon_min: lonCell,
        lon_max: lonCell + 2,
        events: [],
        total_energy_joules: 0,
        weighted_lat: 0,
        weighted_lon: 0,
        max_magnitude: -Infinity,
      });
    }
    const cell = cells.get(key);
    cell.events.push(ev);
    cell.total_energy_joules += ev.energy_joules;
    cell.weighted_lat += ev.latitude * ev.energy_joules;
    cell.weighted_lon += ev.longitude * ev.energy_joules;
    cell.max_magnitude = Math.max(cell.max_magnitude, ev.magnitude);
  }
  const ranked = [...cells.values()].sort(
    (a, b) => b.total_energy_joules - a.total_energy_joules,
  );
  const top = ranked[0];
  const centroid = {
    latitude: top.weighted_lat / top.total_energy_joules,
    longitude: top.weighted_lon / top.total_energy_joules,
    label: "computed",
  };
  return {
    id: `AOI-${top.key}`,
    polygon: [
      [top.lon_min, top.lat_min],
      [top.lon_max, top.lat_min],
      [top.lon_max, top.lat_max],
      [top.lon_min, top.lat_max],
      [top.lon_min, top.lat_min],
    ],
    polygon_label: "computed",
    centroid,
    events_used: top.events.length,
    events_used_label: "measured",
    total_energy_joules: top.total_energy_joules,
    total_energy_label: "computed",
    max_magnitude: top.max_magnitude,
    max_magnitude_label: "measured",
    interpretation: "Cell with the highest total radiated energy in this window; worth investigating, not a prediction of a future event.",
    interpretation_label: "inferred",
    cells_ranked: ranked.length,
  };
}

export function mockTelemetry() {
  return [
    { id: "mock-1", magnitude: 4.8, latitude: 32.1, longitude: 94.2, depth: 10, time: "2026-10-26T00:00:00Z", place: "mock" },
  ].map((e) => ({
    ...e,
    magnitude_label: "measured",
    energy_joules: energyJoules(e.magnitude),
    energy_label: "computed",
  }));
}

export function fixtureTelemetry() {
  // Fixed fixture: 3 events in one 2° cell, 1 small event elsewhere.
  // Expected: top cell 32N-94E, 3 events, max 5.2, energy = sum of
  // Gutenberg-Choy energies for 5.2, 4.8, 4.1.
  return [
    { id: "f1", magnitude: 5.2, latitude: 32.1, longitude: 94.2 },
    { id: "f2", magnitude: 4.8, latitude: 33.0, longitude: 95.0 },
    { id: "f3", magnitude: 4.1, latitude: 32.5, longitude: 94.8 },
    { id: "f4", magnitude: 3.0, latitude: -10.0, longitude: -170.0 },
  ].map((e) => ({
    ...e,
    magnitude_label: "measured",
    energy_joules: energyJoules(e.magnitude),
    energy_label: "computed",
  }));
}

export function brief(aoi, receipt) {
  return {
    title: "Quetzal AOI Briefing",
    aoi,
    labels: ["measured", "computed", "inferred"],
    receipt,
  };
}

async function fetchLive() {
  const controller = new AbortController();
  // 60s, not 10s: live latency varied 1s–20s Oct 26, and the old
  // 10s timeout silently fell back to mock on slow days. Step 7
  // uses the same 60s timeout for the same reason.
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(LIVE_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`live feed HTTP ${res.status}`);
    const payload = await res.json();
    const events = parseTelemetry(payload);
    return {
      events,
      receipt: {
        source: "quetzal-live",
        url: LIVE_URL,
        fetched_at: new Date().toISOString(),
        events_received: events.length,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let telemetry;
  let receipt;
  if (args.includes("--fixture")) {
    telemetry = fixtureTelemetry();
    receipt = { source: "fixture", generated_at: new Date().toISOString(), note: "fixed fixture, for tests only" };
  } else if (args.includes("--live")) {
    try {
      const live = await fetchLive();
      telemetry = live.events;
      receipt = live.receipt;
    } catch (err) {
      telemetry = mockTelemetry();
      receipt = {
        source: "mock",
        generated_at: new Date().toISOString(),
        note: `live fetch failed (${err.message}); mock fallback, labelled as mock, not live`,
      };
    }
  } else {
    telemetry = mockTelemetry();
    receipt = { source: "mock", generated_at: new Date().toISOString(), note: "mock mode — replace with --live for real telemetry" };
    // Preserve the original smoke-test shape in mock mode.
    const aoi = makeAOI(telemetry);
    console.log(JSON.stringify(brief({ ...aoi, id: "AOI-MOCK" }, receipt), null, 2));
    return;
  }
  const aoi = makeAOI(telemetry);
  console.log(JSON.stringify(brief(aoi, receipt), null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
