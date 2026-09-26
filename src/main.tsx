import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';

import './index.css';
import 'katex/dist/katex.min.css';
import { getMountNode, installViewportResizeStabilizer } from './adapters';
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

// Install the WebView2 resize stability fix (decorations:false blank-strip bug).
// Quarantined inside src/adapters/domHelper to satisfy the platform-leak rule.
installViewportResizeStabilizer('root');
