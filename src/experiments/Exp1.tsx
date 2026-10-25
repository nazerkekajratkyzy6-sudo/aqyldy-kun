import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExperimentShell, ParamRow } from './Shell';
import { ChartFrame, ChartTooltip, DataTable, axisProps, gridProps } from '../components/charts';
import { Formula, MinutesInput, Slider, Stat } from '../components/ui';
import { screenRemainder, screenSeries } from '../core/experiments';
import { C, METRIC_COLORS } from '../lib/palette';

const DEMO = { window: 180, homework: 60, reading: 20, movement: 30, screen: 60 };
type P = typeof DEMO;

export default function Exp1() {
  const [p, setP] = useState<P>(DEMO);
  const set = (k: keyof P) => (v: number) => setP((x) => ({ ...x, [k]: Math.max(0, v) }));
  const tasks = [p.homework, p.reading, p.movement];
  const r = screenRemainder(p.window, tasks, p.screen);
  const series = useMemo(() => screenSeries(p.window, tasks, 10), [p.window, p.homework, p.reading, p.movement]); // eslint-disable-line react-hooks/exhaustive-deps
  const atPlan = screenRemainder(p.window, tasks, 60);
  const atFact = screenRemainder(p.window, tasks, 90);
  const demo = JSON.stringify(p) === JSON.stringify(DEMO);

  const conclusion =
    r.remainder >= 0
      ? `Экран ${p.screen} мин болғанда қалған уақыт R = ${r.remainder} мин. Экранға ең көбі ${r.maxScreen} мин бөлуге болады; әр қосымша 10 минут экран резервті дәл 10 минутқа азайтады (R пен S кері тәуелді: R = ${p.window - r.tasks} − S).`
      : `Экран ${p.screen} мин болғанда уақыт ${r.deficit} минутқа жетпейді (R = ${r.remainder} мин). Жоспар орындалуы үшін экран уақыты ${r.maxScreen} минуттан аспауы керек.`;

  return (
    <ExperimentShell
      n={1}
      title="Экран уақыты және қалған уақыт"
      goal="Экран уақыты өзгергенде бос уақыт терезесіндегі қалған (резерв) уақыттың қалай өзгеретінін анықтау."
      demo={demo}
      source="зерттеу жұмысы, 2.2 (экран жоспары 60 мин, нақты 90 мин) және 2.3 (16:00–19:00, 180 мин)"
      initial={<DataTable head={['Шама', 'Мән']} rows={[['Бос уақыт терезесі W', '180 мин'], ['Үй тапсырмасы', '60 мин'], ['Кітап оқу', '20 мин'], ['Қозғалыс', '30 мин'], ['Экран: жоспар / нақты', '60 / 90 мин']]} />}
      params={
        <div className="divide-y divide-line">
          <ParamRow label="Терезе W">
            <MinutesInput label="Терезе" value={p.window} onChange={set('window')} max={600} compact />
          </ParamRow>
          <ParamRow label="Үй тапсырмасы" color={METRIC_COLORS.homework}>
            <MinutesInput label="Үй тапсырмасы" value={p.homework} onChange={set('homework')} compact />
          </ParamRow>
          <ParamRow label="Кітап оқу" color={METRIC_COLORS.reading}>
            <MinutesInput label="Кітап оқу" value={p.reading} onChange={set('reading')} compact />
          </ParamRow>
          <ParamRow label="Қозғалыс" color={METRIC_COLORS.movement}>
            <MinutesInput label="Қозғалыс" value={p.movement} onChange={set('movement')} compact />
          </ParamRow>
          <div className="pt-3">
            <ParamRow label={`Экран S = ${p.screen} мин`} color={METRIC_COLORS.screen}>
              <span />
            </ParamRow>
            <Slider value={p.screen} max={p.window} step={5} onChange={set('screen')} color={METRIC_COLORS.screen} label="Экран уақыты" valueText={`${p.screen} минут`} />
          </div>
        </div>
      }
      calc={
        <div className="space-y-3">
          <Formula label="Тапсырмалар қосындысы">ΣT = {tasks.join(' + ')} = {r.tasks} мин</Formula>
          <Formula label="Қалған уақыт">
            R = W − ΣT − S = {p.window} − {r.tasks} − {p.screen} = <b className={r.remainder < 0 ? 'text-danger' : 'text-teal'}>{r.remainder}</b> мин
          </Formula>
          <Formula label="Экранның шегі (R ≥ 0)">S ≤ W − ΣT = {p.window} − {r.tasks} = {r.maxScreen} мин</Formula>
        </div>
      }
      chart={
        <ChartFrame title="R(S): экран уақыты мен қалған уақыт" table={{ head: ['Экран S, мин', 'Қалған R, мин'], rows: series.map((x) => [x.screen, x.remainder]) }} height={250} note="Нүкте — қазіргі S; сұр аймақ — тапшылық (R < 0).">
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 10, right: 12, left: -10, bottom: 4 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="screen" type="number" domain={[0, p.window]} {...axisProps} unit=" мин" />
              <YAxis {...axisProps} />
              <ReferenceArea y1={Math.min(-1, ...series.map((s) => s.remainder))} y2={0} fill="#FDECEF" fillOpacity={0.6} />
              <ReferenceLine y={0} stroke={C.axis} />
              <Tooltip content={<ChartTooltip labelFormatter={(l) => `Экран: ${l} мин`} />} />
              <Line type="linear" dataKey="remainder" name="Қалған R" stroke={C.teal} strokeWidth={2} dot={false} isAnimationActive />
              <ReferenceDot x={p.screen} y={r.remainder} r={6} fill={r.remainder < 0 ? C.rose : C.teal} stroke="#fff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      }
      comparison={
        <div className="grid grid-cols-2 gap-2">
          <Stat label="S = 60 (жоспар)" value={atPlan.remainder} unit="мин" tone={atPlan.remainder < 0 ? 'danger' : 'teal'} hint="R мәні" />
          <Stat label="S = 90 (нақты)" value={atFact.remainder} unit="мин" tone={atFact.remainder < 0 ? 'danger' : 'teal'} hint="R мәні" />
          <div className="col-span-2 text-sm text-ink-2">Айырма: {atFact.remainder} − ({atPlan.remainder}) = {atFact.remainder - atPlan.remainder} мин. Экран 30 минутқа артса, резерв дәл 30 минутқа азаяды.</div>
        </div>
      }
      conclusion={conclusion}
      snapshot={() => ({ params: p, results: { tasks: r.tasks, remainder: r.remainder, maxScreen: r.maxScreen } })}
      onReset={() => setP(DEMO)}
      onLoad={(x) => setP({ ...DEMO, ...(x as Partial<P>) })}
    />
  );
}
