import { useCallback, useEffect, useState } from 'react';
import { EXAMPLE_DAY, emptyDay, type ChildBlock, type DayPlan, type HelperSettings, DEFAULT_HELPER_SETTINGS } from '../core/kid';
import { kvGet, kvSet } from '../store/db';

export interface StoredDay {
  plan: DayPlan;
  example: boolean;
}

/** «Менің күнім» жоспары — IndexedDB-де сақталады, бірнеше бөлім ортақ пайдаланады. */
export function useKidDay() {
  const [state, setState] = useState<StoredDay>({ plan: EXAMPLE_DAY, example: true });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    kvGet<StoredDay>('kid.myday').then((v) => {
      if (v?.plan) setState({ plan: { ...emptyDay(), ...v.plan }, example: !!v.example });
      setLoaded(true);
    });
  }, []);
  const save = useCallback((s: StoredDay) => {
    setState(s);
    void kvSet('kid.myday', s);
  }, []);
  const setPlan = useCallback((plan: DayPlan) => save({ plan, example: false }), [save]);
  const reset = useCallback((to: 'example' | 'empty') => save(to === 'example' ? { plan: EXAMPLE_DAY, example: true } : { plan: emptyDay(), example: false }), [save]);
  return { plan: state.plan, example: state.example, setPlan, reset, loaded };
}

export interface HelperState {
  windowStart: number;
  windowEnd: number;
  blocks: ChildBlock[];
  settings: HelperSettings;
  example: boolean;
}

/**
 * Көмекшінің мысал жоспары (ҮЛГІ): 16:00–19:00 терезесі мен тапсырмалар зерттеу жұмысының 2.3-бөлімінен;
 * басталу уақыттары — бала жазуы мүмкін мысал (кітап оқу үй тапсырмасымен қабаттасады).
 */
export function exampleHelper(): HelperState {
  return {
    windowStart: 960,
    windowEnd: 1140,
    settings: DEFAULT_HELPER_SETTINGS,
    example: true,
    blocks: [
      { id: 'b-hw', activity: 'homework', title: 'Үй тапсырмасы', start: 960, duration: 60, fixed: false },
      { id: 'b-rd', activity: 'reading', title: 'Кітап оқу', start: 1005, duration: 20, fixed: false },
      { id: 'b-mv', activity: 'movement', title: 'Қозғалыс', start: 1050, duration: 30, fixed: false },
      { id: 'b-rs', activity: 'rest', title: 'Демалыс', start: 1095, duration: 30, fixed: false },
    ],
  };
}

export function useHelperPlan(key = 'kid.helper') {
  const [state, setState] = useState<HelperState>(exampleHelper);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    kvGet<HelperState>(key).then((v) => {
      if (v?.blocks) setState(v);
      setLoaded(true);
    });
  }, [key]);
  const save = useCallback(
    (s: HelperState) => {
      setState(s);
      void kvSet(key, s);
    },
    [key],
  );
  return { state, save, loaded };
}
