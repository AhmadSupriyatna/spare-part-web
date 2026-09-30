import { PartQrPrintSection } from '@/features/breakdown/PartQrPrintSection'
import { Fp3QrPrintSection } from '@/features/fp3/Fp3QrPrintSection'
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
        description="QR Part untuk melaporkan kejadian penggantian, QR Line untuk mencatat jam operasional, QR Mesin untuk membuka Monitoring Life Time Mesin, atau QR FP3 untuk mengajukan Formulir Permintaan Perbaikan dan Pembuatan — sistem otomatis menentukan apakah event Part termasuk Failure atau Breakdown berdasarkan Replacement Strategy-nya."
      />

      <Tabs defaultValue="part">
        <TabsList className="print:hidden">
          <TabsTrigger value="part">Part</TabsTrigger>
          <TabsTrigger value="line">Line (Jam Operasional)</TabsTrigger>
          <TabsTrigger value="machine">Mesin (Monitoring)</TabsTrigger>
          <TabsTrigger value="fp3">FP3 (Permintaan)</TabsTrigger>
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
        <TabsContent value="fp3" className="mt-4">
          <Fp3QrPrintSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
