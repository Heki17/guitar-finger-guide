import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';

// StrictMode は alphaTab の二重初期化(SoundFont の二重ロード)を避けるため使わない
createRoot(document.getElementById('root')!).render(<App />);
