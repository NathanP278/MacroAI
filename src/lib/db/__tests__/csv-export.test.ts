import { describe, it, expect } from 'vitest';
import {
  escapeCsvCell,
  buildFoodLogsCsv,
  buildDailySummaryCsv,
  buildWeightLogsCsv,
} from '../csv-export';
import type { FoodLogEntry, UserGoals, WeightLogEntry } from '@/types/nutrition';

describe('Formula-Safe RFC 4180 CSV Exports', () => {
  describe('escapeCsvCell', () => {
    it('escapes RFC 4180 quotes/commas/newlines and neutralizes leading spreadsheet formula characters', () => {
      expect(escapeCsvCell('=SUM(A1:A2)')).toBe('"\'=SUM(A1:A2)"');
      expect(escapeCsvCell('+cmd|calc')).toBe('"\'+cmd|calc"');
      expect(escapeCsvCell('-10')).toBe('"\'-10"');
      expect(escapeCsvCell('-cmd|calc')).toBe('"\'-cmd|calc"');
      expect(escapeCsvCell('@foo')).toBe('"\'@foo"');
      expect(escapeCsvCell('\t=1+1')).toBe('"\'\t=1+1"');
      expect(escapeCsvCell('\r=1+1')).toBe('"\'\r=1+1"');
      expect(escapeCsvCell('=HYPERLINK("a","b")')).toBe('"\'=HYPERLINK(""a"",""b"")"');
      expect(escapeCsvCell('Chicken, "Grilled"')).toBe('"Chicken, ""Grilled"""');
      expect(escapeCsvCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('handles null, undefined, plain strings, and finite/non-finite numbers properly', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
      expect(escapeCsvCell('')).toBe('');
      expect(escapeCsvCell('Plain Chicken')).toBe('Plain Chicken');
      expect(escapeCsvCell(0)).toBe('0');
      expect(escapeCsvCell(-0)).toBe('0');
      expect(escapeCsvCell(250)).toBe('250');
      expect(escapeCsvCell(-10)).toBe('-10');
      expect(escapeCsvCell(-42.5)).toBe('-42.5');
      expect(escapeCsvCell(Number.NaN)).toBe('');
      expect(escapeCsvCell(Number.POSITIVE_INFINITY)).toBe('');
    });
  });

  describe('buildFoodLogsCsv', () => {
    it('returns header row when logs array is empty', () => {
      const csv = buildFoodLogsCsv([]);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('date');
      expect(lines[0]).toContain('calories');
      expect(lines[0]).toContain('sugarG');
      expect(lines[0]).toContain('caffeineMg');
      expect(lines[0]).toContain('alcoholG');
      expect(lines[0]).toContain('note');
    });

    it('sorts chronologically, includes extended nutrients & netCarbs, and neutralizes formula payloads', () => {
      const logs: FoodLogEntry[] = [
        {
          id: 'log-2',
          date: '2026-11-15',
          foodId: 'usda:coffee',
          name: '+Black Coffee',
          source: 'usda',
          amount: 240,
          unit: 'ml',
          nutritionSnapshot: {
            calories: 2,
            protein: 0.3,
            carbs: 0,
            fat: 0,
            fiber: 0,
            micros: {
              caffeineMg: 95,
              potassiumMg: 116,
            },
          },
          note: '@morning',
          createdAt: 1763193600000,
        },
        {
          id: 'log-1',
          date: '2026-11-14',
          foodId: 'custom:1',
          name: '=SUM(A1:B1), "Steak"',
          source: 'custom_food',
          amount: 200,
          unit: 'g',
          nutritionSnapshot: {
            calories: 420,
            protein: 52,
            carbs: 10,
            fat: 18,
            fiber: 3,
            micros: {
              sugarG: 2,
              addedSugarG: 1,
              saturatedFatG: 6.5,
              cholesterolMg: 140,
              sodiumMg: 380,
              potassiumMg: 620,
              alcoholG: 0,
            },
          },
          note: '-1+1 danger',
          createdAt: 1763107200000,
        },
      ];

      const csv = buildFoodLogsCsv(logs);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3);

      // Sorted chronologically: 2026-11-14 first, then 2026-11-15
      expect(lines[1]).toContain('2026-11-14');
      expect(lines[1]).toContain('"\'=SUM(A1:B1), ""Steak"""');
      expect(lines[1]).toContain('"\'-1+1 danger"');
      expect(lines[2]).toContain('2026-11-15');
      expect(lines[2]).toContain('"\'+Black Coffee"');
      expect(lines[2]).toContain('"\'@morning"');

      // Verify extended columns & netCarbs (10 carbs - 3 fiber = 7)
      const headers = lines[0].split(',');
      const row1 = lines[1].split(',');
      // Note: row1 has an embedded comma inside quoted name, so check headers -> values via simple verification
      expect(headers).toEqual(
        expect.arrayContaining([
          'date',
          'recordedAt',
          'id',
          'name',
          'source',
          'amount',
          'unit',
          'calories',
          'proteinG',
          'carbsG',
          'fatG',
          'fiberG',
          'netCarbsG',
          'sugarG',
          'addedSugarG',
          'saturatedFatG',
          'cholesterolMg',
          'caffeineMg',
          'alcoholG',
          'sodiumMg',
          'potassiumMg',
          'note',
        ])
      );
      expect(row1.join(',')).toContain(',420,52,10,18,3,7,2,1,6.5,140,');
    });
  });

  describe('buildDailySummaryCsv', () => {
    it('aggregates by date chronologically, resolves weekday cycling targets, and preserves negative calorie deltas', () => {
      const goals: UserGoals = {
        id: 'active',
        dailyCalories: 2000,
        proteinG: 150,
        carbsG: 200,
        fatG: 65,
        fiberG: 30,
        micronutrientTargets: {},
        weeklyCyclingEnabled: true,
        weeklySchedule: {
          mon: { calories: 1900, proteinG: 150, carbsG: 180, fatG: 64, fiberG: 27 },
          tue: { calories: 1900, proteinG: 150, carbsG: 180, fatG: 64, fiberG: 27 },
          wed: { calories: 1900, proteinG: 150, carbsG: 180, fatG: 64, fiberG: 27 },
          thu: { calories: 1900, proteinG: 150, carbsG: 180, fatG: 64, fiberG: 27 },
          fri: { calories: 2300, proteinG: 150, carbsG: 270, fatG: 69, fiberG: 32 },
          sat: { calories: 2300, proteinG: 150, carbsG: 270, fatG: 69, fiberG: 32 },
          sun: { calories: 1900, proteinG: 150, carbsG: 180, fatG: 64, fiberG: 27 },
        },
        updatedAt: 1000,
      };

      const logs: FoodLogEntry[] = [
        // 2026-11-20 is Friday -> target 2300
        {
          id: 'f1',
          date: '2026-11-20',
          foodId: 'staple:1',
          name: 'Oats',
          source: 'staple',
          amount: 100,
          unit: 'g',
          nutritionSnapshot: {
            calories: 1800,
            protein: 120,
            carbs: 200,
            fat: 50,
            fiber: 25,
            micros: {
              sodiumMg: 1000,
              potassiumMg: 2500,
              sugarG: 12,
              saturatedFatG: 10,
              caffeineMg: 120,
            },
          },
          createdAt: 100,
        },
        // 2026-11-19 is Thursday -> target 1900
        {
          id: 't1',
          date: '2026-11-19',
          foodId: 'staple:2',
          name: 'Chicken',
          source: 'staple',
          amount: 100,
          unit: 'g',
          nutritionSnapshot: {
            calories: 1000,
            protein: 90,
            carbs: 80,
            fat: 30,
            fiber: 10,
            micros: { sodiumMg: 500, potassiumMg: 1000 },
          },
          createdAt: 100,
        },
        {
          id: 't2',
          date: '2026-11-19',
          foodId: 'staple:3',
          name: 'Rice',
          source: 'staple',
          amount: 100,
          unit: 'g',
          nutritionSnapshot: {
            calories: 1100,
            protein: 30,
            carbs: 200,
            fat: 15,
            fiber: 5,
            micros: { sodiumMg: 500, potassiumMg: 500, alcoholG: 14 },
          },
          createdAt: 200,
        },
      ];

      const csv = buildDailySummaryCsv(logs, goals);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3);

      const headers = lines[0].split(',');
      const idxDate = headers.indexOf('date');
      const idxCount = headers.indexOf('logsCount');
      const idxCal = headers.indexOf('calories');
      const idxCalTarget = headers.indexOf('caloriesTarget');
      const idxCalDelta = headers.indexOf('caloriesDelta');
      const idxNetCarbs = headers.indexOf('netCarbsG');
      const idxKNa = headers.indexOf('potassiumSodiumRatio');
      const idxAlcohol = headers.indexOf('alcoholG');
      const idxCaffeine = headers.indexOf('caffeineMg');

      // Row 1: Thursday 2026-11-19 -> 2100 kcal vs 1900 target -> delta 200
      const thu = lines[1].split(',');
      expect(thu[idxDate]).toBe('2026-11-19');
      expect(thu[idxCount]).toBe('2');
      expect(thu[idxCal]).toBe('2100');
      expect(thu[idxCalTarget]).toBe('1900');
      expect(thu[idxCalDelta]).toBe('200');
      expect(thu[idxNetCarbs]).toBe('265'); // 280 - 15
      expect(thu[idxKNa]).toBe('1.5'); // 1500 / 1000
      expect(thu[idxAlcohol]).toBe('14');

      // Row 2: Friday 2026-11-20 -> 1800 kcal vs 2300 target -> delta -500 (numeric, NOT quote-prefixed)
      const fri = lines[2].split(',');
      expect(fri[idxDate]).toBe('2026-11-20');
      expect(fri[idxCount]).toBe('1');
      expect(fri[idxCal]).toBe('1800');
      expect(fri[idxCalTarget]).toBe('2300');
      expect(fri[idxCalDelta]).toBe('-500');
      expect(fri[idxNetCarbs]).toBe('175'); // 200 - 25
      expect(fri[idxKNa]).toBe('2.5'); // 2500 / 1000
      expect(fri[idxCaffeine]).toBe('120');
    });
  });

  describe('buildWeightLogsCsv', () => {
    it('sorts chronologically, includes weightKg and weightLb, and neutralizes formula notes', () => {
      const weights: WeightLogEntry[] = [
        {
          id: 'w-2',
          date: '2026-11-20',
          weightKg: 76.5,
          note: '=cmd|calc',
          source: 'apple_health',
          recordedAt: '2026-11-20T08:00:00.000Z',
          createdAt: 2000,
          updatedAt: 2000,
        },
        {
          id: 'w-1',
          date: '2026-11-19',
          weightKg: 77.0,
          note: 'Morning fasted',
          source: 'manual',
          recordedAt: '2026-11-19T07:30:00.000Z',
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      const csv = buildWeightLogsCsv(weights);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('date,recordedAt,id,weightKg,weightLb,source,note');
      expect(lines[1]).toBe(
        '2026-11-19,2026-11-19T07:30:00.000Z,w-1,77,169.76,manual,Morning fasted'
      );
      expect(lines[2]).toBe(
        '2026-11-20,2026-11-20T08:00:00.000Z,w-2,76.5,168.65,apple_health,"\'=cmd|calc"'
      );
    });
  });
});
