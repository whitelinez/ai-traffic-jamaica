/**
 * GET  /api/analytics/zones?camera_id=X        → list active zones
 * POST /api/analytics/zones  body: {camera_id, zones:[...]}  → bulk insert
 * DELETE /api/analytics/zones?zone_id=X         → deactivate zone
 */
export default async function handler(req, res) {
  const SUPABASE_URL  = process.env.SUPABASE_URL;
  const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY)
    return res.status(500).json({ error: "Server misconfiguration" });

  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // ── GET: list zones for a camera ─────────────────────────────────────────
  if (req.method === "GET") {
    const { camera_id } = req.query;
    let url = `${SUPABASE_URL}/rest/v1/camera_zones?active=eq.true&select=id,name,zone_type,points,metadata,color,created_at`;
    if (camera_id) url += `&camera_id=eq.${encodeURIComponent(camera_id)}`;
    url += "&order=created_at.asc";
    try {
      const r = await fetch(url, { headers: { ...headers, Prefer: "return=representation" } });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json(await r.json());
    } catch (err) {
      return res.status(502).json({ error: String(err) });
    }
  }

  // ── POST: bulk insert zones ───────────────────────────────────────────────
  if (req.method === "POST") {
    const { camera_id, zones } = req.body || {};
    if (!camera_id || !Array.isArray(zones) || zones.length === 0)
      return res.status(400).json({ error: "camera_id and zones[] required" });

    const rows = zones.map(z => ({
      camera_id,
      zone_type: z.zone_type,
      name:      z.name,
      points:    z.points,
      metadata:  z.metadata || null,
      color:     z.color || null,
      active:    true,
    }));

    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/camera_zones`, {
        method: "POST",
        headers,
        body: JSON.stringify(rows),
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(201).json(await r.json());
    } catch (err) {
      return res.status(502).json({ error: String(err) });
    }
  }

  // ── DELETE: deactivate a zone (soft delete) ───────────────────────────────
  if (req.method === "DELETE") {
    const { zone_id } = req.query;
    if (!zone_id) return res.status(400).json({ error: "zone_id required" });
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/camera_zones?id=eq.${encodeURIComponent(zone_id)}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ active: false }),
        }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(502).json({ error: String(err) });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
