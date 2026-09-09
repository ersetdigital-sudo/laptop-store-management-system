import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const RED = '#E53935'

const styles = StyleSheet.create({
  page: {
    padding: 12,
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#000000',
    lineHeight: 1.2,
  },
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
    fontSize: 12,
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
  headerRightLabel: { fontSize: 6, color: '#666', width: 45 },
  headerRightValue: { fontSize: 6, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', flex: 1 },
  notaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  notaLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    width: 55,
  },
  notaValue: {
    fontSize: 7,
    fontFamily: 'Courier',
  },
  table: {
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
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
  colName: { flex: 1, fontSize: 6 },
  colType: { width: 30, fontSize: 6, textAlign: 'center' },
  colQty: { width: 24, fontSize: 6, textAlign: 'center' },
  colHarga: { width: 55, fontSize: 6, textAlign: 'right', fontFamily: 'Courier' },
  colJumlah: { width: 55, fontSize: 6, textAlign: 'right', fontFamily: 'Courier' },
  bottomSection: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 4,
  },
  leftSection: { flex: 1 },
  rightSection: { width: 140 },
  bonusBox: {
    marginBottom: 3,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  bonusHeader: {
    backgroundColor: RED,
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  bonusHeaderText: {
    fontSize: 6,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  bonusBody: {
    padding: 3,
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 3,
  },
  checkboxChecked: {
    backgroundColor: '#000',
  },
  bonusText: {
    fontSize: 5.5,
  },
  catatanBox: {
    marginBottom: 3,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  catatanHeader: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  catatanHeaderText: {
    fontSize: 6,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#333',
  },
  catatanBody: {
    padding: 3,
  },
  catatanText: {
    fontSize: 5.5,
    color: '#444',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  summaryLabel: {
    width: 55,
    fontSize: 6,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    backgroundColor: RED,
    color: '#fff',
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  summaryValue: {
    width: 85,
    fontSize: 6,
    textAlign: 'right',
    fontFamily: 'Courier',
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  perhatianBox: {
    marginBottom: 4,
    padding: 3,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff9c4',
  },
  perhatianText: {
    fontSize: 5.5,
    color: '#333',
    textAlign: 'center',
  },
  rekeningBox: {
    marginBottom: 4,
    padding: 3,
  },
  rekeningText: {
    fontSize: 6,
    color: '#333',
    textAlign: 'center',
  },
  rekeningBold: {
    fontSize: 6,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  ttdContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
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

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <View style={checked ? [styles.checkbox, styles.checkboxChecked] : styles.checkbox} />
  )
}

interface NotaMultiProps {
  // Untuk mode 'pembelian': field sale dipakai sebagai data kwitansi pembelian
  // (buyer_name = nama supplier, sell_price = total nilai pembelian).
  mode?: 'penjualan' | 'pembelian'
  sale: {
    id: string
    invoice_number: string
    buyer_name: string
    buyer_phone: string | null
    sell_price: number
    buy_price: number
    dp_amount?: number
    bonus?: string[] | null
    bonus_lainnya?: string | null
    payment_method: string
    garansi: string
    warranty_end_date: string | null
    date: string
    notes?: string | null
  }
  items: {
    name: string
    type: 'unit' | 'sparepart'
    quantity: number
    sell_price: number
    buy_price: number
    specs?: string
  }[]
  storeName?: string
  storeAddress?: string
  storePhone?: string
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolder?: string
}

const bonusOptions = ['Mouse', 'Keyboard', 'Tas', 'Mousepad']

export function NotaMultiPDF({
  sale,
  items,
  mode = 'penjualan',
  storeName = 'CENTRAL LAPTOP COMPUTER',
  storeAddress = '',
  storePhone = '0812-3456-7890',
  bankName = 'BCA',
  bankAccountNumber = '1234567890',
  bankAccountHolder = 'Toko',
}: NotaMultiProps) {
  const isPembelian = mode === 'pembelian'
  const selectedBonus = sale.bonus || []
  const hasBonus = selectedBonus.length > 0 || sale.bonus_lainnya
  const hasDP = !isPembelian && (sale.dp_amount ?? 0) > 0
  const sisa = sale.sell_price - (sale.dp_amount ?? 0)
  const hasUnit = items.some(i => i.type === 'unit')

  // Garansi end date
  const garansiText = sale.garansi && sale.garansi.toLowerCase() !== 'tanpa garansi' ? sale.garansi : ''
  const garansiEndDate = sale.warranty_end_date ? formatDate(sale.warranty_end_date) : ''

  return (
    <Document>
      <Page size="A5" style={styles.page} orientation="portrait">
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.notaTitle}>KWITANSI</Text>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.storeTagline}>Service Laptop, Komputer, Software, Upgrade</Text>
            <Text style={styles.storePhone}>WA: {storePhone}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.headerRightRow}>
              <Text style={styles.headerRightLabel}>Tanggal</Text>
              <Text style={styles.headerRightValue}>: {formatDate(sale.date)}</Text>
            </View>
            <View style={styles.headerRightRow}>
              <Text style={styles.headerRightLabel}>{isPembelian ? 'Supplier' : 'Yth'}</Text>
              <Text style={styles.headerRightValue}>: {sale.buyer_name}</Text>
            </View>
            <View style={styles.headerRightRow}>
              <Text style={styles.headerRightLabel}>No. Hp</Text>
              <Text style={styles.headerRightValue}>: {sale.buyer_phone || '-'}</Text>
            </View>
          </View>
        </View>

        {/* NO NOTA */}
        <View style={styles.notaRow}>
          <Text style={styles.notaLabel}>No. Nota :</Text>
          <Text style={styles.notaValue}>{sale.invoice_number}</Text>
        </View>

        {/* TABEL PRODUK */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderText, width: 16, textAlign: 'center' }}>NO</Text>
            <Text style={{ ...styles.tableHeaderText, flex: 1 }}>NAMA PRODUK</Text>
            <Text style={{ ...styles.tableHeaderText, width: 30, textAlign: 'center' }}>TIPE</Text>
            <Text style={{ ...styles.tableHeaderText, width: 24, textAlign: 'center' }}>QTY</Text>
            <Text style={{ ...styles.tableHeaderText, width: 55, textAlign: 'right' }}>{isPembelian ? 'HARGA BELI' : 'HARGA'}</Text>
            <Text style={{ ...styles.tableHeaderText, width: 55, textAlign: 'right' }}>JUMLAH</Text>
          </View>

          {/* Item rows */}
          {items.map((item, idx) => {
            const harga = isPembelian ? item.buy_price : item.sell_price
            return (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colNo}>{idx + 1}</Text>
                <View style={styles.colName}>
                  <Text>{item.name}</Text>
                  {item.specs && <Text style={{ fontSize: 5, color: '#666' }}>{item.specs}</Text>}
                </View>
                <Text style={styles.colType}>{item.type === 'unit' ? 'Unit' : 'Sparepart'}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colHarga}>{formatRupiah(harga)}</Text>
                <Text style={styles.colJumlah}>{formatRupiah(harga * item.quantity)}</Text>
              </View>
            )
          })}

          {/* Empty rows to fill space (minimum 3 rows total) */}
          {items.length < 3 && Array.from({ length: 3 - items.length }).map((_, idx) => (
            <View key={`empty-${idx}`} style={styles.tableRow}>
              <Text style={styles.colNo}>{items.length + idx + 1}</Text>
              <Text style={styles.colName}> </Text>
              <Text style={styles.colType}> </Text>
              <Text style={styles.colQty}> </Text>
              <Text style={styles.colHarga}> </Text>
              <Text style={styles.colJumlah}> </Text>
            </View>
          ))}
        </View>

        {/* BOTTOM SECTION */}
        <View style={styles.bottomSection}>
          {/* LEFT: Bonus + Catatan */}
          <View style={styles.leftSection}>
            {!isPembelian && hasUnit && (
              <View style={styles.bonusBox}>
                <View style={styles.bonusHeader}>
                  <Text style={styles.bonusHeaderText}>BONUS</Text>
                </View>
                <View style={styles.bonusBody}>
                  {bonusOptions.map((opt) => (
                    <View key={opt} style={styles.bonusItem}>
                      <CheckBox checked={selectedBonus.includes(opt)} />
                      <Text style={styles.bonusText}>{opt}</Text>
                    </View>
                  ))}
                  {sale.bonus_lainnya && (
                    <Text style={[styles.bonusText, { marginTop: 2 }]}>Lainnya: {sale.bonus_lainnya}</Text>
                  )}
                </View>
              </View>
            )}

            {sale.notes && (
              <View style={styles.catatanBox}>
                <View style={styles.catatanHeader}>
                  <Text style={styles.catatanHeaderText}>CATATAN OS & APLIKASI</Text>
                </View>
                <View style={styles.catatanBody}>
                  <Text style={styles.catatanText}>{sale.notes}</Text>
                </View>
              </View>
            )}

            {/* GARANSI */}
            {sale.garansi && sale.garansi.toLowerCase() !== 'tanpa garansi' && (
              <View style={styles.catatanBox}>
                <View style={styles.catatanHeader}>
                  <Text style={styles.catatanHeaderText}>GARANSI</Text>
                </View>
                <View style={styles.catatanBody}>
                  <Text style={styles.catatanText}>{sale.garansi}</Text>
                  {garansiEndDate && (
                    <Text style={styles.catatanText}>Berlaku hingga: {garansiEndDate}</Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* RIGHT: Summary */}
          <View style={styles.rightSection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>TOTAL</Text>
              <Text style={styles.summaryValue}>{formatRupiah(sale.sell_price)}</Text>
            </View>
            {hasDP && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>DP</Text>
                  <Text style={styles.summaryValue}>{formatRupiah(sale.dp_amount ?? 0)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>SISA</Text>
                  <Text style={styles.summaryValue}>{formatRupiah(sisa)}</Text>
                </View>
              </>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>BAYAR</Text>
              <Text style={[styles.summaryValue, { fontSize: 5.5 }]}>{sale.payment_method}</Text>
            </View>
          </View>
        </View>

        {/* PERHATIAN */}
        <View style={styles.perhatianBox}>
          <Text style={styles.perhatianText}>
            {isPembelian ? 'PERHATIAN: Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan' : 'PERHATIAN: Barang yang sudah dibeli tidak dapat dikembalikan atau ditukar.'}
          </Text>
        </View>

        {/* REKENING */}
        {bankAccountNumber && (
          <View style={styles.rekeningBox}>
            <Text style={styles.rekeningText}>
              Transfer: <Text style={styles.rekeningBold}>{bankName} {bankAccountNumber}</Text> a/n <Text style={styles.rekeningBold}>{bankAccountHolder}</Text>
            </Text>
          </View>
        )}

        {/* TANDA TANGAN */}
        <View style={styles.ttdContainer}>
          <View style={styles.ttdBox}>
            <View style={styles.ttdLine} />
            <Text style={styles.ttdLabel}>{isPembelian ? 'Diterima oleh' : 'Pembeli'}</Text>
          </View>
          <View style={styles.ttdBox}>
            <View style={styles.ttdLine} />
            <Text style={styles.ttdLabel}>{isPembelian ? 'Diserahkan oleh' : 'Penjual'}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
