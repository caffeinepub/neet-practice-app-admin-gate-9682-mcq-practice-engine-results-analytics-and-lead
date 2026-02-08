import { loadPdfFromFile } from './pdfjsClient';
import type { PDFDocumentProxy, PDFPageProxy } from './pdfjsClient';
import type { Category } from '../../backend';
import { ExternalBlob } from '../../backend';
import { reconstructTextWithWhitespace, extractFullTextWithPages } from './pdfTextReconstruction';
import {
  detectSolutionsSection,
  parseSolutions,
  mapSolutionsToQuestions,
  formatSolutionForExplanation,
} from './pdfSolutionMapping';

export interface ExtractedQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string;
  category: Category;
  year: bigint | null;
  splitBoundary: string; // For preview display (e.g., "Section A • Q5")
  sectionLabel?: string; // Section identifier (e.g., "Section A")
  questionNumber?: string; // Original question number from PDF
  questionImage?: ExternalBlob; // Extracted figure/diagram for the question
}

/**
 * Extract a page region as an image (for figures/diagrams)
 */
async function extractPageImage(page: PDFPageProxy, scale: number = 2): Promise<Uint8Array<ArrayBuffer>> {
  const viewport = page.getViewport({ scale });
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get canvas context');
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Render page to canvas
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to convert canvas to blob'));
        return;
      }
      blob.arrayBuffer().then((buffer) => {
        // Cast to the correct type
        resolve(new Uint8Array(buffer) as Uint8Array<ArrayBuffer>);
      }).catch(reject);
    }, 'image/png');
  });
}

/**
 * Extract text from PDF while preserving Unicode characters and whitespace
 */
async function extractTextFromPdf(file: File): Promise<{ text: string; pdf: PDFDocumentProxy }> {
  const pdf: PDFDocumentProxy = await loadPdfFromFile(file);
  const numPages = pdf.numPages;

  if (numPages === 0) {
    throw new Error('The PDF file appears to be empty or corrupted.');
  }

  const pagesText: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Use whitespace-preserving reconstruction
    const pageText = reconstructTextWithWhitespace(textContent.items, pageNum);
    pagesText.push(pageText);
  }

  // Combine all pages with separators
  const fullText = extractFullTextWithPages(pagesText);

  // Check if we extracted any meaningful text
  const trimmedText = fullText.trim();
  if (trimmedText.length === 0) {
    throw new Error(
      'This PDF contains no selectable text. It appears to be a scanned or image-only PDF. Text-based PDFs are required for import.'
    );
  }

  return { text: fullText, pdf };
}

/**
 * Detect section headers in text
 */
function detectSections(text: string): { label: string; startIndex: number }[] {
  const sections: { label: string; startIndex: number }[] = [];

  // Pattern for section headers: "SECTION A", "Section B", etc.
  const sectionPattern = /(?:^|\n)\s*(SECTION\s+[A-Z]|Section\s+[A-Z])\s*(?:\n|$)/gi;
  const matches = Array.from(text.matchAll(sectionPattern));

  for (const match of matches) {
    if (match.index !== undefined) {
      sections.push({
        label: match[1].trim(),
        startIndex: match.index + match[0].length,
      });
    }
  }

  return sections;
}

/**
 * Split extracted text into individual questions with section awareness
 */
async function splitIntoQuestions(
  text: string,
  category: Category,
  year: bigint | null,
  pdf: PDFDocumentProxy
): Promise<ExtractedQuestion[]> {
  const questions: ExtractedQuestion[] = [];

  // Detect sections
  const sections = detectSections(text);

  // Detect solutions section
  const solutionsDetection = detectSolutionsSection(text);
  let questionsText = text;
  let solutionsText = '';

  if (solutionsDetection.found) {
    questionsText = text.substring(0, solutionsDetection.startIndex);
    solutionsText = text.substring(solutionsDetection.startIndex);
  }

  // Pattern for numbered questions (e.g., "1.", "Q1.", "Question 1:", etc.)
  const numberedPattern = /(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d+)[\.\:\)]\s*/gi;
  const matches = Array.from(questionsText.matchAll(numberedPattern));

  if (matches.length > 1) {
    // We found numbered questions - extract in order
    const questionIdentifiers: string[] = [];

    // Try to extract one figure per page as a simple heuristic
    let pageImages: (ExternalBlob | null)[] = [];
    try {
      for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, matches.length); pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const imageBytes = await extractPageImage(page, 1.5);
          pageImages.push(ExternalBlob.fromBytes(imageBytes));
        } catch (err) {
          console.warn(`Could not extract image from page ${pageNum}:`, err);
          pageImages.push(null);
        }
      }
    } catch (err) {
      console.warn('Figure extraction failed, continuing without images:', err);
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const questionNumber = match[1];
      const startIndex = match.index! + match[0].length;
      const endIndex = i < matches.length - 1 ? matches[i + 1].index! : questionsText.length;
      const questionBlock = questionsText.substring(startIndex, endIndex); // Don't trim - preserve formatting

      // Determine section for this question
      let currentSection = '';
      for (let j = sections.length - 1; j >= 0; j--) {
        if (match.index! >= sections[j].startIndex) {
          currentSection = sections[j].label;
          break;
        }
      }

      if (questionBlock.length > 10) {
        const parsed = parseQuestionBlock(questionBlock, category, year);
        if (parsed) {
          parsed.questionNumber = questionNumber;
          parsed.sectionLabel = currentSection;
          parsed.splitBoundary = currentSection
            ? `${currentSection} • Q${questionNumber}`
            : `Q${questionNumber}`;
          
          // Attach figure if available (simple heuristic: one image per question)
          if (pageImages.length > i && pageImages[i]) {
            parsed.questionImage = pageImages[i]!;
          }
          
          questions.push(parsed);
          questionIdentifiers.push(questionNumber);
        }
      }
    }

    // Map solutions if found
    if (solutionsText.length > 0) {
      const solutions = parseSolutions(solutionsText);
      const solutionMapping = mapSolutionsToQuestions(questionIdentifiers, solutions);

      solutionMapping.forEach((solution, index) => {
        if (index < questions.length) {
          const existingExplanation = questions[index].explanation;
          // Only override if existing explanation is placeholder
          if (
            !existingExplanation ||
            existingExplanation === 'No explanation provided.' ||
            existingExplanation.includes('Please review and complete')
          ) {
            questions[index].explanation = formatSolutionForExplanation(
              solution.text,
              solution.confidence
            );
          }
        }
      });
    }
  } else {
    // Pattern 2: Split by double newlines (paragraph-based)
    const paragraphs = questionsText.split(/\n\s*\n/).filter((p) => p.trim().length > 10);

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]; // Don't trim - preserve formatting
      const parsed = parseQuestionBlock(paragraph, category, year);
      if (parsed) {
        parsed.splitBoundary = `Block ${i + 1}`;
        questions.push(parsed);
      }
    }
  }

  return questions;
}

