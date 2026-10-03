'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, Product } from '@/lib/supabase'

interface ProductAutocompleteProps {
  value: string
  onChange: (val: string) => void
  onSelect: (product: Product) => void
  placeholder?: string
  required?: boolean
  className?: string
}

/**
 * Autocomplete input yang mencari produk existing di database.
 * Saat user memilih produk dari dropdown, onSelect dipanggil dengan
 * data lengkap produk (name, specs, condition, buy_price, sell_price)
 * sehingga form bisa auto-fill tanpa perlu ngetik ulang.
 */
export function ProductAutocomplete({ value, onChange, onSelect, placeholder, required, className }: ProductAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${q.trim()}%`)
        .order('name')
        .limit(10)
      setSuggestions(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (val: string) => {
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchProducts(val)
      setShowDropdown(true)
    }, 200)
  }

  const handleFocus = () => {
    if (value.trim().length >= 2) {
      searchProducts(value)
      setShowDropdown(true)
    }
  }

  const handleSelect = (product: Product) => {
    onChange(product.name)
    onSelect(product)
    setShowDropdown(false)
    setSuggestions([])
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        required={required}
        value={value}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className || 'h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20'}
      />
      {loading && (
        <span className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-muted border-t-primary" />
      )}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map(product => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleSelect(product)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
            >
              <p className="font-medium text-foreground">{product.name}</p>
              {product.specs && <p className="text-[11px] text-muted-foreground mt-0.5">{product.specs}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
