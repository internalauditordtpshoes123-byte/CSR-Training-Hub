import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { EditableProvider } from './components/EditableText.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditableProvider>
      <App />
    </EditableProvider>
  </StrictMode>,
);
