import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const mount = document.getElementById('root');
if (!mount) throw new Error('Missing application root element.');

createRoot(mount).render(<App />);
