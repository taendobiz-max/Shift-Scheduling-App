import express, { Request, Response } from 'express';
import cors from 'cors';
import { generateShiftsAPI } from './shiftGeneratorAPI';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Shift generation endpoint
app.post('/api/generate-shifts', async (req: Request, res: Response) => {
  try {
    console.log('📥 Received shift generation request');
    const { employees, businessMasters, dateRange, pairGroups, location } = req.body;
    
    if (!employees || !businessMasters || !dateRange) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['employees', 'businessMasters', 'dateRange']
      });
    }
    
    console.log(`📊 Processing ${dateRange.length} days for ${employees.length} employees`);
    
    const result = await generateShiftsAPI(
      employees,
      businessMasters,
      dateRange,
      pairGroups,
      location
    );
    
    console.log('✅ Shift generation completed');
    res.json(result);
    
  } catch (error: any) {
    console.error('❌ Error in shift generation:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Shift Scheduling API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});

