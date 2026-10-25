/** «Уақыт математикасы»: 3 деңгей × 5 есеп = 15 есеп (2-сынып деңгейі). */
export type TaskTopic = 'conversion' | 'clock' | 'interval' | 'addition' | 'subtraction' | 'remainder' | 'comparison' | 'error';

export const TOPIC_LABELS: Record<TaskTopic, string> = {
  conversion: 'Сағат пен минут',
  clock: 'Сағатты оқу',
  interval: 'Аралық ұзақтығы',
  addition: 'Қосу',
  subtraction: 'Азайту',
  remainder: 'Қалған уақыт',
  comparison: 'Салыстыру',
  error: 'Қатені тап',
};

export const LEVELS = [
  { n: 1, title: 'Сағат пен минут', desc: 'Сағатты минутқа, минутты сағатқа айналдыр.' },
  { n: 2, title: 'Уақытты есептеу', desc: 'Аралықтың ұзақтығын тап, уақыттарды қос.' },
  { n: 3, title: 'Күн тәртібін тексеру', desc: 'Қалған уақытты есепте, қатені тап.' },
] as const;

export type TaskVisual =
  | { type: 'dial24' }
  | { type: 'hours'; hours: number; extra?: number }
  | { type: 'clock'; time: string }
  | { type: 'interval'; from: string; to: string }
  | { type: 'bars'; items: Array<{ label: string; minutes: number }>; total?: number }
  | { type: 'compare'; a: string; b: string }
  | { type: 'change'; label: string; from: number; to: number };

interface Base {
  id: string;
  level: 1 | 2 | 3;
  topic: TaskTopic;
  question: string;
  visual: TaskVisual;
  hint: string;
  /** Қадамдық түсіндірме */
  steps: string[];
  explanation: string;
}
export interface NumberTask extends Base {
  type: 'number';
  answer: number;
  unit: string;
}
export interface HMTask extends Base {
  type: 'hm';
  answer: { hours: number; minutes: number };
}
export interface ChoiceTask extends Base {
  type: 'choice';
  options: string[];
  answer: number;
}
export type MathTask = NumberTask | HMTask | ChoiceTask;

