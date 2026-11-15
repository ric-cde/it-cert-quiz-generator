import { Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { ComponentGalleryPage } from './pages/gallery/ComponentGalleryPage'
import { DevDataPage } from './pages/DevDataPage'
import { HomePage } from './pages/HomePage'
import { ImportPage } from './pages/import/ImportPage'
import { QuestionViewerPage } from './pages/QuestionViewerPage'
import { QuizPage } from './pages/QuizPage'
import { ReviewPage } from './pages/ReviewPage'
import { TakeExamPage } from './pages/TakeExamPage'
import { FeaturesProvider } from './lib/features'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  return (
    <FeaturesProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="exam/:id" element={<TakeExamPage />} />
          <Route path="quiz/:id" element={<QuizPage />} />
          <Route path="dev/components" element={<ComponentGalleryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="dev/data/:table?" element={<DevDataPage />} />
          <Route path="dev/questions" element={<QuestionViewerPage />} />
        </Route>
      </Routes>
    </FeaturesProvider>
  )
}
