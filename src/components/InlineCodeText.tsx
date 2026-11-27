import { Fragment } from 'react';

interface InlineCodeTextProps {
  text: string;
}

/**
 * Renders inline markdown backtick spans (e.g. `repitch transposef`) as styled <code> elements.
 */
export function InlineCodeText({ text }: InlineCodeTextProps) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.length >= 2 && part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={idx} className="inline-code">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <Fragment key={idx}>{part}</Fragment>;
      })}
    </>
  );
}
