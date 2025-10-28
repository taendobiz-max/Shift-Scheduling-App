const express = require('express');
const cors = require('cors');
const { generateShifts } = require('./shiftGenerator');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate shifts endpoint
app.post('/api/generate-shifts', async (req, res) => {
  try {
    console.log('📥 Received shift generation request');
    const { employees, businessMasters, dateRange, pairGroups, location } = req.body;
    
    if (!employees || !businessMasters || !dateRange) {
      return res.status(400).json({ 
        error: 'Missing required parameters'
      });
    }
    
    console.log(`📊 Processing ${dateRange.length} days for ${employees.length} employees`);
    
    const result = await generateShifts(
      employees,
      businessMasters,
      dateRange,
      pairGroups,
      location
    );
    
    console.log('✅ Shift generation completed');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});

