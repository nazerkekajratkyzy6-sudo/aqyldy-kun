import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExperimentShell } from './Shell';
import { AssistantWorkbench, demoAssistantState, type AssistantState } from '../components/AssistantWorkbench';
import { ChartFrame, ChartTooltip, axisProps, gridProps } from '../components/charts';
import { Formula } from '../components/ui';
import type { ScheduleStats } from '../core/scheduler';
import { FACT_COLOR, PLAN_COLOR } from '../lib/palette';
import { kvSet } from '../store/db';

export default function Exp5() {
  const [res, setRes] = useState<{ state: AssistantState; ok: boolean; before: ScheduleStats; after: ScheduleStats } | null>(null);
  const [key, setKey] = useState(0);
  const demo = !res || JSON.stringify(res.state) === JSON.stringify(demoAssistantState());
  const b = res?.before;
  const a = res?.after;
  const data = b && a ? [
    { m: 'Қабаттасу, мин', own: b.conflictMinutes, ai: a.conflictMinutes },
    { m: 'Шектен тыс, мин', own: b.overflow, ai: a.overflow },
    { m: 'Резерв, мин', own: b.reserve, ai: a.reserve },
    { m: 'Үзіліс, мин', own: b.breaks, ai: a.breaks },
  ] : [];

  const conclusion = !b || !a
    ? 'Нәтиже есептелмеді: кіріс деректерді тексеріңіз.'
    : `Өз жоспарында ${b.conflicts} қабаттасу (${b.conflictMinutes} мин) және ${b.overflow} мин шектен тыс уақыт бар; көмекші ұсынысында — ${a.conflicts} қабаттасу және ${a.overflow} мин. Резерв: ${b.reserve} → ${a.reserve} мин, үзіліс: ${b.breaks} → ${a.breaks} мин. ${res!.ok ? 'Көмекші жоспары барлық математикалық тексеруден өтті.' : 'Көмекші жоспарының кей тексерулері өтпеді — себебін қараңыз.'} Соңғы шешімді оқушы өзі қабылдайды.`;

  return (
    <>
    <ExperimentShell
      n={5}
      title="Өз жоспары және көмекші ұсынысы"
      goal="Оқушының өз ретімен құрған жоспарын алгоритмдік көмекші ұсынысымен салыстыру: қабаттасу, шектен шығу, резерв, үзіліс."
      demo={demo}
      source="зерттеу жұмысы, 2.3 (16:00–19:00 терезесі және тапсырмалар); резерв, үзіліс параметрлері — өзгертілетін модель параметрлері"
      initial={<p className="text-sm text-ink-2">Терезе 16:00–19:00; үй тапсырмасы 60, кітап 20, қозғалыс 30, демалыс 30 мин. «Өз жоспары» — тапсырмалар тізімдегі ретпен қатарынан қойылады.</p>}
      params={<p className="text-sm text-ink-2">Төмендегі жұмыс алаңында тапсырмаларды, түрін, басымдығын, бекітілген уақытты, резерв пен үзілісті өзгертіңіз — барлық есеп бірден жаңарады.</p>}
      calc={
        b && a ? (
          <div className="space-y-2">
            <Formula label="Өз жоспары">резерв {b.reserve} мин · қабаттасу {b.conflictMinutes} мин · шектен тыс {b.overflow} мин</Formula>
            <Formula label="Көмекші">резерв {a.reserve} мин · қабаттасу {a.conflictMinutes} мин · шектен тыс {a.overflow} мин</Formula>
            <Formula label="Айырма (көмекші − өз)">резерв {a.reserve - b.reserve >= 0 ? '+' : ''}{a.reserve - b.reserve} мин · үзіліс {a.breaks - b.breaks >= 0 ? '+' : ''}{a.breaks - b.breaks} мин</Formula>
          </div>
        ) : (
          <p className="text-sm text-ink-3">Есептеу жүріп жатыр…</p>
        )
      }
      chart={
        <ChartFrame
          title="Өз жоспары мен көмекші ұсынысы"
          legend={[
            { color: PLAN_COLOR, label: 'Өз жоспары' },
            { color: FACT_COLOR, label: 'Көмекші' },
          ]}
          table={{ head: ['Көрсеткіш', 'Өз жоспары', 'Көмекші'], rows: data.map((d) => [d.m, d.own, d.ai]) }}
          height={230}
        >
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={2}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="m" {...axisProps} interval={0} fontSize={11} />
              <YAxis {...axisProps} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} />
              <Bar dataKey="own" name="Өз жоспары" fill={PLAN_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="ai" name="Көмекші" fill={FACT_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      }
      comparison={<p className="text-sm text-ink-2">Толық «дейін/кейін» уақыт сызықтары, әр ауыстырудың себебі және тексеру — төмендегі жұмыс алаңында.</p>}
      conclusion={conclusion}
      snapshot={() => ({ params: (res?.state ?? {}) as unknown as Record<string, unknown>, results: { before: b, after: a, ok: res?.ok } })}
      onReset={async () => {
        await kvSet('exp5.current', demoAssistantState());
        setKey((k) => k + 1);
      }}
      onLoad={async (x) => {
        if (Array.isArray((x as unknown as AssistantState).tasks)) {
          await kvSet('exp5.current', x);
          setKey((k) => k + 1);
        }
      }}
    />
    <div className="mt-6">
      <AssistantWorkbench key={key} storageKey="exp5.current" compact onResult={setRes} />
    </div>
    </>
  );
}

