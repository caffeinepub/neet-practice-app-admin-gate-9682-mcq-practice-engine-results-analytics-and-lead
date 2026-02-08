import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, AlertCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import type { ExtractedQuestion } from '../../utils/pdf/pdfToQuestions';

interface PdfImportPreviewListProps {
  questions: ExtractedQuestion[];
  onRemove: (index: number) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function PdfImportPreviewList({
  questions,
  onRemove,
  onSave,
  isSaving,
}: PdfImportPreviewListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Preview Imported Questions</h3>
          <p className="text-sm text-muted-foreground">
            Review and remove any unwanted questions before saving
          </p>
        </div>
        <Badge variant="secondary">{questions.length} questions</Badge>
      </div>

      <ScrollArea className="h-[500px] rounded-md border">
        <div className="space-y-4 p-4">
          {questions.map((question, index) => {
            const hasReviewMarker =
              question.explanation.includes('[⚠️ Review Required') ||
              question.explanation.includes('[ℹ️ Please Verify');

            return (
              <Card key={index} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => onRemove(index)}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                </Button>

                <CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{question.splitBoundary}</Badge>
                    <Badge variant="secondary">Correct: {question.correctOption}</Badge>
                    {question.questionImage && (
                      <Badge variant="outline" className="gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Has Figure
                      </Badge>
                    )}
                    {hasReviewMarker && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Review Solution
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base pr-10 whitespace-pre-wrap">
                    {question.questionText}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-2">
                  {question.questionImage && (
                    <div className="mb-4 rounded-md border overflow-hidden">
                      <img
                        src={question.questionImage.getDirectURL()}
                        alt="Question figure"
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  <div className="grid gap-2">
                    <div className="flex gap-2">
                      <Badge variant={question.correctOption === 'A' ? 'default' : 'outline'}>
                        A
                      </Badge>
                      <p className="text-sm whitespace-pre-wrap flex-1">
                        {question.optionA || '(empty)'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={question.correctOption === 'B' ? 'default' : 'outline'}>
                        B
                      </Badge>
                      <p className="text-sm whitespace-pre-wrap flex-1">
                        {question.optionB || '(empty)'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={question.correctOption === 'C' ? 'default' : 'outline'}>
                        C
                      </Badge>
                      <p className="text-sm whitespace-pre-wrap flex-1">
                        {question.optionC || '(empty)'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={question.correctOption === 'D' ? 'default' : 'outline'}>
                        D
                      </Badge>
                      <p className="text-sm whitespace-pre-wrap flex-1">
                        {question.optionD || '(empty)'}
                      </p>
                    </div>
                  </div>

                  {(!question.optionA ||
                    !question.optionB ||
                    !question.optionC ||
                    !question.optionD) && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Some options are empty - please review before saving</span>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Explanation:</p>
                    <p className="text-sm whitespace-pre-wrap">{question.explanation}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2">
        <Button onClick={onSave} disabled={isSaving || questions.length === 0} size="lg">
          {isSaving ? 'Saving...' : `Save ${questions.length} Questions`}
        </Button>
      </div>
    </div>
  );
}
