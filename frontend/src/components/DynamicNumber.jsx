import { useMemo } from 'react';

/**
 * Auto-scales font size based on text length to prevent overflow.
 * Designed for payroll numbers that expand dramatically on SYP conversion.
 *
 * Usage:
 *   <DynamicNumber value="200000000" maxLen={12} fontSize="0.875rem" className="..." />
 *
 * @param {string|number} value - Text or number to display
 * @param {number} maxLen - Length threshold before scaling down begins (default 14)
 * @param {string} baseSize - Max font size (default 1rem)
 * @param {string} minSize - Min font size (default 0.5625rem)
 * @param {string} className - Additional CSS classes
 * @param {string} as - HTML element to render (default "span")
 */
const DynamicNumber = ({
  value,
  maxLen = 14,
  baseSize = '1rem',
  minSize = '0.5625rem',
  className = '',
  as: Tag = 'span'
}) => {
  const str = String(value ?? '');
  const len = str.length;

  const fontSize = useMemo(() => {
    if (len <= maxLen) return baseSize;

    const ratio = Math.min((len - maxLen) / 16, 1);
    const basePx = parseFloat(baseSize);
    const minPx = parseFloat(minSize);
    const px = basePx + (minPx - basePx) * ratio;
    return `${px.toFixed(2)}rem`;
  }, [len, maxLen, baseSize, minSize]);

  return (
    <Tag
      className={`dynamic-num ${className}`}
      style={{ fontSize, lineHeight: 1.2, display: 'inline-block', direction: 'ltr', unicodeBidi: 'embed' }}
    >
      {str}
    </Tag>
  );
};

export default DynamicNumber;
