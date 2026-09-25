import { CalendarClock, ClipboardCheck, Gauge } from 'lucide-react'

/**
 * What KIND of planned maintenance activity a Task Library recipe
 * represents — separate from schedule_type (how/when a Task actually gets
 * created from it) and from a Part's own replacement_strategy. See
 * StoreTaskLibraryRequest on the backend for why no category is paired
 * exclusively with one schedule_type: the descriptions below are guidance,
 * not a hard constraint.
 */
export const taskLibraryMaintenanceCategoryOptions = [
  {
    value: 'life_time',
    label: 'Life Time',
    description: 'Untuk penggantian berbasis umur pakai/jam operasi part.',
    scheduleHint: 'Nantinya dipicu otomatis dari jam operasi (Part Lifetime) — jadwal di sini opsional untuk saat ini.',
    icon: Gauge,
  },
  {
    value: 'scheduled_maintenance',
    label: 'Scheduled Maintenance',
    description: 'Untuk perawatan terjadwal secara berkala.',
    scheduleHint: 'Biasanya cocok dengan jadwal Kalender.',
    icon: CalendarClock,
  },
  {
    value: 'inspection',
    label: 'Inspection',
    description: 'Untuk memeriksa kondisi equipment/part — belum tentu berarti penggantian.',
    scheduleHint: 'Bisa manual (tanpa jadwal rutin) atau ikut jadwal Kalender.',
    icon: ClipboardCheck,
  },
] as const
