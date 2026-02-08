import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';

// Check if caller has contributor access
export function useHasContributorAccess() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['hasContributorAccess'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerContributor();
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });
}

// Verify contributor password and unlock access
export function useVerifyContributorPassword() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      if (!actor) throw new Error('Actor not available');
      const isValid = await actor.verifyContributorPassword(password);
      if (!isValid) {
        throw new Error('Invalid password');
      }
      return isValid;
    },
    onSuccess: () => {
      // Invalidate contributor access query to refetch
      queryClient.invalidateQueries({ queryKey: ['hasContributorAccess'] });
      // Also invalidate chapters/questions queries so they refetch with new permissions
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}
