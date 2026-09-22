// Vercel Serverless Function for /api/users
const CLOUD_OBJECT_ID = 'ff808181a09d98f701a0c7a88e8e6878';
const CLOUD_API_BASE = 'https://api.restful-api.dev/objects';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${CLOUD_API_BASE}/${CLOUD_OBJECT_ID}`);
      if (response.ok) {
        const data = await response.json();
        return res.status(200).json(data?.data?.users || []);
      }
      return res.status(200).json([]);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      let usersToSave = req.body;
      if (req.body && req.body.users) {
        usersToSave = req.body.users;
      }

      const payload = {
        name: 'alhikmah_users_prod',
        data: {
          users: usersToSave,
          updatedAt: new Date().toISOString(),
        },
      };

      const response = await fetch(`${CLOUD_API_BASE}/${CLOUD_OBJECT_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return res.status(200).json({ success: true, users: usersToSave });
      }
      return res.status(500).json({ error: 'Failed to update cloud store' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
