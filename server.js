const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(session({
  secret: 'simple-key',
  resave: false,
  saveUninitialized: true
}));
app.use(express.static('public'));

// Database initialization
async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rsvps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        device_key VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        hashed_password VARCHAR(255) NOT NULL
      )
    `);

    // Create super admin if not exists
    const adminResult = await pool.query('SELECT * FROM admins WHERE username = $1', ['admin']);
    if (adminResult.rows.length === 0) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('01121000099', salt);
      await pool.query(
        'INSERT INTO admins (username, hashed_password) VALUES ($1, $2)',
        ['admin', hashedPassword]
      );
      console.log('Super admin created');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// API Routes

// GET /api/rsvps - Get list of RSVPs
app.get('/api/rsvps', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, device_key, timestamp FROM rsvps ORDER BY timestamp DESC');
    const rsvps = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      deviceKey: row.device_key,
      timestamp: row.timestamp.toISOString()
    }));
    res.json(rsvps);
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/rsvps - Add RSVP
app.post('/api/rsvps', async (req, res) => {
  console.log('RSVP POST request body:', req.body);
  const { name, deviceKey } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!deviceKey) {
    console.log('Missing device key in request');
    return res.status(400).json({ error: 'Device key is required' });
  }

  try {
    // Check if this device already has an RSVP
    const existingResult = await pool.query('SELECT * FROM rsvps WHERE device_key = $1', [deviceKey]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: '您已经确认过出席了' });
    }

    // Insert new RSVP
    await pool.query(
      'INSERT INTO rsvps (name, device_key) VALUES ($1, $2)',
      [name.trim(), deviceKey]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding RSVP:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/rsvps/:id - Edit RSVP (only by original device)
app.put('/api/rsvps/:id', async (req, res) => {
  const { id } = req.params;
  const { name, deviceKey } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!deviceKey) {
    return res.status(400).json({ error: 'Device key is required' });
  }

  try {
    // Check if RSVP exists and belongs to this device
    const rsvpResult = await pool.query('SELECT * FROM rsvps WHERE id = $1', [id]);
    if (rsvpResult.rows.length === 0) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    if (rsvpResult.rows[0].device_key !== deviceKey) {
      return res.status(403).json({ error: '您只能编辑自己的确认信息' });
    }

    // Update RSVP
    await pool.query(
      'UPDATE rsvps SET name = $1, timestamp = CURRENT_TIMESTAMP WHERE id = $2',
      [name.trim(), id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/rsvps/:id - Delete RSVP (only by original device)
app.delete('/api/rsvps/:id', async (req, res) => {
  const { id } = req.params;
  const { deviceKey } = req.body;
  
  if (!deviceKey) {
    return res.status(400).json({ error: 'Device key is required' });
  }

  try {
    // Check if RSVP exists and belongs to this device
    const rsvpResult = await pool.query('SELECT * FROM rsvps WHERE id = $1', [id]);
    if (rsvpResult.rows.length === 0) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    if (rsvpResult.rows[0].device_key !== deviceKey) {
      return res.status(403).json({ error: '您只能删除自己的确认信息' });
    }

    // Delete RSVP
    await pool.query('DELETE FROM rsvps WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting RSVP:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/admin/login - Admin login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }

  try {
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (result.rows.length > 0 && bcrypt.compareSync(password, result.rows[0].hashed_password)) {
      req.session.user = { username };
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// POST /api/admin/create - Create new admin (protected)
app.post('/api/admin/create', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }

  try {
    // Check if username exists
    const existingResult = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username exists' });
    }

    // Create new admin
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    await pool.query(
      'INSERT INTO admins (username, hashed_password) VALUES ($1, $2)',
      [username, hashedPassword]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// GET /api/admin/status - Check login status
app.get('/api/admin/status', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, username: req.session.user.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// Initialize database and start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Device key validation enabled`);
    console.log(`PostgreSQL database connected`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});