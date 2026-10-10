import React, { useEffect, useRef } from 'react';
import { getActiveThemeTokens, isDarkTheme } from '../../features/panelApps/theme/themeSync';

export interface AppFrameHostProps {
  mountedIds: string[];
  activeId: string | null;
  visible: boolean;
  reloadNonce: Record<string, number>;
  getUrl?: (id: string) => string;
  getSrcDoc?: (id: string) => string;
  titleOf: (id: string) => string;
  topOffset?: string;
  theme?: string;
}

export const AppFrameHost: React.FC<AppFrameHostProps> = ({
  mountedIds,
  activeId,
  visible,
  reloadNonce,
  getUrl,
  getSrcDoc,
  titleOf,
  topOffset = '0px',
  theme,
}) => {
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  // Broadcast theme updates live to all mounted iframes when CNTXT theme changes
  useEffect(() => {
    const tokens = getActiveThemeTokens();
    const isDark = isDarkTheme();

    Object.values(iframeRefs.current).forEach((iframe) => {
      try {
        iframe?.contentWindow?.postMessage(
          {
            type: 'CNTXT_THEME_UPDATE',
            tokens,
            colorScheme: isDark ? 'dark' : 'light',
          },
          '*'
        );
      } catch {
        // Sandboxed window cross-origin security guard
      }
    });
  }, [theme]);

  return (
    <div
      className="app-frame-host absolute inset-x-0 w-full overflow-hidden"
      data-visible={visible ? 'true' : 'false'}
      style={{
        top: topOffset,
        height: `calc(100% - ${topOffset})`,
        visibility: visible ? 'visible' : 'hidden',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {mountedIds.map((id) => {
        const isActive = id === activeId;
        const nonce = reloadNonce[id] ?? 0;
        const url = getUrl ? getUrl(id) : 'about:blank';
        const doc = getSrcDoc ? getSrcDoc(id) : undefined;

        return (
          <iframe
            key={`${id}:${nonce}:${doc ? 'ready' : 'empty'}`}
            ref={(el) => {
              iframeRefs.current[id] = el;
            }}
            src={doc ? undefined : url}
            srcDoc={doc || undefined}
            title={titleOf(id)}
            data-active={isActive ? 'true' : 'false'}
            className="absolute inset-0 w-full h-full border-0 bg-transparent"
            style={{
              visibility: isActive && visible ? 'visible' : 'hidden',
              pointerEvents: isActive && visible ? 'auto' : 'none',
            }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          />
        );
      })}
    </div>
  );
};
