import { useNavigate } from '@tanstack/react-router';
import MobilePage from '../components/layout/MobilePage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Atom, Beaker, Dna } from 'lucide-react';
import { Subject } from '../backend';

export default function SubjectSelectPage() {
  const navigate = useNavigate();

  const subjects: { id: Subject; name: string; icon: any; color: string }[] = [
    { id: Subject.physics, name: 'Physics', icon: Atom, color: 'text-blue-600' },
    { id: Subject.chemistry, name: 'Chemistry', icon: Beaker, color: 'text-green-600' },
    { id: Subject.biology, name: 'Biology', icon: Dna, color: 'text-red-600' },
  ];

  return (
    <MobilePage maxWidth="md">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Select Subject</h1>
            <p className="text-muted-foreground">Choose a subject to practice</p>
          </div>
        </div>

        <div className="grid gap-4">
          {subjects.map((subject) => {
            const Icon = subject.icon;
            return (
              <Card
                key={subject.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate({ to: '/chapter/$subject', params: { subject: subject.id } })}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className={`w-6 h-6 ${subject.color}`} />
                    </div>
                    <div>
                      <CardTitle>{subject.name}</CardTitle>
                      <CardDescription>Practice {subject.name.toLowerCase()} questions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Select {subject.name}</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MobilePage>
  );
}
