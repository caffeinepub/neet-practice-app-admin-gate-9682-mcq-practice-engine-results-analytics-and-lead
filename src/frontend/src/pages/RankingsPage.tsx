import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetLeaderboard, useGetSubjectLeaderboard, useGetCallerStats } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import MobilePage from '../components/layout/MobilePage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, ArrowLeft, Loader2 } from 'lucide-react';
import { Subject } from '../backend';
import { cn } from '@/lib/utils';

type LeaderboardScope = 'overall' | 'physics' | 'chemistry' | 'biology';

export default function RankingsPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const [scope, setScope] = useState<LeaderboardScope>('overall');

  const { data: overallLeaderboard, isLoading: overallLoading } = useGetLeaderboard();
  const { data: physicsLeaderboard, isLoading: physicsLoading } = useGetSubjectLeaderboard(
    scope === 'physics' ? Subject.physics : null
  );
  const { data: chemistryLeaderboard, isLoading: chemistryLoading } = useGetSubjectLeaderboard(
    scope === 'chemistry' ? Subject.chemistry : null
  );
  const { data: biologyLeaderboard, isLoading: biologyLoading } = useGetSubjectLeaderboard(
    scope === 'biology' ? Subject.biology : null
  );
  const { data: callerStats } = useGetCallerStats();

  const currentUserPrincipal = identity?.getPrincipal().toString();

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-700" />;
    return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
  };

  const renderOverallLeaderboard = () => {
    if (overallLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!overallLeaderboard || overallLeaderboard.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No rankings available yet. Be the first to complete a practice session!
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="text-right">Correct</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Accuracy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overallLeaderboard.map((user, index) => {
            const rank = index + 1;
            const accuracy = user.totalQuestionsAnswered > 0 ? (Number(user.correctAnswers) / Number(user.totalQuestionsAnswered)) * 100 : 0;
            const isCurrentUser = callerStats && user.displayName === callerStats.displayName;

            return (
              <TableRow key={index} className={cn(isCurrentUser && 'bg-primary/5 font-semibold')}>
                <TableCell>
                  <div className="flex items-center justify-center">{getRankIcon(rank)}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.displayName}
                    {isCurrentUser && (
                      <Badge variant="default" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{user.correctAnswers.toString()}</TableCell>
                <TableCell className="text-right">{user.totalQuestionsAnswered.toString()}</TableCell>
                <TableCell className="text-right">{accuracy.toFixed(1)}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderSubjectLeaderboard = (subjectData: typeof physicsLeaderboard, loading: boolean, subjectName: string) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!subjectData || subjectData.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No {subjectName} rankings available yet. Be the first to complete a {subjectName} practice session!
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="text-right">Correct</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Accuracy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjectData.map((user, index) => {
            const rank = index + 1;
            const accuracy = user.accuracy * 100;
            const isCurrentUser = currentUserPrincipal && user.user.toString() === currentUserPrincipal;

            return (
              <TableRow key={index} className={cn(isCurrentUser && 'bg-primary/5 font-semibold')}>
                <TableCell>
                  <div className="flex items-center justify-center">{getRankIcon(rank)}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.displayName}
                    {isCurrentUser && (
                      <Badge variant="default" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{user.correctAnswers.toString()}</TableCell>
                <TableCell className="text-right">{user.totalQuestionsAnswered.toString()}</TableCell>
                <TableCell className="text-right">{accuracy.toFixed(1)}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <MobilePage maxWidth="lg">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Rankings</h1>
            <p className="text-muted-foreground">See how you compare with other students</p>
          </div>
        </div>

        {identity && callerStats && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Your Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{callerStats.correctAnswers.toString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{callerStats.totalQuestionsAnswered.toString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {callerStats.totalQuestionsAnswered > 0
                      ? ((Number(callerStats.correctAnswers) / Number(callerStats.totalQuestionsAnswered)) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>Top performers across all subjects and individual subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={scope} onValueChange={(value) => setScope(value as LeaderboardScope)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overall">Overall</TabsTrigger>
                <TabsTrigger value="physics">Physics</TabsTrigger>
                <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
                <TabsTrigger value="biology">Biology</TabsTrigger>
              </TabsList>
              <TabsContent value="overall" className="mt-6">
                {renderOverallLeaderboard()}
              </TabsContent>
              <TabsContent value="physics" className="mt-6">
                {renderSubjectLeaderboard(physicsLeaderboard, physicsLoading, 'Physics')}
              </TabsContent>
              <TabsContent value="chemistry" className="mt-6">
                {renderSubjectLeaderboard(chemistryLeaderboard, chemistryLoading, 'Chemistry')}
              </TabsContent>
              <TabsContent value="biology" className="mt-6">
                {renderSubjectLeaderboard(biologyLeaderboard, biologyLoading, 'Biology')}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MobilePage>
  );
}
