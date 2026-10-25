import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './design/tokens.css';
import './design/base.css';
import './components/ui/ui.css';
import './components/dashboard.css';
import './components/disputes.css';
import './components/detail.css';
import './components/apilog.css';
import './shell/shell.css';

createRoot(document.getElementById('root')).render(<App />);
