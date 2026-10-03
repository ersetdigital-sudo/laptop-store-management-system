'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Phone, Loader2 } from 'lucide-react'

interface Supplier {
  supplier_name: string
  supplier_phone: string | null
}

interface SupplierAutocompleteProps {
  nama: string
  phone: string
  onNamaChange: (val: string) => void
  onPhoneChange: (val: string) => void
  onSupplierSelect: (supplier: Supplier) => void
}

/**
 * Autocomplete untuk field supplier di form kwitansi.
 * Mencari supplier yang sudah pernah tersimpan di tabel supplier_receipts.
 * Saat user memilih supplier, nama & no. telp auto-fill.
 */
export function SupplierAutocomplete({
  nama,
  phone,
  onNamaChange,
  onPhoneChange,
  onSupplierSelect,
}: SupplierAutocompleteProps) {
  const [results, setResults] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeField, setActiveField] = useState<'nama' | 'phone' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchSuppliers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const { data } = await supabase
        .from('supplier_receipts')
        .select('supplier_name, supplier_phone')
        .or(`supplier_name.ilike.%${q}%,supplier_phone.ilike.%${q}%`)
        .limit(50)

      // Deduplicate by supplier_name (keep first phone found)
      const seen = new Set<string>()
      const unique: Supplier[] = []
      for (const row of data || []) {
        const key = row.supplier_name.toLowerCase().trim()
        if (!seen.has(key) && row.supplier_name?.trim()) {
          seen.add(key)
          unique.push({ supplier_name: row.supplier_name, supplier_phone: row.supplier_phone || '' })
        }
      }
      setResults(unique.slice(0, 10))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string, field: 'nama' | 'phone') => {
    setActiveField(field)
    if (field === 'nama') onNamaChange(value)
    else onPhoneChange(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchSuppliers(value)
      setShowDropdown(true)
    }, 300)
  }

  const handleSelect = (supplier: Supplier) => {
    onSupplierSelect(supplier)
    setShowDropdown(false)
    setResults([])
  }

  const handleFocus = (field: 'nama' | 'phone') => {
    setActiveField(field)
    const val = field === 'nama' ? nama : phone
    if (val.length >= 2) {
      searchSuppliers(val)
      setShowDropdown(true)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" ref={dropdownRef}>
      {/* Nama Supplier */}
      <div className="relative">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Nama Supplier <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            required
            value={nama}
            onChange={e => handleInputChange(e.target.value, 'nama')}
            onFocus={() => handleFocus('nama')}
            placeholder="PT Maju Jaya Komputer"
            className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          {loading && activeField === 'nama' && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {showDropdown && activeField === 'nama' && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
            {results.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
              >
                <p className="text-sm font-medium text-foreground">{s.supplier_name}</p>
                {s.supplier_phone && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Phone size={10} className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-mono">{s.supplier_phone}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* No. HP Supplier */}
      <div className="relative">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          No. HP Supplier
        </label>
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={phone}
            onChange={e => handleInputChange(e.target.value, 'phone')}
            onFocus={() => handleFocus('phone')}
            placeholder="08xxxxxxxxxx"
            className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          {loading && activeField === 'phone' && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {showDropdown && activeField === 'phone' && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
            {results.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
              >
                <p className="text-sm font-medium text-foreground">{s.supplier_name}</p>
                {s.supplier_phone && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Phone size={10} className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-mono">{s.supplier_phone}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
