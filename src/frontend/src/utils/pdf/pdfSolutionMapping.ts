/**
 * Solution mapping utility for PDF imports
 */

export interface SolutionEntry {
  questionNumber: string;
  solutionText: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects if text contains a solutions section
 */
export function detectSolutionsSection(text: string): { found: boolean; startIndex: number } {
  const solutionHeaders = [
    /\n\s*solutions?\s*$/im,
    /\n\s*answer\s+key\s*$/im,
    /\n\s*answers?\s*$/im,
    /\n\s*sol\.?\s*$/im,
    /\n\s*detailed\s+solutions?\s*$/im,
  ];

  for (const pattern of solutionHeaders) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      return { found: true, startIndex: match.index + match[0].length };
    }
  }

  return { found: false, startIndex: -1 };
}

/**
 * Parse solutions section into keyed entries
 */
export function parseSolutions(solutionsText: string): SolutionEntry[] {
  const solutions: SolutionEntry[] = [];

  // Pattern to match solution entries: "Q1.", "1.", "Sol 1:", etc.
  const solutionPattern = /(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*|Sol\.?\s*)?(\d+)[\.\:\)]\s*([^\n]+(?:\n(?!\s*(?:Q(?:uestion)?\.?\s*|Sol\.?\s*)?\d+[\.\:\)]).*)*)/gi;

  const matches = Array.from(solutionsText.matchAll(solutionPattern));

  for (const match of matches) {
    const questionNumber = match[1];
    const solutionText = match[2].trim();

    if (solutionText.length > 0) {
      solutions.push({
        questionNumber,
        solutionText,
        confidence: 'high',
      });
    }
  }

  return solutions;
}

/**
 * Map solutions to questions by question number or sequence
 */
export function mapSolutionsToQuestions(
  questionIdentifiers: string[],
  solutions: SolutionEntry[]
): Map<number, { text: string; confidence: 'high' | 'medium' | 'low' }> {
  const mapping = new Map<number, { text: string; confidence: 'high' | 'medium' | 'low' }>();

  // Create a map of question numbers to indices
  const questionNumberMap = new Map<string, number>();
  questionIdentifiers.forEach((identifier, index) => {
    // Extract number from identifier (e.g., "Question 5" -> "5")
    const numberMatch = identifier.match(/\d+/);
    if (numberMatch) {
      questionNumberMap.set(numberMatch[0], index);
    }
  });

  // Map solutions by question number
  for (const solution of solutions) {
    const questionIndex = questionNumberMap.get(solution.questionNumber);
    if (questionIndex !== undefined) {
      mapping.set(questionIndex, {
        text: solution.solutionText,
        confidence: solution.confidence,
      });
    }
  }

  // For unmapped solutions, try sequential mapping with lower confidence
  if (solutions.length > 0 && mapping.size < solutions.length) {
    solutions.forEach((solution, index) => {
      if (index < questionIdentifiers.length && !mapping.has(index)) {
        mapping.set(index, {
          text: solution.solutionText,
          confidence: 'medium',
        });
      }
    });
  }

  return mapping;
}

/**
 * Format solution text for explanation field
 */
export function formatSolutionForExplanation(
  solutionText: string,
  confidence: 'high' | 'medium' | 'low'
): string {
  if (confidence === 'low') {
    return `[⚠️ Review Required - Low Confidence Mapping]\n\n${solutionText}`;
  } else if (confidence === 'medium') {
    return `[ℹ️ Please Verify - Sequential Mapping]\n\n${solutionText}`;
  }
  return solutionText;
}
