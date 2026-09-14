import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AlertsPage } from '@/features/alerts/AlertsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { BranchesPage } from '@/features/branches/BranchesPage'
import { BreakdownApprovalBoardPage } from '@/features/breakdown/BreakdownApprovalBoardPage'
import { BreakdownScanPage } from '@/features/breakdown/BreakdownScanPage'
import { PrintQrCodesPage } from '@/features/breakdown/PrintQrCodesPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EquipmentDetailPage } from '@/features/equipment/EquipmentDetailPage'
import { LineHierarchyPage } from '@/features/lines/LineHierarchyPage'
import { LocationDetailPage } from '@/features/locations/LocationDetailPage'
import { LocationsPage } from '@/features/locations/LocationsPage'
import { PartDetailPage } from '@/features/parts/PartDetailPage'
import { PartsPage } from '@/features/parts/PartsPage'
import { PartStockDetailPage } from '@/features/part-stocks/PartStockDetailPage'
import { PartStocksPage } from '@/features/part-stocks/PartStocksPage'
import { PmCalendarPage } from '@/features/pm/PmCalendarPage'
import { PmLedgerPage } from '@/features/pm/PmLedgerPage'
import { PrintWoChecklistPage } from '@/features/pm/PrintWoChecklistPage'
import { CompanySettingsPage } from '@/features/settings/CompanySettingsPage'
import { SupplierDetailPage } from '@/features/suppliers/SupplierDetailPage'
import { SuppliersPage } from '@/features/suppliers/SuppliersPage'
import { TaskLibrariesPage } from '@/features/task-libraries/TaskLibrariesPage'
import { MyTasksPage } from '@/features/tasks/MyTasksPage'
import { UnitsPage } from '@/features/units/UnitsPage'
import { WorkOrdersPage } from '@/features/work-orders/WorkOrdersPage'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Public breakdown QR-scan flow — no login, reachable straight from a printed QR code. */}
        <Route path="/breakdown/scan/:partId/:branchId" element={<BreakdownScanPage />} />

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
            <Route path="suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="locations/:id" element={<LocationDetailPage />} />
            <Route path="lines" element={<LineHierarchyPage />} />
            <Route path="equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="my-tasks" element={<MyTasksPage />} />
            <Route path="breakdown/approvals" element={<BreakdownApprovalBoardPage />} />
            <Route path="breakdown/print-qr" element={<PrintQrCodesPage />} />
            <Route path="settings/company" element={<CompanySettingsPage />} />
            <Route path="settings/units" element={<UnitsPage />} />
            <Route path="work-orders" element={<WorkOrdersPage />} />
            <Route path="task-libraries" element={<TaskLibrariesPage />} />
            <Route path="pm/calendar" element={<PmCalendarPage />} />
            <Route path="pm/ledger" element={<PmLedgerPage />} />
            <Route path="pm/tasks/:id/print" element={<PrintWoChecklistPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
