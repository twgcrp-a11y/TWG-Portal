// TWG Portal — API helpers
const BASE = '/api';

export const api = {
  // Load all shared data from MySQL
  async load(month) {
    try {
      const r = await fetch(`${BASE}/load.php?month=${encodeURIComponent(month)}`);
      if (!r.ok) throw new Error('Load failed');
      return await r.json();
    } catch (e) {
      return null; // fall back to localStorage
    }
  },

  // Save everything to MySQL
  async save(payload) {
    try {
      const r = await fetch(`${BASE}/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        console.error('TWG Save error:', data.error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('TWG Save network error:', e);
      return false;
    }
  },

  // Login
  async login(username, password) {
    try {
      const r = await fetch(`${BASE}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      return await r.json();
    } catch (e) {
      // Offline fallback — server unreachable, allow login with known passwords
      const offlinePasses = {
        'CEO': 'TwgCeo@2026', 'Abdullah': 'Abd@Twg2026', 'Munawar': 'Mun@Twg2026',
        'Tameem': 'Tam@Twg2026', 'Muzamil': 'Muz@Twg2026', 'Wahed': 'Wah@Twg2026',
      };
      if (offlinePasses[username] === password) return { ok: true, user: username, mode: 'offline' };
      return { ok: false, error: 'Invalid password' };
    }
  },

  // Delete a daily log entry
  async deleteLog(id) {
    try {
      const r = await fetch(`${BASE}/delete-log.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return r.ok;
    } catch (e) {
      return false;
    }
  },
};
