import { useGameStore } from '../store/useGameStore';
import { IMPLEMENTED_FLOORS } from '../floors/_registry';

export function useElevator() {
  const elevatorUsesRemaining = useGameStore((s) => s.elevatorUsesRemaining);
  const useElevatorPress = useGameStore((s) => s.useElevator);
  const resetElevatorUses = useGameStore((s) => s.resetElevatorUses);
  const visitedFloors = useGameStore((s) => s.visitedFloors);

  const pickRandomFloor = (): number => {
    const pool = IMPLEMENTED_FLOORS;
    const weights = pool.map((f) => (visitedFloors.includes(f) ? 1 : 2));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      random -= weights[i];
      if (random <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  };

  const pressElevator = (): number | null => {
    if (!useElevatorPress()) return null;
    return pickRandomFloor();
  };

  return {
    elevatorUsesRemaining,
    pressElevator,
    resetElevatorUses,
    canUseElevator: elevatorUsesRemaining > 0,
  };
}
