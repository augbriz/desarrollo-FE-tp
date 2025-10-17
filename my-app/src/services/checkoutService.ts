import { authService } from './authService'
import { apiClient } from './httpClient'

const API = apiClient

export type TipoProducto = 'juego' | 'servicio' | 'complemento'

export type VentaMinimal = {
  id: number
  codActivacion: string
  fecha: string
  juego?: { id: number }
  servicio?: { id: number }
  complemento?: { id: number }
}

export async function startCheckout(tipo: TipoProducto, id: number) {
  const token = authService.getToken()
  if (!token) throw new Error('No autenticado')
  const res = await API.post('/checkout/start', { tipo, id }, { headers: { Authorization: `Bearer ${token}` } })
  return res.data.data as { sessionId: string; status: 'pending' }
}

export async function simulateSuccess(sessionId: string) {
  const token = authService.getToken()
  if (!token) throw new Error('No autenticado')
  const res = await API.post('/checkout/simulate-success', { sessionId }, { headers: { Authorization: `Bearer ${token}` } })
  return res.data.data as { status: 'paid'; venta: VentaMinimal }
}

export async function getStatus(sessionId: string) {
  const token = authService.getToken()
  if (!token) throw new Error('No autenticado')
  const res = await API.get('/checkout/status', { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } })
  return res.data.data as { status: 'pending' | 'paid' | 'cancelled'; ventaId?: number }
}

// Mercado Pago
export async function mpStartPreference(tipo: TipoProducto, id: number) {
  const token = authService.getToken()
  if (!token) throw new Error('No autenticado')
  const res = await API.post('/checkout/mp/start', { tipo, id }, { headers: { Authorization: `Bearer ${token}` } })
  return res.data.data as { id: string; init_point: string }
}

export async function mpConfirm(paymentId: string) {
  const token = authService.getToken()
  if (!token) throw new Error('No autenticado')
  const res = await API.get('/checkout/mp/confirm', { params: { payment_id: paymentId }, headers: { Authorization: `Bearer ${token}` } })
  return res.data.data as { status: 'paid'; venta: VentaMinimal }
}

// Nuevo: obtener resultado de pago por payment_id (no requiere auth)
export async function mpResult(paymentId: string) {
  const res = await API.get('/checkout/mp/result', { params: { payment_id: paymentId } })
  return res.data.data as { status: 'paid' | 'pending'; venta?: VentaMinimal }
}

// Nuevo: obtener una venta por id (público en este backend)
export async function getVenta(ventaId: number) {
  const token = authService.getToken()
  if (!token) throw new Error('No autenticado')
  const res = await API.get(`/venta/${ventaId}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.data.data as VentaMinimal
}
