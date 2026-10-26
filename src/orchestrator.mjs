// Quetzal AOI Briefing — orchestration skeleton
// Hackathon-built, Oct 26, 2026. Mock only. No keys, no live calls here.
// Live Meta Model API calls (Spark, SAM, Image) are added by the owner
// on their own machine, with their own key, never committed to this repo.

// Label discipline: measured = instrument values only,
// computed = model-derived, inferred = interpretation. Never mix them.

function mockTelemetry() {
  return [
    { id: "mock-1", magnitude: 4.8, label: "measured", source: "mock" },
  ];
}

function makeAOI(telemetry) {
  // Placeholder AOI: a real AOI is a geographic polygon, not a box.
  // This skeleton returns the shape of the output, not a real forecast.
  return {
    id: "AOI-MOCK",
    label: "computed",
    events_used: telemetry.length,
    note: "mock — replace with live telemetry and real AOI generation",
  };
}

function brief(aoi) {
  return {
    title: "Quetzal AOI Briefing — mock",
    aoi,
    labels: ["measured", "computed", "inferred"],
    receipt: {
      source: "mock",
      generated_at: new Date().toISOString(),
      note: "mock receipt — live receipts carry source, time, and request id",
    },
  };
}

const telemetry = mockTelemetry();
const aoi = makeAOI(telemetry);
console.log(JSON.stringify(brief(aoi), null, 2));
