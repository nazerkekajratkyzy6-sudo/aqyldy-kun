import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { Layout, Page } from './components/Layout';
import { AppDataProvider } from './store/AppData';
import KidHome from './kid/KidHome';

// Artifact/статикалық алдын ала қарау үшін: VITE_HASH_ROUTER=1 болса, HashRouter қолданылады
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter;

/* Оқушы бөлімдері */
const MyDay = lazy(() => import('./kid/MyDay'));
const ExperimentsHub = lazy(() => import('./kid/experiments').then((m) => ({ default: m.ExperimentsHub })));
const ExperimentPage = lazy(() => import('./kid/experiments').then((m) => ({ default: m.ExperimentPage })));
const Helper = lazy(() => import('./kid/Helper'));
const MathPractice = lazy(() => import('./kid/MathPractice'));
const MyResearch = lazy(() => import('./kid/MyResearch'));
const Results = lazy(() => import('./kid/Results'));
const Show = lazy(() => import('./kid/Show'));

/* Ересектерге арналған толық зертхана */
const TeacherHome = lazy(() => import('./pages/Home'));
const Lab1440 = lazy(() => import('./pages/Lab1440'));
const LabConstructor = lazy(() => import('./pages/LabConstructor'));
const LabExperiments = lazy(() => import('./pages/LabExperiments'));
const LabAssistant = lazy(() => import('./pages/LabAssistant'));
const LabTasks = lazy(() => import('./pages/LabTasks'));
const LabDiary = lazy(() => import('./pages/LabDiary'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Method = lazy(() => import('./pages/Method'));
const Defense = lazy(() => import('./pages/Defense'));

function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-soft-2" />
      <div className="mt-6 h-80 animate-pulse rounded-3xl bg-soft" />
    </div>
  );
}

function NotFound() {
  return (
    <Page>
      <h1 className="font-display text-3xl font-semibold">Бет табылмады</h1>
      <Link to="/" className="mt-4 inline-block text-lg font-semibold text-brand underline">
        Басты бетке оралу
      </Link>
    </Page>
  );
}

const S = ({ children }: { children: React.ReactNode }) => <Suspense fallback={<Loading />}>{children}</Suspense>;

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppDataProvider>
        <Router>
          <Routes>
            <Route path="/" element={<KidHome />} />
            <Route path="/my-day" element={<S><MyDay /></S>} />
            <Route path="/experiments" element={<S><ExperimentsHub /></S>} />
            <Route path="/experiments/:n" element={<S><ExperimentPage /></S>} />
            <Route path="/helper" element={<S><Helper /></S>} />
            <Route path="/math" element={<S><MathPractice /></S>} />
            <Route path="/research" element={<S><MyResearch /></S>} />
            <Route path="/results" element={<S><Results /></S>} />
            <Route path="/show" element={<S><Show /></S>} />
            <Route path="/teacher/defense" element={<S><Defense /></S>} />
            {/* ескі сілтемелер */}
            <Route path="/defense" element={<Navigate to="/show" replace />} />
            <Route path="/analytics" element={<Navigate to="/results" replace />} />
            <Route path="/lab/*" element={<Navigate to="/teacher" replace />} />
            <Route
              path="/teacher/*"
              element={
                <Layout>
                  <S>
                    <Routes>
                      <Route index element={<TeacherHome />} />
                      <Route path="1440" element={<Lab1440 />} />
                      <Route path="constructor" element={<LabConstructor />} />
                      <Route path="experiments" element={<LabExperiments />} />
                      <Route path="assistant" element={<LabAssistant />} />
                      <Route path="tasks" element={<LabTasks />} />
                      <Route path="diary" element={<LabDiary />} />
                      <Route path="analytics" element={<Analytics />} />
                      <Route path="method" element={<Method />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </S>
                </Layout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AppDataProvider>
    </MotionConfig>
  );
}
