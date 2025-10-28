import express from 'express';
import cors from 'cors';
import { generateShifts } from './shiftGenerator';

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
    
    const allShifts: any[] = [];
    const allViolations: string[] = [];
    const allUnassigned: string[] = [];
    
    // Generate shifts for each date
    for (const date of dateRange) {
      console.log(`📅 Processing ${date}`);
      
      const result = await generateShifts(
        employees,
        businessMasters,
        date,
        pairGroups,
        location,
        undefined  // Force DB load each time
      );
      
      if (result.shifts) {
        allShifts.push(...result.shifts);
      }
      
      if (result.violations) {
        allViolations.push(...result.violations);
      }
      
      if (result.unassigned_businesses) {
        allUnassigned.push(...result.unassigned_businesses);
      }
      
      console.log(`✅ ${date}: ${result.shifts?.length || 0} shifts generated`);
      
      // Small delay to ensure DB writes complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Total: ${allShifts.length} shifts generated`);
    
    res.json({
      success: true,
      shifts: allShifts,
      violations: allViolations,
      unassigned: allUnassigned,
      summary: {
        total_shifts: allShifts.length,
        total_days: dateRange.length,
        total_violations: allViolations.length,
        total_unassigned: allUnassigned.length
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});

