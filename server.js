require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const NOCODB_API_URL = (process.env.NOCODB_API_URL || '').replace(/\/+$/, '');
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;
const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;
const NOCODB_INSIGHTS_TABLE_ID = process.env.NOCODB_INSIGHTS_TABLE_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!NOCODB_API_URL || !NOCODB_API_TOKEN || !NOCODB_TABLE_ID) {
  console.error('ERROR: Missing required env vars: NOCODB_API_URL, NOCODB_API_TOKEN, NOCODB_TABLE_ID');
  process.exit(1);
}

const adminPass = ADMIN_PASSWORD || 'admin2026';
console.log('NOCODB_API_URL:', NOCODB_API_URL);

// ============ NOCODB HELPERS (Customers) ============

function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function nocodbFind(exnessAccount) {
  const url = NOCODB_API_URL + '/api/v2/tables/' + NOCODB_TABLE_ID + '/records'
    + '?where=(Exness_Account,eq,' + encodeURIComponent(exnessAccount) + ')&limit=1';
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
  const url = NOCODB_API_URL + '/api/v2/tables/' + NOCODB_TABLE_ID + '/records/' + recordId + '?fields=Token';
  const resp = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
  if (!resp.ok) throw new Error('Token check failed: ' + resp.status);
  const data = await resp.json();
  return data.Token || null;
}

// ============ NOCODB HELPERS (Insights) ============

async function getInsight() {
  if (!NOCODB_INSIGHTS_TABLE_ID) return null;
  const url = NOCODB_API_URL + '/api/v2/tables/' + NOCODB_INSIGHTS_TABLE_ID + '/records?limit=1&sort=-update_time';
  const resp = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.list && data.list.length > 0 ? data.list[0] : null;
}

async function upsertInsight(content, sentiment) {
  if (!NOCODB_INSIGHTS_TABLE_ID) throw new Error('NOCODB_INSIGHTS_TABLE_ID not configured');
  const updateTime = new Date().toISOString();
  const url = NOCODB_API_URL + '/api/v2/tables/' + NOCODB_INSIGHTS_TABLE_ID + '/records';

  // ดูว่ามี row อยู่แล้วหรือยัง
  const existing = await getInsight();
  const existingId = existing ? (existing.Id || existing.id) : null;

  if (existingId) {
    // อัพเดท row เดิม
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Id: existingId, content: content, sentiment: sentiment, update_time: updateTime }),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('NocoDB PATCH:', resp.status, errBody);
      throw new Error('Insight update failed: ' + resp.status);
    }
  } else {
    // สร้าง row ใหม่ (ไม่ส่ง Id ให้ NocoDB auto-generate)
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Title: 'daily', content: content, sentiment: sentiment, update_time: updateTime }),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('NocoDB POST:', resp.status, errBody);
      throw new Error('Insight create failed: ' + resp.status + ' - ' + errBody);
    }
  }

  return updateTime;
}

// ============ USER API ENDPOINTS ============

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

// ============ PUBLIC INSIGHT ENDPOINT (ลูกค้าเรียก) ============

app.get('/api/insight', async (req, res) => {
  try {
    const data = await getInsight();
    res.json({ data: data || null });
  } catch (e) {
    console.error('Load insight error:', e.message);
    res.json({ data: null });
  }
});

// ============ ADMIN ENDPOINTS ============

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === adminPass) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'wrong_password' });
  }
});

app.post('/api/admin/broadcast', async (req, res) => {
  try {
    const { content, sentiment } = req.body;
    if (!content) return res.status(400).json({ error: 'missing_content' });

    const updateTime = await upsertInsight(content, sentiment || 'neutral');

    // Webhook to Make.com (LINE + Facebook automation)
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, sentiment: sentiment || 'neutral', update_time: updateTime }),
        });
      } catch (whErr) {
        console.error('Webhook error (non-blocking):', whErr.message);
      }
    }

    res.json({ ok: true, update_time: updateTime });
  } catch (e) {
    console.error('Broadcast error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/insight', async (req, res) => {
  try {
    const data = await getInsight();
    res.json({ data: data || null });
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
