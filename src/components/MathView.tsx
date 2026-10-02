import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  display?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({ math, display = false, className = '' }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (e) {
      console.warn('KaTeX render error:', e);
      return `<span class="text-rose-500 font-mono">${math}</span>`;
    }
  }, [math, display]);

  return (
    <span
      className={`inline-block font-sans ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
