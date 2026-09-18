import React from 'react';

/**
 * EditorSkeleton
 *
 * Renders instantly (zero CodeMirror / Mermaid dependencies) as the Suspense
 * fallback while the lazy Editor chunk is loading. Uses a CSS shimmer
 * animation to signal activity, matching the editor background token so
 * there is no visual flash when CodeMirror mounts.
 */
export const EditorSkeleton: React.FC = () => {
  // Varying widths mimic realistic code-line lengths
  const lines = [72, 55, 88, 40, 65, 30, 78, 50, 92, 38, 68, 45];

  return (
    <div
      aria-label="Editor loading…"
      aria-busy="true"
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--editor-bg)',
        padding: '20px 24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <style>{`
        @keyframes cntxt-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .cntxt-skeleton-line {
          height: 13px;
          border-radius: 3px;
          background: linear-gradient(
            90deg,
            var(--editor-bg) 25%,
            color-mix(in srgb, var(--editor-fg) 8%, var(--editor-bg)) 50%,
            var(--editor-bg) 75%
          );
          background-size: 800px 100%;
          animation: cntxt-shimmer 1.4s ease-in-out infinite;
          flex-shrink: 0;
        }
      `}</style>

      {lines.map((width, i) => (
        <div
          key={i}
          className="cntxt-skeleton-line"
          style={{
            width: `${width}%`,
            // Stagger animation so lines don't all pulse together
            animationDelay: `${(i * 80) % 400}ms`,
          }}
        />
      ))}
    </div>
  );
};
