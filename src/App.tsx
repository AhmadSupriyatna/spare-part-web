import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { PartDetailPage } from '@/features/parts/PartDetailPage'
import { PartsPage } from '@/features/parts/PartsPage'
import { PartStockDetailPage } from '@/features/part-stocks/PartStockDetailPage'
import { PartStocksPage } from '@/features/part-stocks/PartStocksPage'
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
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
