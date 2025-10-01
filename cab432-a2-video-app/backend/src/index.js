const express = require('express');
const cors = require('cors');
const videoRoutes = require('./routes/videoRoutes');
const { loadConfig } = require('./services/config');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api', videoRoutes);

app.use((err, req, res, next) => {
  console.error('[server] Unhandled error', err);
  res.status(500).json({ message: 'Internal server error' });
});

async function start() {
  try {
    await loadConfig();
    app.listen(port, () => {
      console.log(`Backend API listening on port ${port}`);
    });
  } catch (error) {
    console.error('[server] Failed to start application', error);
    process.exit(1);
  }
}

start();
