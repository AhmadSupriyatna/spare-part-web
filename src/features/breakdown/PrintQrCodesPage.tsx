import { PartQrPrintSection } from '@/features/breakdown/PartQrPrintSection'
import { LineQrPrintSection } from '@/features/lines/LineQrPrintSection'
import { MachineQrPrintSection } from '@/features/machines/MachineQrPrintSection'
import { PageHeader } from '@/components/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function PrintQrCodesPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        className="print:hidden"
        title="Cetak QR Code"
        description="QR Part untuk melaporkan kejadian penggantian, QR Line untuk mencatat jam operasional, atau QR Mesin untuk membuka Monitoring Life Time Mesin — sistem otomatis menentukan apakah event Part termasuk Failure atau Breakdown berdasarkan Replacement Strategy-nya."
      />

      <Tabs defaultValue="part">
        <TabsList className="print:hidden">
          <TabsTrigger value="part">Part</TabsTrigger>
          <TabsTrigger value="line">Line (Jam Operasional)</TabsTrigger>
          <TabsTrigger value="machine">Mesin (Monitoring)</TabsTrigger>
        </TabsList>
        <TabsContent value="part" className="mt-4">
          <PartQrPrintSection />
        </TabsContent>
        <TabsContent value="line" className="mt-4">
          <LineQrPrintSection />
        </TabsContent>
        <TabsContent value="machine" className="mt-4">
          <MachineQrPrintSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
