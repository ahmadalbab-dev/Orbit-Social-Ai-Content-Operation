import React from 'react';
import { createRoot } from 'react-dom/client';
import Home from '../../../apps/web/app/page';
import './mobile.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Home /></React.StrictMode>);
