import { PandaReaction } from '../components/panda/Panda';

/**
 * Calculates Home screen Panda mascot mood based on total income and total expense.
 * App has no budgets, so usage ratio is: totalExpensePaise / totalIncomePaise.
 *
 * Rules:
 * - No money in yet (totalIncomePaise <= 0) = sleeping
 * - Usage under 60% (< 0.60) = happy
 * - 60% to 90% (>= 0.60 and <= 0.90) = pleading
 * - Over 90% or overspent (> 0.90 or totalExpensePaise > totalIncomePaise) = crying
 */
export function getHomePandaMood(
  totalIncomePaise: number,
  totalExpensePaise: number
): {
  reaction: PandaReaction;
  message: string;
} {
  if (totalIncomePaise <= 0) {
    return {
      reaction: 'sleeping',
      message: 'No money in yet. Add your income or pocket money to get started!',
    };
  }

  const usageRatio = totalExpensePaise / totalIncomePaise;

  if (totalExpensePaise > totalIncomePaise || usageRatio > 0.9) {
    return {
      reaction: 'crying',
      message: 'Budget alert! You’ve used over 90% or overspent your available money.',
    };
  }

  if (usageRatio >= 0.6) {
    return {
      reaction: 'pleading',
      message: 'Careful! You’ve already spent more than 60% of your money this month.',
    };
  }

  return {
    reaction: 'happy',
    message: 'Great job! Your spending is well under control. Keep it up!',
  };
}

/**
 * Determines reaction after saving a transaction:
 * - After saving money in = celebrating
 * - After saving an expense that makes user overspent (totalExpense > totalIncome) = shocked
 * - Otherwise after saving = happy
 */
export function getPostSaveReaction(
  type: 'in' | 'out',
  newTotalIncomePaise: number,
  newTotalExpensePaise: number
): PandaReaction {
  if (type === 'in') {
    return 'celebrating';
  }

  if (newTotalExpensePaise > newTotalIncomePaise) {
    return 'shocked';
  }

  return 'happy';
}
