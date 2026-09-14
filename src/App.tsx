import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AlertsPage } from '@/features/alerts/AlertsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { BranchesPage } from '@/features/branches/BranchesPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EquipmentDetailPage } from '@/features/equipment/EquipmentDetailPage'
import { LineDetailPage } from '@/features/lines/LineDetailPage'
import { LinesPage } from '@/features/lines/LinesPage'
import { LocationsPage } from '@/features/locations/LocationsPage'
import { MachineDetailPage } from '@/features/machines/MachineDetailPage'
import { PartDetailPage } from '@/features/parts/PartDetailPage'
import { PartsPage } from '@/features/parts/PartsPage'
import { PartStockDetailPage } from '@/features/part-stocks/PartStockDetailPage'
import { PartStocksPage } from '@/features/part-stocks/PartStocksPage'
import { SuppliersPage } from '@/features/suppliers/SuppliersPage'
import { MyTasksPage } from '@/features/tasks/MyTasksPage'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="parts" element={<PartsPage />} />
            <Route path="parts/:id" element={<PartDetailPage />} />
            <Route path="stock" element={<PartStocksPage />} />
            <Route path="stock/:id" element={<PartStockDetailPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="lines" element={<LinesPage />} />
            <Route path="lines/:id" element={<LineDetailPage />} />
            <Route path="machines/:id" element={<MachineDetailPage />} />
            <Route path="equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="my-tasks" element={<MyTasksPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
