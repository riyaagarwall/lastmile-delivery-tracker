require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const areaRoutes = require('./routes/areaRoutes');
const rateCardRoutes = require('./routes/rateCardRoutes');
const agentRoutes = require('./routes/agentRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/rate-cards', rateCardRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
