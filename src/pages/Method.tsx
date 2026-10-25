import { useState } from 'react';
import { BookMarked, ClipboardCheck, Save, ShieldCheck, Workflow, AlertTriangle } from 'lucide-react';
import { Page } from '../components/Layout';
import { Button, Card, CardHeader, Field, SectionTitle, inputCls } from '../components/ui';
import { PROJECT } from '../data/research';
import { useAppData } from '../store/AppData';

export default function Method() {
  const { author, setAuthor, toast } = useAppData();
  const [form, setForm] = useState(author);
  return (
    <Page>
      <SectionTitle eyebrow="Әдістеме" title="Зерттеу әдістемесі және хаттама" lead={PROJECT.fullTitle} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Зерттеу сұрағы, міндеттер" icon={<BookMarked size={18} />} />
          <div className="space-y-3 p-5 text-[15px] leading-relaxed text-ink-2">
            <p>
              <b className="text-ink">Сұрақ:</b> {PROJECT.question}
            </p>
            <p>
              <b className="text-ink">Болжам:</b> {PROJECT.hypothesis}
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {PROJECT.tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </Card>
        <Card>
          <CardHeader title="«Ақылды күн тәртібі» моделі: 6 қадам" icon={<Workflow size={18} />} />
          <ol className="list-decimal space-y-1.5 py-4 pl-10 pr-5 text-[15px] text-ink-2">
            {PROJECT.modelSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="px-5 pb-5 text-sm text-ink-3">Бос уақыт = Қолжетімді уақыт − міндетті уақыт − жоспарланған пайдалы уақыт.</p>
        </Card>
        <Card>
          <CardHeader title="10 күндік эксперименттік хаттама" icon={<ClipboardCheck size={18} />} />
          <div className="space-y-2 p-5 text-[15px] leading-relaxed text-ink-2">
            <p>1–5 күн: оқушы күнін өз бетімен жоспарлайды. 6–10 күн: жоспарды алгоритмдік көмекшімен құрады. Екі кезеңде де бірдей көрсеткіштер жазылады: үй тапсырмасы, экран, кітап, қозғалыс (жоспар және факт), жоспардан тыс уақыт.</p>
            <p>Оқу және демалыс күндері бөлек белгіленеді. Талдауда кезеңдер «Өз бетімен ↔ көмекшімен» әдісімен салыстырылады: орташа мән, айырма және пайыздық өзгеріс.</p>
            <p className="flex gap-2 rounded-xl border border-amber/30 bg-amber-50 px-3 py-2 text-sm text-ink">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" /> Бір баланың бақылауы ЖИ-дің әмбебап тиімділігін дәлелдемейді. Нақты қорытынды үшін бақылауды ұзақ мерзімде және бірнеше оқушымен жүргізу қажет.
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Этика және қауіпсіздік" icon={<ShieldCheck size={18} />} />
          <ul className="space-y-1.5 p-5 text-[15px] text-ink-2">
            {PROJECT.safety.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                {s}
              </li>
            ))}
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
              Нақты баланың деректері жарияланбайды: олар тек осы құрылғыда сақталады.
            </li>
          </ul>
        </Card>
        <Card>
          <CardHeader title="Шектеулер және ұсыныстар" />
          <div className="grid gap-4 p-5 text-[15px] text-ink-2 sm:grid-cols-2">
            <div>
              <div className="mb-1 font-semibold text-ink">Шектеулер</div>
              <ul className="list-disc space-y-1 pl-5">
                {PROJECT.limitations.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 font-semibold text-ink">Ұсыныстар</div>
              <ul className="list-disc space-y-1 pl-5">
                {PROJECT.recommendations.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Пайдаланылған әдебиеттер" />
          <ol className="list-decimal space-y-1.5 py-4 pl-10 pr-5 text-[15px] text-ink-2">
            {PROJECT.references.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Жоба авторы (есеп пен қорғау режимінде көрсетіледі)" icon={<Save size={18} />} />
          <form
            className="grid gap-4 p-5 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              setAuthor(form);
              toast('Сақталды');
            }}
          >
            <Field label="Оқушы" htmlFor="a-st">
              <input id="a-st" className={inputCls} value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} />
            </Field>
            <Field label="Сыныбы" htmlFor="a-gr">
              <input id="a-gr" className={inputCls} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
            </Field>
            <Field label="Ғылыми жетекші" htmlFor="a-sv">
              <input id="a-sv" className={inputCls} value={form.supervisor} onChange={(e) => setForm({ ...form, supervisor: e.target.value })} />
            </Field>
            <div className="sm:col-span-3">
              <Button type="submit" variant="primary">
                Сақтау
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Page>
  );
}
