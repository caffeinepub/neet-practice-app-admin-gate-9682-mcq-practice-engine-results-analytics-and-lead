import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';

export function useHasContributorAccess() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['hasContributorAccess'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasContributorAccess();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useUnlockContributorMode() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      if (!actor) throw new Error('Connecting to the canister… please wait');
      if (!identity) throw new Error('Please log in to unlock contributor mode');
      
      const result = await actor.unlockContributorMode(password);
      
      if (!result) {
        throw new Error('Invalid password. Please try again.');
      }
      
      return result;
    },
    onSuccess: () => {
      // Optimistically update the cache immediately for instant UI feedback
      queryClient.setQueryData(['hasContributorAccess'], true);
      
      // Invalidate contributor status queries to refetch from backend
      queryClient.invalidateQueries({ queryKey: ['hasContributorAccess'] });
      
      // Invalidate data queries so they can now fetch
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}
