import { getActiveCoachSubscription } from '@/lib/monetization';

export async function canActAsCoach(userId: string): Promise<boolean> {
  const sub = await getActiveCoachSubscription(userId);
  return !!sub;
}