/**
 * Parse a question block into structured question data
 * Preserves whitespace and Unicode symbols in all fields
 */
function parseQuestionBlock(
  block: string,
  category: Category,
  year: bigint | null
): ExtractedQuestion | null {
  // Try to extract options (A), (B), (C), (D) or A., B., C., D. or a), b), c), d)
  const optionPatterns = [
    /(?:^|\n)\s*\(?([A-Da-d])\)[\.\:]?\s*([^\n]+(?:\n(?!\s*\(?[A-Da-d]\)[\.\:]?).*)*)/gi,
    /(?:^|\n)\s*([A-Da-d])[\.\:]?\s*([^\n]+(?:\n(?!\s*[A-Da-d][\.\:]?).*)*)/gi,
  ];

  let options: { [key: string]: string } = {};
  let optionMatches: RegExpMatchArray[] = [];

  for (const pattern of optionPatterns) {
    const matches = Array.from(block.matchAll(pattern));
    if (matches.length >= 4) {
      optionMatches = matches;
      break;
    }
  }

  if (optionMatches.length >= 4) {
    // Extract options (preserve all whitespace and Unicode)
    for (let i = 0; i < Math.min(4, optionMatches.length); i++) {
      const match = optionMatches[i];
      const optionLetter = match[1].toUpperCase();
      const optionText = match[2].trim(); // Only trim leading/trailing, preserve internal formatting
      options[optionLetter] = optionText;
    }

    // Extract question text (everything before first option, preserve formatting)
    const firstOptionIndex = optionMatches[0].index!;
    const questionText = block.substring(0, firstOptionIndex).trim();

    // Extract explanation (everything after last option)
    const lastOptionMatch = optionMatches[Math.min(3, optionMatches.length - 1)];
    const lastOptionEnd = lastOptionMatch.index! + lastOptionMatch[0].length;
    const remainingText = block.substring(lastOptionEnd).trim();

    // Try to find correct answer indicator
    let correctOption = 'A'; // Default
    const answerPatterns = [
      /(?:answer|correct|ans)[\s\:\-]*\(?([A-Da-d])\)?/i,
      /\(?([A-Da-d])\)?\s*(?:is|are)?\s*(?:the)?\s*(?:correct|right)/i,
    ];

    for (const pattern of answerPatterns) {
      const answerMatch = remainingText.match(pattern);
      if (answerMatch) {
        correctOption = answerMatch[1].toUpperCase();
        break;
      }
    }

    // Extract explanation (remove answer indicator, preserve formatting)
    let explanation = remainingText;
    for (const pattern of answerPatterns) {
      explanation = explanation.replace(pattern, '').trim();
    }

    // If no explanation found, use a default
    if (!explanation || explanation.length < 5) {
      explanation = 'No explanation provided.';
    }

    return {
      questionText: questionText || 'Question text not found',
      optionA: options['A'] || '',
      optionB: options['B'] || '',
      optionC: options['C'] || '',
      optionD: options['D'] || '',
      correctOption,
      explanation,
      category,
      year,
      splitBoundary: '',
    };
  }

  // If we couldn't parse options, treat entire block as question text
  return {
    questionText: block,
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: 'Please review and complete the options and explanation.',
    category,
    year,
    splitBoundary: '',
  };
}

/**
 * Main function to convert PDF to questions with figure extraction
 */
export async function pdfToQuestions(
  file: File,
  category: Category,
  year: bigint | null
): Promise<ExtractedQuestion[]> {
  // Extract text from PDF with whitespace preservation
  const { text, pdf } = await extractTextFromPdf(file);

  // Split into questions with section awareness, solution mapping, and figure extraction
  const questions = await splitIntoQuestions(text, category, year, pdf);

  if (questions.length === 0) {
    throw new Error('No questions could be extracted from the PDF. Please check the PDF format.');
  }

  return questions;
}
