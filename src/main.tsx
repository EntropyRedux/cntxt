import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getMountNode } from './adapters';
import { ErrorBoundary } from './components/Common/ErrorBoundary';

const rootNode = getMountNode('root');
if (rootNode) {
  createRoot(rootNode).render(
    <StrictMode>
      <ErrorBoundary fallbackTitle="Application Error">
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
