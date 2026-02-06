import { useNavigate } from '@tanstack/react-router';
import { useGetLeaderboard, useGetCallerStats } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import MobilePage from '../components/layout/MobilePage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Medal, Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RankingsPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: leaderboard, isLoading } = useGetLeaderboard();
  const { data: myStats } = useGetCallerStats();

  const isAuthenticated = !!identity;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-muted-foreground font-semibold">#{rank}</span>;
  };

  const calculateAccuracy = (correct: bigint, total: bigint) => {
    if (total === 0n) return 0;
    return Math.round((Number(correct) / Number(total)) * 100);
  };

  return (
    <MobilePage maxWidth="lg">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Rankings</h1>
            <p className="text-muted-foreground">Top performers leaderboard</p>
          </div>
        </div>

        {isAuthenticated && myStats && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{Number(myStats.totalQuestionsAnswered)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Questions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{Number(myStats.correctAnswers)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {calculateAccuracy(myStats.correctAnswers, myStats.totalQuestionsAnswered)}%
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
            <CardDescription>Top students ranked by performance</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Questions</TableHead>
                      <TableHead className="text-right">Accuracy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((user, index) => {
                      const rank = index + 1;
                      const accuracy = calculateAccuracy(user.correctAnswers, user.totalQuestionsAnswered);
                      const isCurrentUser = isAuthenticated && myStats && user.displayName === myStats.displayName;

                      return (
                        <TableRow
                          key={index}
                          className={cn(
                            isCurrentUser && 'bg-primary/10 border-l-4 border-l-primary'
                          )}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center justify-center">
                              {getRankIcon(rank)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.displayName}
                            {isCurrentUser && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                You
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(user.totalQuestionsAnswered)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={accuracy >= 80 ? 'default' : 'secondary'}>
                              {accuracy}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No rankings yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Complete practice sessions to appear on the leaderboard
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobilePage>
  );
}
