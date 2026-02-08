import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';

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
