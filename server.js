const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(session({
  secret: 'simple-key',
  resave: false,
  saveUninitialized: true
}));
app.use(express.static('public'));

// JSON persistence functions
function readJson(file) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data || '[]');
}

function writeJson(file, data) {
  const filePath = path.join(DATA_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Startup initialization
function initializeData() {
  let admins = readJson('admins.json');
  const rsvps = readJson('rsvps.json');

  // Ensure rsvps is array
  if (!Array.isArray(rsvps)) {
    writeJson('rsvps.json', []);
  } else {
    writeJson('rsvps.json', rsvps);
  }

  // Initialize super admin if not present
  const superAdmin = admins.find(admin => admin.username === 'admin');
  if (!superAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('01121000099', salt);
    admins.push({ username: 'admin', hashedPassword });
    writeJson('admins.json', admins);
  } else {
    writeJson('admins.json', admins);
  }
}

// API Routes

// GET /api/rsvps - Get list of RSVPs
app.get('/api/rsvps', (req, res) => {
  const rsvps = readJson('rsvps.json');
  res.json(rsvps);
});

// POST /api/rsvps - Add RSVP
app.post('/api/rsvps', (req, res) => {
  const { name, deviceKey } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!deviceKey) {
    return res.status(400).json({ error: 'Device key is required' });
  }
  const rsvps = readJson('rsvps.json');
  
  // Check if this device already has an RSVP
  const existingRsvp = rsvps.find(rsvp => rsvp.deviceKey === deviceKey);
  if (existingRsvp) {
    return res.status(400).json({ error: '您已经确认过出席了' });
  }
  
  rsvps.push({
    id: Date.now().toString(),
    name: name.trim(),
    deviceKey: deviceKey,
    timestamp: new Date().toISOString()
  });
  writeJson('rsvps.json', rsvps);
  res.json({ success: true });
});

// PUT /api/rsvps/:id - Edit RSVP (only by original device)
app.put('/api/rsvps/:id', (req, res) => {
  const { id } = req.params;
  const { name, deviceKey } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!deviceKey) {
    return res.status(400).json({ error: 'Device key is required' });
  }

  const rsvps = readJson('rsvps.json');
  const rsvpIndex = rsvps.findIndex(rsvp => rsvp.id === id);
  
  if (rsvpIndex === -1) {
    return res.status(404).json({ error: 'RSVP not found' });
  }

  // Check if the device key matches
  if (rsvps[rsvpIndex].deviceKey !== deviceKey) {
    return res.status(403).json({ error: '您只能编辑自己的确认信息' });
  }

  rsvps[rsvpIndex].name = name.trim();
  rsvps[rsvpIndex].timestamp = new Date().toISOString();
  writeJson('rsvps.json', rsvps);
  res.json({ success: true });
});

// DELETE /api/rsvps/:id - Delete RSVP (only by original device)
app.delete('/api/rsvps/:id', (req, res) => {
  const { id } = req.params;
  const { deviceKey } = req.body;
  
  if (!deviceKey) {
    return res.status(400).json({ error: 'Device key is required' });
  }

  const rsvps = readJson('rsvps.json');
  const rsvpIndex = rsvps.findIndex(rsvp => rsvp.id === id);
  
  if (rsvpIndex === -1) {
    return res.status(404).json({ error: 'RSVP not found' });
  }

  // Check if the device key matches
  if (rsvps[rsvpIndex].deviceKey !== deviceKey) {
    return res.status(403).json({ error: '您只能删除自己的确认信息' });
  }

  rsvps.splice(rsvpIndex, 1);
  writeJson('rsvps.json', rsvps);
  res.json({ success: true });
});

// POST /api/admin/login - Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }
  const admins = readJson('admins.json');
  const admin = admins.find(a => a.username === username);
  if (admin && bcrypt.compareSync(password, admin.hashedPassword)) {
    req.session.user = { username };
    res.json({ success: true });
  } else {
    res.json({ success: false, error: 'Invalid credentials' });
  }
});

// POST /api/admin/create - Create new admin (protected)
app.post('/api/admin/create', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }
  const admins = readJson('admins.json');
  if (admins.find(a => a.username === username)) {
    return res.status(400).json({ success: false, error: 'Username exists' });
  }
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);
  admins.push({ username, hashedPassword });
  writeJson('admins.json', admins);
  res.json({ success: true });
});

// GET /api/admin/status - Check login status
app.get('/api/admin/status', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, username: req.session.user.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// Initialize data on startup
initializeData();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});