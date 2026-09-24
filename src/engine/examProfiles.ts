import { ExamProfile } from './examTypes';

export const EXAM_PROFILES: ExamProfile[] = [
  {
    id: 'ssc-practice',
    name: 'SSC Typing Practice',
    shortName: 'SSC',
    description: 'Clerical & assistant cadre typing practice simulation targeting 35 Net WPM in English.',
    language: 'en',
    duration: 600, // 10 minutes
    targetMetric: 'netWpm',
    targetValue: 35,
    minimumAccuracy: 95,
    evaluationType: 'speed_and_accuracy',
    instructions: [
      'Type continuously with steady cadence and deliberate keystroke discipline.',
      'Target benchmark: 35 Net WPM with at least 95% accuracy over a 10-minute session.',
      'Uncorrected mistakes directly reduce Net WPM according to standard word measurement.',
      'Practice simulation preset — requirements vary across specific recruitment notifications and posts.',
    ],
    passageId: 'exam-ssc-administrative-01',
    simulationDisclaimer:
      'Practice simulation preset. Official exam requirements vary by notification, post, and reservation category. Not an official examination result.',
    enabled: true,
  },
  {
    id: 'rrb-practice',
    name: 'RRB Typing Practice',
    shortName: 'RRB',
    description: 'Railway recruitment clerical typing test simulation targeting 30 Net WPM in English.',
    language: 'en',
    duration: 600, // 10 minutes
    targetMetric: 'netWpm',
    targetValue: 30,
    minimumAccuracy: 95,
    evaluationType: 'speed_and_accuracy',
    instructions: [
      'Maintain an unbroken rhythmic typing pace across the full duration.',
      'Target benchmark: 30 Net WPM with at least 95% accuracy over a 10-minute session.',
      'Ensure errors are minimized early to maintain the required accuracy threshold.',
      'Practice simulation preset — actual railway recruitment rules depend on specific employment notifications.',
    ],
    passageId: 'exam-rrb-infrastructure-02',
    simulationDisclaimer:
      'Practice simulation preset. Requirements vary by railway zone, post, and notification. Not an official examination result.',
    enabled: true,
  },
  {
    id: 'cpct-practice',
    name: 'CPCT Typing Practice',
    shortName: 'CPCT',
    description: 'Computer proficiency and clerical certification typing simulation targeting 30 Net WPM.',
    language: 'en',
    duration: 900, // 15 minutes
    targetMetric: 'netWpm',
    targetValue: 30,
    minimumAccuracy: 90,
    evaluationType: 'speed_and_accuracy',
    instructions: [
      'Pace your speed and stamina over the complete 15-minute simulation window.',
      'Target benchmark: 30 Net WPM with at least 90% accuracy.',
      'Aim for consistency without rushing or causing erratic error spikes.',
      'Practice simulation preset — not an official state computer proficiency certification.',
    ],
    passageId: 'exam-cpct-digital-03',
    simulationDisclaimer:
      'Practice simulation preset. Actual certification criteria vary by official testing authorities. Not an official examination result.',
    enabled: true,
  },
];

export const DEFAULT_EXAM_PROFILE: ExamProfile = EXAM_PROFILES[0];
