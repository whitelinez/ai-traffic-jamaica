/**
 * GET /api/analytics/turnings?camera_id=X&from=ISO&to=ISO
 * Returns turning movement matrix + queue depth series for a date range.
 *
 * Response:
 * {
 *   matrix: { "North Approach→East Exit": { total, car, truck, bus, motorcycle } },
 *   top_movements: [{from, to, total}],   // sorted desc
 *   queue_series: [{ts, depth}],           // from traffic_snapshots
 *   queue_summary: {avg, peak, period_avg},
 *   speed: {avg_kmh, p85_kmh, samples},   // if speed data exists
 *   period: {from, to, total_movements}
 * }
 */
export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY)
    return res.status(500).json({ error: "Server misconfiguration" });

  const { camera_id, from, to } = req.query;

  // Default: last 24h
  const toDate   = to   ? new Date(to)   : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate - 24 * 3600 * 1000);
  const fromISO  = fromDate.toISOString();
  const toISO    = toDate.toISOString();

  const h = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    // ── Turning movements ────────────────────────────────────────────────────
    let tmUrl = `${SUPABASE_URL}/rest/v1/turning_movements`
      + `?select=entry_zone,exit_zone,vehicle_class,dwell_ms`
      + `&captured_at=gte.${encodeURIComponent(fromISO)}`
      + `&captured_at=lte.${encodeURIComponent(toISO)}`
      + `&limit=5000`;
    if (camera_id) tmUrl += `&camera_id=eq.${encodeURIComponent(camera_id)}`;

    const tmRes = await fetch(tmUrl, { headers: h });
    const tmRows = tmRes.ok ? (await tmRes.json()) : [];

    // Build matrix
    const matrix = {};
    const clsTotals = { car: 0, truck: 0, bus: 0, motorcycle: 0 };
    for (const r of tmRows) {
      const key = `${r.entry_zone}→${r.exit_zone}`;
      if (!matrix[key]) matrix[key] = { from: r.entry_zone, to: r.exit_zone, total: 0, car: 0, truck: 0, bus: 0, motorcycle: 0, avg_dwell_ms: 0, _dwell_sum: 0 };
      matrix[key].total += 1;
      const cls = (r.vehicle_class || "car").toLowerCase();
      if (cls in matrix[key]) matrix[key][cls] += 1;
      if (cls in clsTotals) clsTotals[cls] += 1;
      if (r.dwell_ms) { matrix[key]._dwell_sum += r.dwell_ms; }
    }
    // Compute avg dwell per movement
    for (const k of Object.keys(matrix)) {
      const m = matrix[k];
      m.avg_dwell_ms = m.total > 0 ? Math.round(m._dwell_sum / m.total) : 0;
      delete m._dwell_sum;
    }
    const topMovements = Object.values(matrix)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // ── Queue series from traffic_snapshots ───────────────────────────────
    let qUrl = `${SUPABASE_URL}/rest/v1/traffic_snapshots`
      + `?select=captured_at,queue_depth,total_visible`
      + `&captured_at=gte.${encodeURIComponent(fromISO)}`
      + `&captured_at=lte.${encodeURIComponent(toISO)}`
      + `&order=captured_at.asc&limit=2000`;
    if (camera_id) qUrl += `&camera_id=eq.${encodeURIComponent(camera_id)}`;

    const qRes  = await fetch(qUrl, { headers: h });
    const qRows = qRes.ok ? (await qRes.json()) : [];

    const queueSeries = qRows.map(r => ({ ts: r.captured_at, depth: r.queue_depth || 0, visible: r.total_visible || 0 }));
    const depths = queueSeries.map(r => r.depth);
    const queueSummary = depths.length > 0
      ? { avg: +(depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(2), peak: Math.max(...depths), samples: depths.length }
      : { avg: 0, peak: 0, samples: 0 };

    // ── Speed stats from vehicle_crossings ────────────────────────────────
    let speedUrl = `${SUPABASE_URL}/rest/v1/vehicle_crossings`
      + `?select=speed_kmh`
      + `&speed_kmh=not.is.null`
      + `&captured_at=gte.${encodeURIComponent(fromISO)}`
      + `&captured_at=lte.${encodeURIComponent(toISO)}`
      + `&limit=2000`;
    if (camera_id) speedUrl += `&camera_id=eq.${encodeURIComponent(camera_id)}`;

    const spRes   = await fetch(speedUrl, { headers: h });
    const spRows  = spRes.ok ? (await spRes.json()) : [];
    const speeds  = spRows.map(r => r.speed_kmh).filter(s => s > 0 && s < 300).sort((a, b) => a - b);
    const speedStats = speeds.length > 0
      ? {
          avg_kmh: +(speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1),
          p85_kmh: speeds[Math.floor(speeds.length * 0.85)] || null,
          min_kmh: speeds[0],
          max_kmh: speeds[speeds.length - 1],
          samples: speeds.length,
        }
      : null;

    return res.status(200).json({
      matrix,
      top_movements: topMovements,
      queue_series: queueSeries,
      queue_summary: queueSummary,
      speed: speedStats,
      class_totals: clsTotals,
      period: { from: fromISO, to: toISO, total_movements: tmRows.length },
    });
  } catch (err) {
    console.error("[/api/analytics/turnings]", err);
    return res.status(502).json({ error: "Analytics query failed" });
  }
}
