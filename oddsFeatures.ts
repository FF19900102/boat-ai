import { Entry } from '@/lib/types';
import { FeatureMap } from '@/ai/features/pro/types';

export function buildMotorFeatures(entry: Entry): FeatureMap {
  return {
    motor_rate: entry.motorRate,
    boat_rate: entry.boatRate,
    motor_plus_boat: entry.motorRate + entry.boatRate,
    motor_advantage: entry.motorRate >= 40,
    motor_weak: entry.motorRate <= 30,
    boat_advantage: entry.boatRate >= 38,
    boat_weak: entry.boatRate <= 28,
    motor_boat_balance: Math.abs(entry.motorRate - entry.boatRate)
  };
}