export const TASKS: MathTask[] = [
  // 1-деңгей
  {
    id: 't1', level: 1, topic: 'conversion', type: 'number', unit: 'мин',
    question: '1 тәулік — 24 сағат. 1 тәулікте неше минут бар?',
    visual: { type: 'dial24' },
    answer: 1440,
    hint: '1 сағат = 60 минут. 24 сағатты 60-қа көбейт.',
    steps: ['1 сағатта 60 минут бар.', '24 сағат: 24 × 60.', '24 × 60 = 1440.'],
    explanation: '24 × 60 = 1440. Демек, 1 тәулік = 1440 минут.',
  },
  {
    id: 't2', level: 1, topic: 'conversion', type: 'number', unit: 'мин',
    question: '2 сағат неше минут болады?',
    visual: { type: 'hours', hours: 2 },
    answer: 120,
    hint: 'Әр сағатта 60 минут бар.',
    steps: ['1-сағат: 60 минут.', '2-сағат: тағы 60 минут.', '60 + 60 = 120.'],
    explanation: '60 + 60 = 120. Демек, 2 сағат = 120 минут.',
  },
  {
    id: 't3', level: 1, topic: 'conversion', type: 'hm',
    question: '90 минут — неше сағат және неше минут?',
    visual: { type: 'hours', hours: 1, extra: 30 },
    answer: { hours: 1, minutes: 30 },
    hint: '90 минуттан 60 минутты (1 сағатты) бөліп ал.',
    steps: ['90 минуттан 60 минутты аламыз — бұл 1 сағат.', '90 − 60 = 30 минут қалды.', 'Жауабы: 1 сағат 30 минут.'],
    explanation: '90 − 60 = 30. Демек, 90 минут = 1 сағат 30 минут.',
  },
  {
    id: 't4', level: 1, topic: 'conversion', type: 'number', unit: 'мин',
    question: '1 сағат 15 минут — барлығы неше минут?',
    visual: { type: 'hours', hours: 1, extra: 15 },
    answer: 75,
    hint: 'Алдымен 1 сағатты минутқа айналдыр, сосын 15-ті қос.',
    steps: ['1 сағат = 60 минут.', '60 + 15 = 75.'],
    explanation: '60 + 15 = 75 минут.',
  },
  {
    id: 't5', level: 1, topic: 'clock', type: 'choice',
    question: 'Сағат қанша уақытты көрсетіп тұр?',
    visual: { type: 'clock', time: '04:30' },
    options: ['4:30', '6:20', '3:30'],
    answer: 0,
    hint: 'Қысқа тіл — сағатты, ұзын тіл — минутты көрсетеді.',
    steps: ['Ұзын тіл 6 санында тұр — бұл 30 минут.', 'Қысқа тіл 4 пен 5-тің ортасында — 4 сағаттан өтті.', 'Жауабы: 4:30.'],
    explanation: 'Ұзын тіл 6-да (30 минут), қысқа тіл 4 пен 5 арасында. Уақыт — 4:30.',
  },
  // 2-деңгей
  {
    id: 't6', level: 2, topic: 'interval', type: 'number', unit: 'мин',
    question: 'Оқушы 16:00-ден 16:45-ке дейін математикамен айналысты. Неше минут оқыды?',
    visual: { type: 'interval', from: '16:00', to: '16:45' },
    answer: 45,
    hint: 'Сағат бірдей (16), тек минуттарды салыстыр.',
    steps: ['Басы: 16:00, соңы: 16:45.', 'Сағат өзгерген жоқ.', '45 − 0 = 45 минут.'],
    explanation: '16:45 − 16:00 = 45 минут.',
  },
  {
    id: 't7', level: 2, topic: 'interval', type: 'number', unit: 'мин',
    question: 'Үзіліс 16:45-тен 17:00-ге дейін болды. Үзіліс неше минут?',
    visual: { type: 'interval', from: '16:45', to: '17:00' },
    answer: 15,
    hint: '17:00 дегеніміз 16:60. 60 − 45 = ?',
    steps: ['17:00 — бұл 16 сағат 60 минут.', '60 − 45 = 15.'],
    explanation: '16:45-тен 17:00-ге дейін 15 минут.',
  },
  {
    id: 't8', level: 2, topic: 'interval', type: 'number', unit: 'мин',
    question: 'Қозғалыс 16:30-да басталып, 17:15-те аяқталды. Неше минут?',
    visual: { type: 'interval', from: '16:30', to: '17:15' },
    answer: 45,
    hint: '16:30-дан 17:00-ге дейін 30 минут, одан кейін тағы 15 минут.',
    steps: ['16:30 → 17:00: 30 минут.', '17:00 → 17:15: 15 минут.', '30 + 15 = 45.'],
    explanation: '30 + 15 = 45 минут.',
  },
  {
    id: 't9', level: 2, topic: 'addition', type: 'number', unit: 'мин',
    question: 'Үй тапсырмасына 60 минут, кітап оқуға 20 минут кетті. Барлығы неше минут?',
    visual: { type: 'bars', items: [{ label: 'Үй тапсырмасы', minutes: 60 }, { label: 'Кітап оқу', minutes: 20 }] },
    answer: 80,
    hint: 'Екі уақытты қос.',
    steps: ['Үй тапсырмасы: 60 минут.', 'Кітап оқу: 20 минут.', '60 + 20 = 80.'],
    explanation: '60 + 20 = 80 минут.',
  },
  {
    id: 't10', level: 2, topic: 'addition', type: 'number', unit: 'мин',
    question: 'Жоспар: үй тапсырмасы 60 мин, кітап 20 мин, қозғалыс 30 мин, демалыс 30 мин. Барлығы неше минут?',
    visual: { type: 'bars', items: [{ label: 'Үй тапсырмасы', minutes: 60 }, { label: 'Кітап', minutes: 20 }, { label: 'Қозғалыс', minutes: 30 }, { label: 'Демалыс', minutes: 30 }] },
    answer: 140,
    hint: 'Біртіндеп қос: 60 + 20, сосын + 30, сосын тағы + 30.',
    steps: ['60 + 20 = 80.', '80 + 30 = 110.', '110 + 30 = 140.'],
    explanation: '60 + 20 + 30 + 30 = 140 минут.',
  },
  // 3-деңгей
  {
    id: 't11', level: 3, topic: 'remainder', type: 'number', unit: 'мин',
    question: '16:00-ден 19:00-ге дейін 180 минут бос уақыт бар. 140 минут жоспарланды. Неше минут қалды?',
    visual: { type: 'bars', items: [{ label: 'Жоспарланды', minutes: 140 }], total: 180 },
    answer: 40,
    hint: 'Барлық уақыттан жоспарланғанын азайт.',
    steps: ['Барлық уақыт: 180 минут.', 'Жоспарланды: 140 минут.', '180 − 140 = 40 минут қалды.'],
    explanation: '180 − 140 = 40 минут резерв қалады.',
  },
  {
    id: 't12', level: 3, topic: 'subtraction', type: 'number', unit: 'мин',
    question: 'Экран уақыты 90 минут еді, кейін 60 минут болды. Неше минутқа азайды?',
    visual: { type: 'change', label: 'Экран', from: 90, to: 60 },
    answer: 30,
    hint: 'Үлкен саннан кішісін азайт.',
    steps: ['Бұрын: 90 минут.', 'Кейін: 60 минут.', '90 − 60 = 30 минутқа азайды.'],
    explanation: '90 − 60 = 30 минутқа азайды.',
  },
  {
    id: 't13', level: 3, topic: 'comparison', type: 'choice',
    question: 'Қайсысы ұзақ: 1 сағат 10 минут па, әлде 75 минут па?',
    visual: { type: 'compare', a: '1 сағат 10 минут', b: '75 минут' },
    options: ['1 сағат 10 минут', '75 минут', 'Екеуі тең'],
    answer: 1,
    hint: '1 сағат 10 минутты минутқа айналдыр.',
    steps: ['1 сағат 10 минут = 60 + 10 = 70 минут.', '75 > 70.', '75 минут ұзағырақ.'],
    explanation: '1 сағат 10 минут = 70 минут. 75 > 70, сондықтан 75 минут ұзағырақ.',
  },
  {
    id: 't14', level: 3, topic: 'error', type: 'choice',
    question: 'Айым былай деді: «16:00–16:30 аралығы — 20 минут». Ол дұрыс айтты ма?',
    visual: { type: 'interval', from: '16:00', to: '16:30' },
    options: ['Иә, дұрыс', 'Жоқ, 30 минут', 'Жоқ, 40 минут'],
    answer: 1,
    hint: '16:30 − 16:00 = ?',
    steps: ['Басы: 16:00, соңы: 16:30.', '30 − 0 = 30 минут.', 'Айым «20 минут» деп қателесті.'],
    explanation: '16:00-ден 16:30-ға дейін 30 минут. Айым қателесті.',
  },
  {
    id: 't15', level: 3, topic: 'error', type: 'choice',
    question: 'Жоспарда: 30 + 30 + 60 + 20 = 150 минут деп жазылған. Қате қайда?',
    visual: { type: 'bars', items: [{ label: 'Демалыс', minutes: 30 }, { label: 'Қозғалыс', minutes: 30 }, { label: 'Үй тапсырмасы', minutes: 60 }, { label: 'Кітап', minutes: 20 }] },
    options: ['Қате жоқ', 'Қосынды 140 болуы керек', 'Қосынды 160 болуы керек'],
    answer: 1,
    hint: 'Қайта қосып шық: 30 + 30 = 60, 60 + 60 = ?, ...',
    steps: ['30 + 30 = 60.', '60 + 60 = 120.', '120 + 20 = 140.', '150 деп жазу — қате.'],
    explanation: '30 + 30 + 60 + 20 = 140 минут. 150 деп жазу — қате.',
  },
];

