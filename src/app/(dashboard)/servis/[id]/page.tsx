'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Service, Product } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft, Send, CheckCircle, Download, Edit, Plus, Trash2, Laptop } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { NotaServisPDF } from '@/components/pdf/nota-servis'
import { downloadPDF, sendWhatsAppPDF } from '@/components/pdf/utils'

export default function ServisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [service, setService] = useState<Service | null>(null)
  const [parts, setParts] = useState<{ product_id: string; name: string; quantity: number; price: number; buy_price: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [waLoading, setWaLoading] = useState(false)
  const [waResult, setWaResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [storeInfo, setStoreInfo] = useState({ storeName: 'Kasir POS', storeAddress: '', storePhone: '' })
  const [bankInfo, setBankInfo] = useState({ bankName: '', bankAccountNumber: '', bankAccountHolder: '' })
  const [showEditForm, setShowEditForm] = useState(false)

  useEffect(() => {
    if (params.id) fetchService(params.id as string)
    fetchStoreSettings()
  }, [params.id])

  async function fetchStoreSettings() {
    try {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['store_name', 'store_address', 'store_phone', 'bank_name', 'bank_account_number', 'bank_account_holder'])
      const map: Record<string, string> = {}
      data?.forEach(row => { map[row.key] = row.value })
      setStoreInfo({
        storeName: map.store_name || 'Kasir POS',
        storeAddress: map.store_address || '',
        storePhone: map.store_phone || '',
      })
      setBankInfo({
        bankName: map.bank_name || '',
        bankAccountNumber: map.bank_account_number || '',
        bankAccountHolder: map.bank_account_holder || '',
      })
    } catch (e) { console.error(e) }
  }

  async function fetchService(id: string) {
    try {
      const { data, error } = await supabase.from('services').select('*, service_parts(*, products(name))').eq('id', id).single()
      if (error) throw error
      setService(data)
      // Extract parts
      const serviceParts = (data as any).service_parts || []
      setParts(serviceParts.map((p: any) => ({
        product_id: p.product_id,
        name: p.products?.name || 'Sparepart',
        quantity: p.quantity,
        price: p.price,
        buy_price: p.buy_price || 0,
      })))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function markSelesai() {
    if (!service) return
    setUpdating(true)
    try {
      const { error } = await supabase.from('services').update({ status: 'selesai', date_out: new Date().toISOString() }).eq('id', service.id)
      if (error) throw error
      fetchService(service.id)
    } catch (e) { console.error(e) } finally { setUpdating(false) }
  }

  async function handleDownloadPDF() {
    if (!service) return
    setPdfLoading(true)
    try {
      const doc = NotaServisPDF({ service, parts, ...storeInfo, ...bankInfo })
      await downloadPDF(doc, `nota-${service.nota_number}.pdf`)
    } catch (e) {
      console.error('Gagal generate PDF:', e)
    } finally {
      setPdfLoading(false)
    }
  }

  // Status messages
  const statusMessages: Record<string, { intro: string; closing: string }> = {
    proses: {
      intro: 'Perangkat Anda saat ini sedang dalam proses pengerjaan oleh teknisi kami.',
      closing: 'Kami akan menghubungi Anda kembali setelah proses servis selesai.',
    },
    selesai: {
      intro: 'Kabar baik! Perangkat Anda telah selesai diservis dan siap diambil.',
      closing: 'Silakan ambil perangkat Anda di toko kami.\n\nTerima kasih telah mempercayakan servis perangkat Anda kepada kami. 🙏',
    },
    menunggu: {
      intro: 'Perangkat Anda sedang menunggu konfirmasi dari Anda.',
      closing: 'Silakan hubungi kami untuk konfirmasi.',
    },
    dibatalkan: {
      intro: 'Servis perangkat Anda telah dibatalkan.',
      closing: 'Silakan hubungi kami untuk informasi lebih lanjut.',
    },
  }

  function getWhatsAppMessage() {
    if (!service) return ''
    const tglMasuk = new Date(service.date_in).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    const sisa = service.total_fee - (service.dp_amount || 0)
    const status = statusMessages[service.status] || statusMessages.proses

    const message = [
      `📢 Halo ${service.customer_name},`,
      ``,
      status.intro,
      ``,
      `━━━━━━━━━━━━━━`,
      `📋 DETAIL SERVIS`,
      `* No. Nota: ${service.nota_number}`,
      `* Perangkat: ${service.device_type} ${service.device_brand || ''} ${service.device_model || ''}`.trim(),
      service.complaint ? `* Keluhan: ${service.complaint}` : null,
      `* Tindakan Servis: ${service.notes || ''}`,
      `* Tanggal Masuk: ${tglMasuk}`,
      `━━━━━━━━━━━━━━`,
      `💰 RINCIAN BIAYA`,
      ...parts.map(p => `* ${p.name} (x${p.quantity}): ${formatRupiah(p.price * p.quantity)}`),
      service.service_fee > 0 ? `* Jasa Servis: ${formatRupiah(service.service_fee)}` : null,
      `────────────────`,
      `Total Pembayaran: ${formatRupiah(service.total_fee)}`,
      service.dp_amount > 0 ? `DP/Uang Muka: ${formatRupiah(service.dp_amount)}` : null,
      service.dp_amount > 0 ? `Sisa Pembayaran: ${formatRupiah(sisa)}` : null,
      ``,
      service.garansi && service.garansi.toLowerCase() !== 'tanpa garansi' ? `🛡️ Garansi: ${service.garansi}` : null,
      ``,
      status.closing,
    ].filter(Boolean).join('\n')

    return message
  }

  async function handleKirimWhatsApp() {
    if (!service) return
    setWaLoading(true)
    setWaResult(null)
    try {
      const doc = NotaServisPDF({ service, parts, ...storeInfo, ...bankInfo })
      const lines = getWhatsAppMessage()

      const result = await sendWhatsAppPDF({
        document: doc,
        filename: `Nota-${service.nota_number}.pdf`,
        phone: service.customer_phone,
        message: lines,
      })

      if (result.success) {
        setWaResult({ ok: true, msg: 'Nota PDF berhasil dikirim ke WhatsApp!' })
      } else {
        const waUrl = `https://wa.me/${service.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(lines)}`
        window.open(waUrl, '_blank')
        setWaResult({ ok: false, msg: `Gagal kirim via API (${result.error}). Membuka WhatsApp Web...` })
      }
    } catch (e) {
      console.error('WhatsApp error:', e)
      setWaResult({ ok: false, msg: 'Terjadi kesalahan' })
    } finally {
      setWaLoading(false)
    }
  }

  async function handleKirimNotif() {
    if (!service) return
    setWaLoading(true)
    setWaResult(null)
    try {
      const lines = getWhatsAppMessage()

      // Kirim via API (sama seperti handleKirimWhatsApp, tapi tanpa PDF)
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: service.customer_phone,
          message: lines,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        setWaResult({ ok: true, msg: 'Notifikasi berhasil dikirim ke WhatsApp!' })
      } else {
        // Fallback: buka wa.me
        const waUrl = `https://wa.me/${service.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(lines)}`
        window.open(waUrl, '_blank')
        setWaResult({ ok: false, msg: `Gagal kirim via API (${result.error}). Membuka WhatsApp Web...` })
      }
    } catch (e) {
      console.error('WhatsApp error:', e)
      setWaResult({ ok: false, msg: 'Terjadi kesalahan' })
    } finally {
      setWaLoading(false)
    }
  }

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  if (loading) return <div className="flex items-center justify-center p-12"><div className="spinner" /></div>

  if (!service) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Data servis tidak ditemukan</p>
        <Link href="/servis" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">Kembali ke daftar servis</Link>
      </div>
    )
  }

  const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    selesai: 'success',
    proses: 'warning',
    menunggu: 'secondary',
    dibatalkan: 'destructive',
  }

  return (
    <div className="space-y-3">
      {/* ── Mobile Hero (wireframe: product-detail-sheet) ── */}
      <div className="relative -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:hidden">
        {/* Overlay header: back + edit */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            aria-label="Kembali"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-colors hover:bg-black/30 active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => setShowEditForm(true)}
            aria-label="Edit servis"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-95"
          >
            <Edit size={16} />
          </button>
        </div>

        {/* Hero section */}
        <div className="relative overflow-hidden rounded-b-[40px] bg-gradient-to-br from-primary via-primary/85 to-primary/60 px-5 pb-8 pt-16">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-white/5" />

          <div className="relative">
            {/* "Image" area */}
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 shadow-lg shadow-black/10 backdrop-blur-sm">
              <Laptop size={44} className="text-white" strokeWidth={1.5} />
            </div>

            <p className="text-center text-xs font-medium text-white/70">
              {service.device_type}{service.device_brand ? ` · ${service.device_brand}` : ''}{service.device_model ? ` ${service.device_model}` : ''}
            </p>
            <h1 className="mt-1 text-center text-lg font-bold tracking-tight text-white">
              {service.nota_number}
            </h1>
            <div className="mt-3 flex justify-center">
              <Badge variant={statusVariant[service.status] || 'secondary'} className="text-[10px] capitalize">
                {service.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop Header ── */}
      <div className="hidden items-center justify-between lg:flex">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.back()} variant="secondary" className="h-9 w-9 shrink-0 p-0">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-tight text-foreground">Detail Servis {service.nota_number}</h1>
            <p className="text-xs text-muted-foreground">Detail transaksi servis pelanggan</p>
          </div>
        </div>
        <Button onClick={() => setShowEditForm(true)} variant="outline" className="gap-2">
          <Edit size={14} />
          Edit
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Info */}
        <div className="space-y-3 lg:col-span-2">
          <Card className="shadow-card">
            <CardContent className="p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-foreground">Informasi Customer</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Nama</p>
                  <p className="text-sm font-semibold text-foreground">{service.customer_name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">No. WhatsApp</p>
                  <p className="text-sm font-semibold text-foreground">{service.customer_phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-foreground">Informasi Perangkat</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Jenis</p>
                  <p className="text-sm font-semibold text-foreground">{service.device_type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Merk</p>
                  <p className="text-sm font-semibold text-foreground">{service.device_brand || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Model</p>
                  <p className="text-sm font-semibold text-foreground">{service.device_model || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Kelengkapan</p>
                  <p className="text-sm font-semibold text-foreground">{service.kelengkapan || '-'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Keluhan</p>
                  <p className="text-sm font-semibold text-foreground">{service.complaint || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {service.notes && (
            <Card className="shadow-card">
              <CardContent className="p-4 sm:p-5">
                <h3 className="mb-2 text-sm font-bold text-foreground">Keterangan atau Tindakan</h3>
                <p className="text-sm text-muted-foreground">{service.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Sparepart yang Dipakai */}
          {parts.length > 0 && (
            <Card className="shadow-card">
              <CardContent className="p-4 sm:p-5">
                <h3 className="mb-3 text-sm font-bold text-foreground">Sparepart yang Dipakai</h3>
                <div className="space-y-2">
                  {parts.map((part, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary/50">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{part.name}</p>
                        <p className="text-[11px] text-muted-foreground">Qty: {part.quantity} x {formatRupiah(part.price)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-semibold text-foreground">{formatRupiah(part.price * part.quantity)}</p>
                        {part.buy_price > 0 && (
                          <p className="text-[10px] text-stone font-mono">modal: {formatRupiah(part.buy_price * part.quantity)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {parts.some(p => p.buy_price > 0) && (
                  <div className="mt-3 flex justify-between border-t border-border pt-2.5">
                    <span className="text-xs text-muted-foreground">Total Modal Sparepart (HPP)</span>
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                      {formatRupiah(parts.reduce((sum, p) => sum + (p.buy_price * p.quantity), 0))}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Status + Actions */}
        <div className="space-y-3">
          <Card className="shadow-card">
            <CardContent className="p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-foreground">Status & Biaya</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={statusVariant[service.status] || 'secondary'} className="text-[10px] capitalize">
                    {service.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Biaya Jasa</span>
                  <span className="font-mono text-sm font-medium text-foreground">{formatRupiah(service.service_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Biaya Sparepart</span>
                  <span className="font-mono text-sm font-medium text-foreground">{formatRupiah(service.parts_fee)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2.5">
                  <span className="text-sm font-bold text-foreground">Total</span>
                  <span className="font-mono text-lg font-bold text-foreground">{formatRupiah(service.total_fee)}</span>
                </div>
                {service.dp_amount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-badge-success">DP/Uang Muka</span>
                      <span className="font-mono text-sm font-medium text-badge-success">{formatRupiah(service.dp_amount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2.5">
                      <span className="text-sm font-bold text-foreground">Sisa Pembayaran</span>
                      <span className="font-mono text-lg font-bold text-foreground">{formatRupiah(service.total_fee - service.dp_amount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-border pt-2.5">
                  <span className="text-sm text-muted-foreground">Garansi</span>
                  <span className="text-sm font-medium text-foreground">{service.garansi || 'Tanpa Garansi'}</span>
                </div>
                {service.warranty_end_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Garansi Berakhir</span>
                    <span className="text-sm font-medium text-foreground">
                      {new Date(service.warranty_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-foreground">Tanggal</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Masuk</span>
                  <span className="text-sm font-medium text-foreground">{new Date(service.date_in).toLocaleString('id-ID')}</span>
                </div>
                {service.date_out && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Keluar</span>
                    <span className="text-sm font-medium text-foreground">{new Date(service.date_out).toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons (desktop) */}
          <div className="hidden space-y-2 lg:block">
            {service.status === 'proses' && (
              <Button onClick={markSelesai} disabled={updating} className="h-11 w-full gap-2">
                <CheckCircle size={16} />
                {updating ? 'Memperbarui...' : 'Tandai Selesai'}
              </Button>
            )}

            {/* Kirim Notif WhatsApp (semua status) */}
            <Button
              onClick={handleKirimNotif}
              disabled={waLoading}
              variant="outline"
              className="h-11 w-full gap-2"
            >
              {waLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
              ) : (
                <Send size={16} />
              )}
              {waLoading ? 'Mengirim...' : 'Kirim Update Status'}
            </Button>

            {/* Download & Kirim Nota (hanya selesai) */}
            {service.status === 'selesai' && (
              <>
                <Button
                  onClick={handleDownloadPDF}
                  disabled={pdfLoading}
                  variant="secondary"
                  className="h-11 w-full gap-2"
                >
                  {pdfLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                  ) : (
                    <Download size={16} />
                  )}
                  {pdfLoading ? 'Generating...' : 'Cetak Nota PDF'}
                </Button>
                <Button
                  onClick={handleKirimWhatsApp}
                  disabled={waLoading}
                  className="h-11 w-full gap-2 bg-badge-success/90 hover:bg-badge-success text-white"
                >
                  {waLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Send size={16} />
                  )}
                  {waLoading ? 'Mengirim...' : 'Kirim Nota PDF ke WhatsApp'}
                </Button>
              </>
            )}

            {waResult && (
              <div className={`rounded-lg border p-3 text-xs ${waResult.ok ? 'border-badge-success/30 bg-badge-success/10 text-badge-success' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
                {waResult.msg}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Sticky CTA Bar (wireframe: product-detail-sheet) ── */}
      <div className="sticky bottom-0 z-30 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 lg:hidden">
        <div className="border-t border-border bg-background/90 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md">
          {waResult && (
            <div className={`mb-2.5 rounded-lg border px-3 py-2 text-[11px] ${waResult.ok ? 'border-badge-success/30 bg-badge-success/10 text-badge-success' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
              {waResult.msg}
            </div>
          )}

          {service.status === 'selesai' ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                variant="secondary"
                className="h-11 w-full gap-2"
              >
                {pdfLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                ) : (
                  <Download size={16} />
                )}
                {pdfLoading ? 'Memproses...' : 'Cetak Nota'}
              </Button>
              <Button
                onClick={handleKirimWhatsApp}
                disabled={waLoading}
                className="h-11 w-full gap-2 bg-badge-success/90 hover:bg-badge-success text-white"
              >
                {waLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Send size={16} />
                )}
                {waLoading ? 'Mengirim...' : 'Kirim Nota WA'}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleKirimNotif}
                disabled={waLoading}
                variant="outline"
                className="h-11 flex-1 gap-2"
              >
                {waLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                ) : (
                  <Send size={16} />
                )}
                {waLoading ? 'Mengirim...' : 'Kirim Update'}
              </Button>
              {service.status === 'proses' && (
                <Button onClick={markSelesai} disabled={updating} className="h-11 flex-1 gap-2">
                  <CheckCircle size={16} />
                  {updating ? 'Memperbarui...' : 'Tandai Selesai'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && service && (
        <ServisEditForm
          service={service}
          initialParts={parts}
          onClose={() => setShowEditForm(false)}
          onSaved={() => {
            fetchService(service.id)
            setShowEditForm(false)
          }}
        />
      )}
    </div>
  )
}

// Edit Form Component
interface SparepartItem {
  product_id: string
  name: string
  quantity: number
  price: number
  buy_price: number
  max_qty: number
}

function ServisEditForm({ service, initialParts, onClose, onSaved }: { service: Service; initialParts: { product_id: string; name: string; quantity: number; price: number; buy_price: number }[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [spareparts, setSpareparts] = useState<Product[]>([])
  const [items, setItems] = useState<SparepartItem[]>(() =>
    initialParts.map(p => ({
      product_id: p.product_id,
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      buy_price: p.buy_price,
      max_qty: p.quantity,
    }))
  )
  const [form, setForm] = useState({
    customer_name: service.customer_name,
    customer_phone: service.customer_phone,
    device_type: service.device_type,
    device_brand: service.device_brand || '',
    device_model: service.device_model || '',
    complaint: service.complaint || '',
    kelengkapan: service.kelengkapan || '',
    service_fee: service.service_fee,
    dp_amount: service.dp_amount,
    notes: service.notes || '',
    garansi: service.garansi || 'Tanpa Garansi',
    status: service.status,
  })

  // Hitung total biaya sparepart dari items (untuk parts_fee & total_fee)
  const parts_fee = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const parts_modal = items.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0)
  const total = form.service_fee + parts_fee

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  // Fetch sparepart dari stok
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: cat } = await supabase.from('categories').select('id').eq('name', 'Sparepart').maybeSingle()
        if (!cat || cancelled) return
        const { data } = await supabase.from('products').select('*').eq('category_id', cat.id).gt('quantity', 0).order('name')
        if (!cancelled) setSpareparts(data || [])
      } catch (e) { console.error(e) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Tambah sparepart ke list
  function addSparepart() {
    setItems([...items, { product_id: '', name: '', quantity: 0, price: 0, buy_price: 0, max_qty: 0 }])
  }

  // Update sparepart item
  function updateItem(index: number, field: keyof SparepartItem, value: string | number) {
    const updated = [...items]
    if (field === 'product_id') {
      const product = spareparts.find(p => p.id === value)
      if (product) {
        updated[index] = {
          ...updated[index],
          product_id: product.id,
          name: product.name,
          price: product.sell_price || product.buy_price,
          buy_price: product.buy_price || 0,
          max_qty: product.quantity,
          quantity: 1,
        }
      }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setItems(updated)
  }

  // Hapus sparepart dari list
  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  // Hitung tanggal berakhir garansi dari input manual
  function hitungWarrantyEnd(): string | null {
    const input = form.garansi.trim().toLowerCase()
    if (!input || input === 'tanpa garansi') return null

    const now = new Date()
    // Pattern: angka + satuan (hari/minggu/bulan)
    const match = input.match(/(\d+)\s*(hari|minggu|bulan|hari|mgg|bln)/i)
    if (!match) return null

    const angka = parseInt(match[1])
    const satuan = match[2].toLowerCase()

    if (satuan === 'hari') {
      now.setDate(now.getDate() + angka)
    } else if (satuan === 'minggu' || satuan === 'mgg') {
      now.setDate(now.getDate() + (angka * 7))
    } else if (satuan === 'bulan' || satuan === 'bln') {
      now.setMonth(now.getMonth() + angka)
    }

    return now.toISOString()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Simpan sparepart secara ATOMIK via RPC (selisih otomatis: restore/kurangi stok + snapshot modal)
      const itemsPayload = items
        .filter(i => i.product_id && i.quantity > 0)
        .map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
          buy_price: i.buy_price,
        }))

      const { error: partsError } = await supabase.rpc('save_service_parts', {
        p_service_id: service.id,
        p_items: itemsPayload,
        p_created_by: user?.id,
      })
      if (partsError) throw partsError

      // 2. Update data servis (parts_fee & total_fee ikut dihitung ulang dari items)
      const { error: updateError } = await supabase.from('services').update({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        device_type: form.device_type,
        device_brand: form.device_brand || null,
        device_model: form.device_model || null,
        complaint: form.complaint || null,
        kelengkapan: form.kelengkapan || null,
        service_fee: form.service_fee,
        parts_fee,
        total_fee: total,
        dp_amount: form.dp_amount,
        notes: form.notes || null,
        garansi: form.garansi,
        warranty_end_date: hitungWarrantyEnd(),
        status: form.status,
        updated_at: new Date().toISOString(),
      }).eq('id', service.id)

      if (updateError) throw updateError
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengupdate data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Edit Servis" onClose={onClose} maxWidth="2xl">
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Nama Customer <span className="text-destructive">*</span>
            </label>
            <Input type="text" required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="h-10 w-full" placeholder="Masukkan nama customer" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              No. WhatsApp <span className="text-destructive">*</span>
            </label>
            <Input type="text" required value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} placeholder="08xxxxxxxxxx" className="h-10 w-full" />
          </div>
        </div>

        {/* Device Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Jenis Perangkat <span className="text-destructive">*</span>
            </label>
            <select value={form.device_type} onChange={e => setForm({ ...form, device_type: e.target.value })} className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
              <option>Laptop</option><option>PC</option><option>Printer</option><option>Lainnya</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Merk</label>
            <Input type="text" value={form.device_brand} onChange={e => setForm({ ...form, device_brand: e.target.value })} className="h-10 w-full" placeholder="Contoh: Asus" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Model/Tipe</label>
            <Input type="text" value={form.device_model} onChange={e => setForm({ ...form, device_model: e.target.value })} className="h-10 w-full" placeholder="Contoh: ROG" />
          </div>
        </div>

        {/* Kelengkapan */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Kelengkapan</label>
          <Input type="text" value={form.kelengkapan} onChange={e => setForm({ ...form, kelengkapan: e.target.value })} className="h-10 w-full" placeholder="Contoh: Charger, Tas, Unit saja" />
        </div>

        {/* Complaint */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Keluhan/Kerusakan</label>
          <textarea value={form.complaint} onChange={e => setForm({ ...form, complaint: e.target.value })} rows={3} className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" placeholder="Deskripsikan keluhan atau kerusakan perangkat..." />
        </div>

        {/* Sparepart yang Dipakai */}
        <div className="rounded-lg border border-dashed border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-foreground">Sparepart yang Dipakai</h4>
              <p className="text-[10px] text-muted-foreground">Pilih sparepart dari stok. Selisih stok otomatis dihitung saat disimpan (tambah = kurangi stok, hapus = restore stok)</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addSparepart} className="h-8 gap-1.5 text-xs">
              <Plus size={14} /> Tambah
            </Button>
          </div>

          {items.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">Belum ada sparepart ditambahkan</p>
          )}

          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3">
                <div className="flex flex-col gap-2">
                  {/* Baris 1: Select sparepart (full width) */}
                  <div className="flex items-start gap-2">
                    <select
                      value={item.product_id}
                      onChange={e => updateItem(i, 'product_id', e.target.value)}
                      className="h-9 min-w-0 flex-1 rounded-md border border-input bg-surface px-2 text-xs"
                    >
                      <option value="">Pilih sparepart...</option>
                      {spareparts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (stok: {p.quantity}) — {formatRupiah(p.sell_price || p.buy_price)}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeItem(i)} className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {/* Baris 2: Qty + Harga + Total */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-muted-foreground">Qty:</label>
                      <input
                        type="number"
                        min={1}
                        max={item.max_qty || 999}
                        value={item.quantity || ''}
                        onChange={e => updateItem(i, 'quantity', Number(e.target.value) || 0)}
                        onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) updateItem(i, 'quantity', 1) }}
                        className="h-9 w-16 rounded-md border border-input bg-surface px-2 text-xs text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                      <label className="text-[10px] text-muted-foreground shrink-0">Harga:</label>
                      <RupiahInput
                        value={item.price}
                        onChange={v => updateItem(i, 'price', v)}
                        className="h-9 min-w-0 flex-1 text-xs"
                      />
                    </div>
                    <div className="text-xs font-mono font-medium text-foreground shrink-0">
                      = {formatRupiah(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(parts_fee > 0 || parts_modal > 0) && (
            <div className="mt-3 flex justify-between border-t border-border pt-2 text-xs text-muted-foreground">
              <span>Biaya Sparepart: <span className="font-mono font-semibold text-foreground">{formatRupiah(parts_fee)}</span></span>
              <span>Total Modal (HPP): <span className="font-mono font-semibold text-foreground">{formatRupiah(parts_modal)}</span></span>
            </div>
          )}
        </div>

        {/* Biaya Jasa */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Biaya Jasa (Rp)
          </label>
          <RupiahInput value={form.service_fee} onChange={v => setForm({ ...form, service_fee: v })} className="h-10 w-full font-mono" />
        </div>

        {/* DP (Uang Muka) */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            DP / Uang Muka (Rp)
          </label>
          <RupiahInput value={form.dp_amount} onChange={v => setForm({ ...form, dp_amount: v })} className="h-10 w-full font-mono" />
        </div>

        {/* Keterangan atau Tindakan */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Keterangan atau Tindakan</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" placeholder="Tulis keterangan atau tindakan yang dilakukan..." />
        </div>

        {/* Garansi */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Garansi</label>
          <Input type="text" value={form.garansi} onChange={e => setForm({ ...form, garansi: e.target.value })} className="h-10 w-full" placeholder="Contoh: 7 Hari, 2 Minggu, 1 Bulan, Tanpa Garansi" />
          {form.garansi && form.garansi.toLowerCase() !== 'tanpa garansi' && hitungWarrantyEnd() && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Garansi berlaku hingga: {new Date(hitungWarrantyEnd() || '').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Service['status'] })} className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
            <option value="proses">Proses</option>
            <option value="menunggu">Menunggu Konfirmasi</option>
            <option value="selesai">Selesai</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row">
          <Button type="button" onClick={onClose} variant="secondary" className="h-11 w-full sm:flex-1">Batal</Button>
          <Button type="submit" disabled={loading} className="h-11 w-full sm:flex-1">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Menyimpan...
              </span>
            ) : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
