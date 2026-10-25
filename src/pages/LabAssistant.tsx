import { Page } from '../components/Layout';
import { AssistantWorkbench } from '../components/AssistantWorkbench';
import { DataTable } from '../components/charts';
import { Card, CardHeader, CheckRow, DataBadge, Formula, SectionTitle } from '../components/ui';
import { PROJECT, SAMPLE_AI_TABLE } from '../data/research';
import { parseHM, durationBetween } from '../core/time';
import { ListOrdered, MessageSquareQuote, ScrollText } from 'lucide-react';

const RULES = [
  'Бекітілген блоктар (үйірме, мектеп т.б.) орнынан қозғалмайды.',
  'Ұзақ оқу тапсырмасы берілген шектен аспайтын қысқа блоктарға бөлінеді.',
  'Әр оқу блогынан кейін үзіліс қойылады.',
  'Ойлау жүктемесі бар әрекеттер жеңіл әрекеттермен кезектеседі; әр топ ішінде басымдығы жоғары бірінші.',
  'Экран уақыты міндетті әрекеттерден кейін қойылады.',
  'Уақыт жетпесе: алдымен төмен басымдықты икемді әрекеттер (экран, басқа) қысқартылады, содан кейін ғана тапсырма шығарылады.',
  'Қалған уақыт — резерв; ол берілген ең аз мәннен кем болмауы керек.',
];

export default function LabAssistant() {
  const rows = SAMPLE_AI_TABLE.map((r) => ({ ...r, calc: durationBetween(parseHM(r.start)!, parseHM(r.end)!) }));
  const total = rows.reduce((s, r) => s + r.calc, 0);
  return (
    <Page>
      <SectionTitle
        eyebrow="4-зертхана"
        title="ЖИ-көмекші: алгоритмдік жоспарлаушы"
        lead="Бұл көмекші алдын ала белгіленген математикалық ережелермен жұмыс істейді: бекітілген блоктарды сақтайды, қалғандарын орналастырады, резерв пен үзілісті ескереді және нәтижені тексереді. Ол генеративті ЖИ емес; тілдік модель тек жеке серверлік кеңейту ретінде қосылады."
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Алгоритм ережелері" icon={<ListOrdered size={18} />} />
          <ol className="list-decimal space-y-1.5 py-4 pl-10 pr-5 text-sm leading-relaxed text-ink-2">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </Card>
        <Card>
          <CardHeader title="Зерттеу жұмысындағы ЖИ ұсынысын тексеру (2.3)" icon={<ScrollText size={18} />} actions={<DataBadge kind="demo" />} />
          <div className="p-4">
            <DataTable head={['Әрекет', 'Уақыт', 'Жазылған', 'Есептелген']} rows={rows.map((r) => [r.title, `${r.start}–${r.end}`, `${r.minutes} мин`, `${r.calc} мин`])} />
            <ul className="mt-2">
              <CheckRow ok={rows.every((r) => r.calc === r.minutes)} label="Әр аралықтың ұзақтығы дұрыс жазылған" />
              <CheckRow ok={total === 180} label="Қосынды 180 минутқа тең" detail={`${rows.map((r) => r.calc).join(' + ')} = ${total} мин`} />
            </ul>
            <Formula className="mt-2" label="Жоспарланған уақыт пен резерв">
              60 + 20 + 30 + 30 = 140 мин; 180 − 140 = 40 мин резерв
            </Formula>
          </div>
        </Card>
      </div>

      <AssistantWorkbench />

      <Card className="mt-6">
        <CardHeader title="ЖИ-ге арналған қауіпсіз сұраныс үлгісі (Қосымша 2)" icon={<MessageSquareQuote size={18} />} />
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <blockquote className="rounded-xl border-l-4 border-brand bg-brand-50 px-4 py-3 text-[15px] leading-relaxed">{PROJECT.safePrompt}</blockquote>
          <ul className="space-y-1.5 text-sm text-ink-2">
            {PROJECT.safety.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </Page>
  );
}