export type TaskAnswer = { kind: 'number'; value: string } | { kind: 'hm'; hours: string; minutes: string } | { kind: 'choice'; index: number | null };

const toInt = (s: string): number | null => {
  const t = s.trim();
  if (!/^\d{1,5}$/.test(t)) return null;
  return Number(t);
};

export type CheckStatus = 'correct' | 'wrong' | 'invalid';

/** Жауапты тексеру: бос немесе сан емес жауап — 'invalid' (талпыныс саналмайды). */
export function checkTask(task: MathTask, ans: TaskAnswer): CheckStatus {
  if (task.type === 'number' && ans.kind === 'number') {
    const v = toInt(ans.value);
    if (v === null) return 'invalid';
    return v === task.answer ? 'correct' : 'wrong';
  }
  if (task.type === 'hm' && ans.kind === 'hm') {
    if (ans.hours.trim() === '' && ans.minutes.trim() === '') return 'invalid';
    const h = toInt(ans.hours || '0');
    const m = toInt(ans.minutes || '0');
    if (h === null || m === null) return 'invalid';
    if (m > 59) return 'wrong';
    return h === task.answer.hours && m === task.answer.minutes ? 'correct' : 'wrong';
  }
  if (task.type === 'choice' && ans.kind === 'choice') {
    if (ans.index === null) return 'invalid';
    return ans.index === task.answer ? 'correct' : 'wrong';
  }
  return 'invalid';
}
