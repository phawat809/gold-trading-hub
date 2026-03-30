require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const { NOCODB_API_URL, NOCODB_API_TOKEN, NOCODB_TABLE_ID } = process.env;

if (!NOCODB_API_URL || !NOCODB_API_TOKEN || !NOCODB_TABLE_ID) {
  console.error('ERROR: Missing required env vars: NOCODB_API_URL, NOCODB_API_TOKEN, NOCODB_TABLE_ID');
  process.exit(1);
}

// ============ HELPERS ============

function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function nocodbFind(exnessAccount) {
  const url =
    NOCODB_API_URL + '/api/v2/tables/' + NOCODB_TABLE_ID + '/records' +
    '?where=(Exness_Account,eq,' + encodeURIComponent(exnessAccount) + ')&limit=1';
  const resp = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
  if (!resp.ok) throw new Error('NocoDB find failed: ' + resp.status);
  const data = await resp.json();
  return data.list && data.list.length > 0 ? data.list[0] : null;
}

async function nocodbUpdateToken(recordId, token) {
  const url = NOCODB_API_URL + '/api/v2/tables/' + NOCODB_TABLE_ID + '/records';
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ Id: recordId, Token: token }),
  });
  if (!resp.ok) throw new Error('Token update failed: ' + resp.status);
}

async function nocodbGetToken(recordId) {
  const url =
    NOCODB_API_URL + '/api/v2/tables/' + NOCODB_TABLE_ID + '/records/' + recordId + '?fields=Token';
  const resp = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
  if (!resp.ok) throw new Error('Token check failed: ' + resp.status);
  const data = await resp.json();
  return data.Token || null;
}

// ============ API ENDPOINTS ============

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'missing_fields' });

    const record = await nocodbFind(username);
    if (!record) return res.status(401).json({ error: 'not_found' });
    if (record.Password !== password) return res.status(401).json({ error: 'wrong_password' });
    if (record.Status !== 'Approved') return res.status(403).json({ error: 'not_approved' });

    const token = generateToken();
    await nocodbUpdateToken(record.Id, token);

    res.json({ token: token, recordId: record.Id });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/verify-token', async (req, res) => {
  try {
    const { recordId, token } = req.body;
    if (!recordId || !token) return res.status(400).json({ valid: false });

    const remoteToken = await nocodbGetToken(recordId);
    res.json({ valid: remoteToken === token });
  } catch (e) {
    console.error('Verify error:', e.message);
    res.status(500).json({ valid: false });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    const { recordId } = req.body;
    if (recordId) await nocodbUpdateToken(recordId, '');
    res.json({ ok: true });
  } catch (e) {
    console.error('Logout error:', e.message);
    res.json({ ok: true });
  }
});

// ============ ADMIN ENDPOINTS ============

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2026';
const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'wrong_password' });
  }
});

// POST /api/admin/broadcast - Save AI insight to Supabase
app.post('/api/admin/broadcast', async (req, res) => {
  try {
    const { content, sentiment } = req.body;
    if (!content) return res.status(400).json({ error: 'missing_content' });

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'supabase_not_configured' });
    }

    const insightData = { id: 1, content, sentiment: sentiment || 'neutral', updated_at: new Date().toISOString() };

    const resp = await fetch(SUPABASE_URL + '/rest/v1/daily_insights?on_conflict=id', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(insightData)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error('Supabase error: ' + resp.status + ' ' + errText);
    }

    res.json({ ok: true, updated_at: insightData.updated_at });
  } catch (e) {
    console.error('Broadcast error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/insight - Load last insight from Supabase
app.get('/api/admin/insight', async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.json({ data: null });
    }

    const resp = await fetch(SUPABASE_URL + '/rest/v1/daily_insights?id=eq.1&select=*', {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      }
    });

    if (!resp.ok) throw new Error('Supabase error: ' + resp.status);
    const data = await resp.json();
    res.json({ data: data && data.length > 0 ? data[0] : null });
  } catch (e) {
    console.error('Load insight error:', e.message);
    res.json({ data: null });
  }
});

// ============ START ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Gold Trading Hub running on port ' + PORT);
});
