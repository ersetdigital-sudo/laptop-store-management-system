'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

interface MonthPickerProps {
  month: string
  year: string
}

export default function MonthPicker({ month, year }: MonthPickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleMonthChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set('m', value)
    router.push(`?${params.toString()}`)
  }

  const handleYearChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set('y', value)
    router.push(`?${params.toString()}`)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="flex items-center gap-2">
      <Select value={month} onValueChange={handleMonthChange}>
        <SelectTrigger
          className="w-[130px] h-10 rounded-xl bg-white border-[#E5E7EB] text-sm text-[#111827] font-medium"
        >
          <SelectValue placeholder="Pilih bulan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Kumulatif</SelectItem>
          {MONTHS.map((m, i) => (
            <SelectItem key={i} value={String(i)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={handleYearChange}>
        <SelectTrigger
          className="w-[90px] h-10 rounded-xl bg-white border-[#E5E7EB] text-sm text-[#111827] font-medium"
        >
          <SelectValue placeholder="Tahun" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
