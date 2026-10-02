import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { ActivityLogPage } from '@/features/activity-log/ActivityLogPage'
import { ApprovalPage } from '@/features/approval/ApprovalPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { BranchesPage } from '@/features/branches/BranchesPage'
import { BreakdownScanPage } from '@/features/breakdown/BreakdownScanPage'
import { PrintQrCodesPage } from '@/features/breakdown/PrintQrCodesPage'
import { BudgetsPage } from '@/features/budgets/BudgetsPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DatabaseBackupPage } from '@/features/database-backup/DatabaseBackupPage'
import { DepartmentsPage } from '@/features/departments/DepartmentsPage'
import { EquipmentDetailPage } from '@/features/equipment/EquipmentDetailPage'
import { Fp3ListPage } from '@/features/fp3/Fp3ListPage'
import { Fp3PrintPage } from '@/features/fp3/Fp3PrintPage'
import { Fp3RequestPage } from '@/features/fp3/Fp3RequestPage'
import { Fp3ScanPage } from '@/features/fp3/Fp3ScanPage'
import { LineHierarchyPage } from '@/features/lines/LineHierarchyPage'
import { LineReportsPage } from '@/features/lines/LineReportsPage'
import { LineRuntimeScanPage } from '@/features/lines/LineRuntimeScanPage'
import { PrintLineMonthlyReportPage } from '@/features/lines/PrintLineMonthlyReportPage'
import { PrintLineRuntimeReportPage } from '@/features/lines/PrintLineRuntimeReportPage'
import { LocationDetailPage } from '@/features/locations/LocationDetailPage'
import { LocationsPage } from '@/features/locations/LocationsPage'
import { MachineDetailPage } from '@/features/machines/MachineDetailPage'
import { MachineMonitoringPage } from '@/features/machines/MachineMonitoringPage'
import { MaintenanceReportScanPage } from '@/features/pm/MaintenanceReportScanPage'
import { PartDetailPage } from '@/features/parts/PartDetailPage'
import { KelolaStokPage } from '@/features/part-stocks/KelolaStokPage'
import { PartStockDetailPage } from '@/features/part-stocks/PartStockDetailPage'
import { StockLedgerPage } from '@/features/part-stocks/StockLedgerPage'
import { PartUnitScanPage } from '@/features/part-unit-actions/PartUnitScanPage'
import { PartUnitDetailPage } from '@/features/part-units/PartUnitDetailPage'
import { PrintRepairHistoryPage } from '@/features/part-repairs/PrintRepairHistoryPage'
import { MaintenancePage } from '@/features/pm/MaintenancePage'
import { PrintMaintenanceReportPage } from '@/features/pm/PrintMaintenanceReportPage'
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

        {/* Public QR-per-machine "Monitoring Life Time Mesin" flow — no login, reachable from a QR stuck on the machine. */}
        <Route path="/machines/scan/:machineId" element={<MachineMonitoringPage />} />

        {/* QR Validator for Laporan Pemeriksaan Mesin — no login, see MaintenanceReportScanPage. */}
        <Route path="/maintenance-report/scan" element={<MaintenanceReportScanPage />} />

        {/* Public "Ajukan FP3" flow — no login, one generic QR per branch (not tied to any machine/line). */}
        <Route path="/fp3/request/:branchId" element={<Fp3RequestPage />} />

        {/* QR Validator for Cetak FP3 — no login, see Fp3ScanPage. */}
        <Route path="/fp3/scan/:id" element={<Fp3ScanPage />} />

        <Route element={<ProtectedRoute />}>
          {/* Requires login (any role) but deliberately outside AppLayout — a
              QR scan landing page is meant to be a quick in-and-out phone
              action, not a full app-shell page. */}
          <Route path="lines/:id/log-runtime" element={<LineRuntimeScanPage />} />

          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="parts/:id" element={<PartDetailPage />} />
            <Route path="stock" element={<KelolaStokPage />} />
            <Route path="stock/ledger" element={<StockLedgerPage />} />
            <Route path="stock/:id" element={<PartStockDetailPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="locations/:id" element={<LocationDetailPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="lines" element={<LineHierarchyPage />} />
            <Route path="lines/report" element={<LineReportsPage />} />
            <Route path="lines/runtime-report/print" element={<PrintLineRuntimeReportPage />} />
            <Route path="lines/monthly-report/print" element={<PrintLineMonthlyReportPage />} />
            <Route path="equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="machines/:id" element={<MachineDetailPage />} />
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="fp3" element={<Fp3ListPage />} />
            <Route path="fp3/:id/print" element={<Fp3PrintPage />} />
            <Route path="approval" element={<ApprovalPage />} />
            <Route path="task-libraries" element={<TaskLibraryPage />} />
            <Route path="breakdown/print-qr" element={<PrintQrCodesPage />} />
            <Route path="settings/company" element={<CompanySettingsPage />} />
            <Route path="settings/units" element={<UnitsPage />} />
            <Route path="settings/departments" element={<DepartmentsPage />} />
            <Route path="settings/users" element={<UsersPage />} />
            <Route path="settings/activity-log" element={<ActivityLogPage />} />
            <Route path="settings/backup" element={<DatabaseBackupPage />} />
            <Route path="part-units/:id" element={<PartUnitDetailPage />} />
            <Route path="pm/calendar" element={<MaintenancePage />} />
            <Route path="pm/tasks/print" element={<PrintWoChecklistsPage />} />
            <Route path="pm/tasks/:id/print" element={<PrintWoChecklistPage />} />
            <Route path="pm/maintenance-report/print" element={<PrintMaintenanceReportPage />} />
            <Route path="pm/repairs/print" element={<PrintRepairHistoryPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
