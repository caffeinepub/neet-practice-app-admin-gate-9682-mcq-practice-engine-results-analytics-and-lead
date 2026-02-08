import type { TextItem } from './pdfjsClient';

interface TextItemWithPosition extends TextItem {
  transform: number[];
  width: number;
  height: number;
}

/**
 * Reconstructs text from PDF.js text items with preserved whitespace and line breaks.
 * Uses positioning information to detect line breaks and spacing.
 * Preserves all Unicode characters including mathematical symbols (λ, π, etc.)
 */
export function reconstructTextWithWhitespace(items: any[], pageNumber: number): string {
  if (!items || items.length === 0) return '';

  // Keep ALL items including whitespace-only ones, preserve Unicode
  const textItems: TextItemWithPosition[] = items
    .filter((item) => 'str' in item && item.str.length > 0) // Keep items with any content
    .map((item) => ({
      str: item.str, // Keep original string with all Unicode characters
      transform: item.transform || [1, 0, 0, 1, 0, 0],
      width: item.width || 0,
      height: item.height || 0,
    }))
    .sort((a, b) => {
      const yA = a.transform[5];
      const yB = b.transform[5];
      const xA = a.transform[4];
      const xB = b.transform[4];

      // Sort by Y (descending, since PDF coordinates go bottom-up)
      const yDiff = yB - yA;
      if (Math.abs(yDiff) > 5) {
        // Threshold for same line
        return yDiff > 0 ? -1 : 1;
      }

      // Same line, sort by X (ascending)
      return xA - xB;
    });

  if (textItems.length === 0) return '';

  let result = '';
  let lastY = textItems[0].transform[5];
  let lastX = textItems[0].transform[4];
  let lastWidth = textItems[0].width;

  for (let i = 0; i < textItems.length; i++) {
    const item = textItems[i];
    const currentY = item.transform[5];
    const currentX = item.transform[4];
    const text = item.str; // Preserve all Unicode characters

    // Detect line break (Y position changed significantly)
    const yDiff = Math.abs(currentY - lastY);
    if (yDiff > 5 && i > 0) {
      result += '\n';
      lastX = 0; // Reset X for new line
    } else if (i > 0) {
      // Same line - check if we need a space
      const xGap = currentX - (lastX + lastWidth);
      if (xGap > 2) {
        // Threshold for space detection
        result += ' ';
      }
    }

    result += text; // Add text with all Unicode preserved
    lastY = currentY;
    lastX = currentX;
    lastWidth = item.width;
  }

  return result;
}

/**
 * Extract text from all pages with page separators
 */
export function extractFullTextWithPages(pagesText: string[]): string {
  return pagesText
    .map((pageText, index) => {
      // Don't trim - preserve all whitespace and formatting
      if (pageText.length === 0) return '';
      return `\n--- PAGE ${index + 1} ---\n${pageText}`;
    })
    .filter((text) => text.length > 0)
    .join('\n\n');
}
