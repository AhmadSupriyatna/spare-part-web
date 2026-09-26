import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { ActivityLogPage } from '@/features/activity-log/ActivityLogPage'
import { AlertsPage } from '@/features/alerts/AlertsPage'
import { ApprovalPage } from '@/features/approval/ApprovalPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { BranchesPage } from '@/features/branches/BranchesPage'
import { BreakdownScanPage } from '@/features/breakdown/BreakdownScanPage'
import { PrintQrCodesPage } from '@/features/breakdown/PrintQrCodesPage'
import { BudgetsPage } from '@/features/budgets/BudgetsPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DatabaseBackupPage } from '@/features/database-backup/DatabaseBackupPage'
import { EquipmentDetailPage } from '@/features/equipment/EquipmentDetailPage'
import { LineHierarchyPage } from '@/features/lines/LineHierarchyPage'
import { LineRuntimeScanPage } from '@/features/lines/LineRuntimeScanPage'
import { LocationDetailPage } from '@/features/locations/LocationDetailPage'
import { LocationsPage } from '@/features/locations/LocationsPage'
import { PartDetailPage } from '@/features/parts/PartDetailPage'
import { PartsPage } from '@/features/parts/PartsPage'
import { PartStockDetailPage } from '@/features/part-stocks/PartStockDetailPage'
import { InventoryWorkspacePage } from '@/features/part-stocks/InventoryWorkspacePage'
import { StockInPage } from '@/features/part-stocks/StockInPage'
import { PartUnitScanPage } from '@/features/part-unit-actions/PartUnitScanPage'
import { PartUnitDetailPage } from '@/features/part-units/PartUnitDetailPage'
import { PrintRepairHistoryPage } from '@/features/part-repairs/PrintRepairHistoryPage'
import { MaintenancePage } from '@/features/pm/MaintenancePage'
import { PrintWoChecklistPage } from '@/features/pm/PrintWoChecklistPage'
import { PrintWoChecklistsPage } from '@/features/pm/PrintWoChecklistsPage'
import { CompanySettingsPage } from '@/features/settings/CompanySettingsPage'
import { SupplierDetailPage } from '@/features/suppliers/SupplierDetailPage'
import { SuppliersPage } from '@/features/suppliers/SuppliersPage'
import { TaskLibraryPage } from '@/features/task-libraries/TaskLibraryPage'
import { UnitsPage } from '@/features/units/UnitsPage'
import { UsersPage } from '@/features/users/UsersPage'
import { WorkspacePage } from '@/features/workspace/WorkspacePage'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Public breakdown QR-scan flow — no login, reachable straight from a printed QR code. */}
        <Route path="/breakdown/scan/:partId/:branchId" element={<BreakdownScanPage />} />

        {/* Public QR-per-unit flow — no login, reachable from a QR stuck on a specific part unit. */}
        <Route path="/part-units/:id/scan" element={<PartUnitScanPage />} />

        <Route element={<ProtectedRoute />}>
          {/* Requires login (any role) but deliberately outside AppLayout — a
              QR scan landing page is meant to be a quick in-and-out phone
              action, not a full app-shell page. */}
          <Route path="lines/:id/log-runtime" element={<LineRuntimeScanPage />} />

          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="parts" element={<PartsPage />} />
            <Route path="parts/:id" element={<PartDetailPage />} />
            <Route path="stock" element={<InventoryWorkspacePage />} />
            <Route path="stock/:id" element={<PartStockDetailPage />} />
            <Route path="stock-in" element={<StockInPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="locations/:id" element={<LocationDetailPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="lines" element={<LineHierarchyPage />} />
            <Route path="equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="approval" element={<ApprovalPage />} />
            <Route path="task-libraries" element={<TaskLibraryPage />} />
            <Route path="breakdown/print-qr" element={<PrintQrCodesPage />} />
            <Route path="settings/company" element={<CompanySettingsPage />} />
            <Route path="settings/units" element={<UnitsPage />} />
            <Route path="settings/users" element={<UsersPage />} />
            <Route path="settings/activity-log" element={<ActivityLogPage />} />
            <Route path="settings/backup" element={<DatabaseBackupPage />} />
            <Route path="part-units/:id" element={<PartUnitDetailPage />} />
            <Route path="pm/calendar" element={<MaintenancePage />} />
            <Route path="pm/tasks/print" element={<PrintWoChecklistsPage />} />
            <Route path="pm/tasks/:id/print" element={<PrintWoChecklistPage />} />
            <Route path="pm/repairs/print" element={<PrintRepairHistoryPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
