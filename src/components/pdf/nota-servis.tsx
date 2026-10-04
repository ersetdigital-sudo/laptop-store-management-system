import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Service } from '@/lib/supabase'

const RED = '#E53935'

const styles = StyleSheet.create({
  page: {
    padding: 12,
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#000000',
    lineHeight: 1.2,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: RED,
  },
  headerLeft: { flex: 1 },
  notaTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: RED,
    marginBottom: 2,
  },
  storeName: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 1,
  },
  storeTagline: { fontSize: 6, color: '#555', marginBottom: 1 },
  storePhone: { fontSize: 6, color: '#555' },
  headerRight: { width: 140, borderWidth: 1, borderColor: '#ccc', padding: 4 },
  headerRightRow: { flexDirection: 'row', marginBottom: 1 },
  headerRightLabel: { fontSize: 6, color: '#666', width: 50 },
  headerRightValue: { fontSize: 6, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', flex: 1 },
  // Table
  table: { marginBottom: 4, borderWidth: 1, borderColor: '#ddd' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: RED,
    paddingVertical: 3,
    paddingHorizontal: 3,
  },
  tableHeaderText: {
    fontSize: 6,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 12,
  },
  colNo: { width: 16, fontSize: 6, textAlign: 'center' },
  colTipe: { flex: 1.2, fontSize: 6, paddingHorizontal: 2 },
  colKerusakan: { flex: 1.3, fontSize: 6, paddingHorizontal: 2 },
  colKeteranganTable: { flex: 1.5, fontSize: 5.5, color: '#333', paddingHorizontal: 2 },
  colHarga: { width: 55, fontSize: 6, textAlign: 'right', fontFamily: 'Courier' },
  // Summary
  summaryContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  summaryBox: { width: 140 },
  summaryRow: { flexDirection: 'row', marginBottom: 0 },
  summaryLabel: {
    width: 50, fontSize: 6, fontWeight: 'bold', fontFamily: 'Helvetica-Bold',
    backgroundColor: RED, color: '#fff', paddingHorizontal: 3, paddingVertical: 2,
  },
  summaryValue: {
    width: 90, fontSize: 6, textAlign: 'right', fontFamily: 'Courier',
    paddingHorizontal: 3, paddingVertical: 2, borderWidth: 1, borderColor: '#ddd',
  },
  // Info rows
  infoRow: { flexDirection: 'row', marginBottom: 3, borderWidth: 1, borderColor: '#ddd' },
  infoLabel: {
    width: 110, fontSize: 6, fontWeight: 'bold', fontFamily: 'Helvetica-Bold',
    backgroundColor: RED, color: '#fff', paddingHorizontal: 3, paddingVertical: 2,
  },
  infoValue: { flex: 1, fontSize: 6, paddingHorizontal: 3, paddingVertical: 2 },
  // Syarat
  syaratContainer: { marginTop: 3, marginBottom: 3, padding: 3, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee' },
  syaratTitle: { fontSize: 6, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  syaratText: { fontSize: 5.5, color: '#444', lineHeight: 1.2 },
  // Rekening
  rekeningContainer: { marginBottom: 3, padding: 3, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee' },
  rekeningTitle: { fontSize: 6, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  rekeningText: { fontSize: 5.5, color: '#444', lineHeight: 1.2 },
  rekeningBold: { fontSize: 5.5, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', color: '#000' },
  // TTD
  ttdContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  ttdBox: { width: 100, alignItems: 'center' },
  ttdLine: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#000', height: 24, marginBottom: 2 },
  ttdLabel: { fontSize: 6, fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
})

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function formatDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Deskripsi satu perangkat: "Laptop - dell - 5227"
function deviceLabel(s: Service): string {
  return [s.device_type, s.device_brand, s.device_model].filter(Boolean).join(' - ')
}

export interface NotaServisPart {
  name: string
  quantity: number
  price: number
}

interface NotaServisProps {
  // Perangkat-perangkat dalam satu nota (satu transaksi). Bila hanya 1, tetap jalan.
  services: Service[]
  // Sparepart per service id
  partsByService?: Record<string, NotaServisPart[]>
  storeName?: string
  storeAddress?: string
  storePhone?: string
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolder?: string
}

export function NotaServisPDF({
  services,
  partsByService = {},
  storeName = 'CENTRAL LAPTOP COMPUTER',
  storeAddress = '',
  storePhone = '0812-3456-7890',
  bankName = 'BCA',
  bankAccountNumber = '1234567890',
  bankAccountHolder = 'Toko',
}: NotaServisProps) {
  const primary = services[0]

  // Bangun baris tabel: 1 baris per perangkat (tipe + kerusakan + keterangan + harga)
  const tableRows: { no: number; tipe: string; kerusakan: string; keterangan: string; harga: number }[] = []

  services.forEach((s) => {
    const parts = partsByService[s.id] || []
    const partsFee = parts.reduce((sum, p) => sum + p.price * p.quantity, 0)
    tableRows.push({
      no: tableRows.length + 1,
      tipe: deviceLabel(s),
      kerusakan: s.complaint || '',
      keterangan: s.notes || '',
      harga: s.service_fee + partsFee,
    })
  })

  // Pad ke minimum 5 baris
  while (tableRows.length < 5) {
    tableRows.push({
      no: tableRows.length + 1,
      tipe: '',
      kerusakan: '',
      keterangan: '',
      harga: 0,
    })
  }

  // Total agregat seluruh perangkat
  const grandTotal = services.reduce((sum, s) => sum + (s.total_fee || 0), 0)
  const totalDp = services.reduce((sum, s) => sum + (s.dp_amount || 0), 0)

  // Garansi (ambil dari perangkat pertama)
  const garansiText = primary?.garansi && primary.garansi.toLowerCase() !== 'tanpa garansi'
    ? primary.garansi
    : ''
  const garansiEndDate = primary?.warranty_end_date ? formatDate(primary.warranty_end_date) : ''

  // Kelengkapan: gabung dari semua perangkat (unik)
  const kelengkapanList = [...new Set(services.map((s) => s.kelengkapan).filter(Boolean))]

  if (!primary) {
    return (
      <Document>
        <Page size="A5" style={styles.page}>
          <Text>Nota tidak tersedia</Text>
        </Page>
      </Document>
    )
  }

  return (
    <Document>
      <Page size="A5" style={styles.page} orientation="portrait">
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.notaTitle}>NOTA SERVICE</Text>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.storeTagline}>Service Laptop, Komputer, Software, Upgrade</Text>
            <Text style={styles.storePhone}>WA: {storePhone}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.headerRightRow}>
              <Text style={styles.headerRightLabel}>Tgl Masuk</Text>
              <Text style={styles.headerRightValue}>: {formatDate(primary.date_in)}</Text>
            </View>
            <View style={styles.headerRightRow}>
              <Text style={styles.headerRightLabel}>Nama</Text>
              <Text style={styles.headerRightValue}>: {primary.customer_name}</Text>
            </View>
            <View style={styles.headerRightRow}>
              <Text style={styles.headerRightLabel}>No. WA</Text>
              <Text style={styles.headerRightValue}>: {primary.customer_phone}</Text>
            </View>
          </View>
        </View>

        {/* TABEL UTAMA */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderText, width: 16, textAlign: 'center' }}>No</Text>
            <Text style={{ ...styles.tableHeaderText, flex: 1.2 }}>Tipe Laptop</Text>
            <Text style={{ ...styles.tableHeaderText, flex: 1.3 }}>Kerusakan</Text>
            <Text style={{ ...styles.tableHeaderText, flex: 1.5 }}>Keterangan / Tindakan</Text>
            <Text style={{ ...styles.tableHeaderText, width: 55, textAlign: 'right' }}>Harga</Text>
          </View>

          {tableRows.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colNo}>{row.no}</Text>
              <Text style={styles.colTipe}>{row.tipe}</Text>
              <Text style={styles.colKerusakan}>{row.kerusakan}</Text>
              <Text style={styles.colKeteranganTable}>{row.keterangan}</Text>
              <Text style={styles.colHarga}>{row.harga > 0 ? formatRupiah(row.harga) : ''}</Text>
            </View>
          ))}
        </View>

        {/* RINGKASAN BIAYA */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>{formatRupiah(grandTotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>DP</Text>
              <Text style={styles.summaryValue}>{formatRupiah(totalDp)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sisa</Text>
              <Text style={styles.summaryValue}>{formatRupiah(grandTotal - totalDp)}</Text>
            </View>
          </View>
        </View>

        {/* KELENGKAPAN */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Kelengkapan :</Text>
          <Text style={styles.infoValue}>{kelengkapanList.length > 0 ? kelengkapanList.join(', ') : '-'}</Text>
        </View>

        {/* GARANSI */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Garansi Service / Upgrade :</Text>
          <Text style={styles.infoValue}>
            {garansiText ? `${garansiText}${garansiEndDate ? ` (s/d ${garansiEndDate})` : ''}` : 'Tanpa Garansi'}
          </Text>
        </View>

        {/* SYARAT & KETENTUAN */}
        <View style={styles.syaratContainer}>
          <Text style={styles.syaratTitle}>Syarat & Ketentuan :</Text>
          <Text style={styles.syaratText}>
            1. Jika barang service tidak diambil dalam kurun waktu 1 bulan, kehilangan atau kerusakan kembali bukan tanggung jawab kami.
          </Text>
          <Text style={styles.syaratText}>
            2. Garansi tidak berlaku jika segel rusak, Human Error, Barang tertukar.
          </Text>
        </View>

        {/* INFO REKENING */}
        {bankAccountNumber && (
          <View style={styles.rekeningContainer}>
            <Text style={styles.rekeningTitle}>Info Rekening Transfer :</Text>
            <Text style={styles.rekeningText}>
              Transfer ke: <Text style={styles.rekeningBold}>{bankName}</Text>
            </Text>
            <Text style={styles.rekeningBold}>{bankAccountNumber}</Text>
            <Text style={styles.rekeningBold}>A/N {bankAccountHolder}</Text>
            <Text style={styles.rekeningText}>
              Kirimkan bukti jika sudah transfer
            </Text>
          </View>
        )}

        {/* TANDA TANGAN */}
        <View style={styles.ttdContainer}>
          <View style={styles.ttdBox}>
            <Text style={styles.ttdLabel}>Customer</Text>
            <View style={styles.ttdLine} />
          </View>
          <View style={styles.ttdBox}>
            <Text style={styles.ttdLabel}>Hormat Kami</Text>
            <View style={styles.ttdLine} />
          </View>
        </View>
      </Page>
    </Document>
  )
}
