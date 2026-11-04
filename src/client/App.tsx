import { Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { ComponentGalleryPage } from './pages/ComponentGalleryPage'
import { DevDataPage } from './pages/DevDataPage'
import { HomePage } from './pages/HomePage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="dev/components" element={<ComponentGalleryPage />} />
        <Route path="dev/data/:table?" element={<DevDataPage />} />
      </Route>
    </Routes>
  )
}
