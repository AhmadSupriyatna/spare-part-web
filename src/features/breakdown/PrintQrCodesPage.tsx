import { PartQrPrintSection } from '@/features/breakdown/PartQrPrintSection'
import { LineQrPrintSection } from '@/features/lines/LineQrPrintSection'
import { PageHeader } from '@/components/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function PrintQrCodesPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        className="print:hidden"
        title="Cetak QR Code"
        description="QR Part untuk melaporkan kejadian penggantian — sistem otomatis menentukan apakah event termasuk Failure atau Breakdown berdasarkan Replacement Strategy part — atau QR Line untuk mencatat jam operasi per Line."
      />

      <Tabs defaultValue="part">
        <TabsList className="print:hidden">
          <TabsTrigger value="part">Part</TabsTrigger>
          <TabsTrigger value="line">Line (Jam Operasional)</TabsTrigger>
        </TabsList>
        <TabsContent value="part" className="mt-4">
          <PartQrPrintSection />
        </TabsContent>
        <TabsContent value="line" className="mt-4">
          <LineQrPrintSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
