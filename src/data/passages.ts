import { Passage } from '@/engine/types';

export const PASSAGES: Passage[] = [
  {
    id: 'tech-history-01',
    title: 'The Evolution of Computing',
    language: 'en',
    difficulty: 'medium',
    text:
      'The modern computer was born out of the urgent necessity to solve complex mathematical problems during the twentieth century. From mechanical calculators to vacuum tubes and silicon microprocessors, the evolution of digital technology transformed global communication. Today, computers process billions of instructions per second, enabling automated scientific discovery, global connectivity, and artificial intelligence systems that reshape how we work and learn.',
  },
  {
    id: 'nature-ecosystems-02',
    title: 'The Balance of Nature',
    language: 'en',
    difficulty: 'easy',
    text:
      'Forests act as the lungs of our planet, absorbing carbon dioxide and providing oxygen for living creatures. Ancient canopy trees shelter thousands of species of birds, insects, and flowering plants. When rainfall reaches the fertile soil, clean streams flow downward through winding valleys to sustain rivers and oceans. Protecting these natural habitats preserves biodiversity and ensures clean water resources for future generations.',
  },
  {
    id: 'science-discovery-03',
    title: 'The Spirit of Scientific Inquiry',
    language: 'en',
    difficulty: 'medium',
    text:
      'Curiosity is the engine of scientific progress. When early astronomers looked up at the night sky, they wondered about the motions of distant wandering stars. Careful observation, rigorous experimentation, and mathematical proof gradually replaced superstition with verifiable knowledge. Every breakthrough raises new questions, reminding us that knowledge is an endless frontier waiting to be explored with diligence and humility.',
  },
  {
    id: 'philosophy-focus-04',
    title: 'Mastery and Deliberate Practice',
    language: 'en',
    difficulty: 'hard',
    text:
      'Excellence in any technical craft requires deliberate practice rather than thoughtless repetition. When typists focus on key transitions, finger positioning, and rhythmic cadence, their muscle memory adapts with remarkable efficiency. Speed follows naturally from precision. By analyzing errors calmly and addressing specific weaknesses without frustration, one transforms hesitation into effortless, fluid performance.',
  },
  {
    id: 'exam-ssc-administrative-01',
    title: 'Public Administration and Civic Governance',
    language: 'en',
    difficulty: 'medium',
    text:
      'Effective public administration forms the backbone of a progressive democracy. Government officials and civil servants are entrusted with the equitable delivery of essential services across urban municipalities and rural districts. Over the past decade, digital infrastructure projects have streamlined citizen records, land registration, and direct welfare transfers. Transparent administrative processes minimize bureaucratic delays, uphold legal accountability, and foster public confidence in democratic institutions.',
  },
  {
    id: 'exam-rrb-infrastructure-02',
    title: 'Modernization of National Railway Networks',
    language: 'en',
    difficulty: 'medium',
    text:
      'The expansion of national transport networks is essential for industrial growth and passenger transit. Connecting remote agricultural hubs with major port terminals enables affordable commodity movement and regional commerce. Modern signaling equipment, automated track monitoring, and passenger reservation systems have substantially upgraded operational safety. Efficient transit systems support sustainable urban migration and drive nationwide economic development.',
  },
  {
    id: 'exam-cpct-digital-03',
    title: 'E-Governance and Digital Public Services',
    language: 'en',
    difficulty: 'medium',
    text:
      'Digital public services have revolutionized governance by delivering citizen certificates, tax assessments, and commercial licensing online. Secure digital databases reduce physical paperwork, ensure prompt grievance redressal, and bridge urban-rural disparities. Standardized computer proficiency among administrative personnel is vital for processing public records accurately and maintaining information security across government departments.',
  },
];

export const DEFAULT_PASSAGE: Passage = PASSAGES[0];
