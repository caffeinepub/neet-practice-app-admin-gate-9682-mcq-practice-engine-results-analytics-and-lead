import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from 'lucide-react';

interface YearSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableYears: number[];
  onYearSelect: (year: number) => void;
  categoryTitle: string;
}

export default function YearSelectDialog({
  open,
  onOpenChange,
  availableYears,
  onYearSelect,
  categoryTitle,
}: YearSelectDialogProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const handleConfirm = () => {
    if (selectedYear !== null) {
      onYearSelect(selectedYear);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Select Year for {categoryTitle}
          </DialogTitle>
          <DialogDescription>
            Choose the exam year you want to practice from
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="grid grid-cols-3 gap-2">
            {availableYears.map((year) => (
              <Button
                key={year}
                variant={selectedYear === year ? 'default' : 'outline'}
                onClick={() => setSelectedYear(year)}
                className="h-12 font-semibold"
              >
                {year}
              </Button>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedYear === null}>
            Start Practice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
