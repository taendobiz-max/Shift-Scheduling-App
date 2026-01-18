import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
// Version: 5.0.0 - Query parameter cache busting
const BUILD_VERSION = '5.0.0';
console.log('✅ App version:', BUILD_VERSION, '- Query parameter cache busting');
