// routes/financeiro.ts
import { Router, type Request, type Response } from 'express'
import { pool } from '../../config/pg'
import type { PoolClient, QueryResult } from 'pg'
import { logger } from '../../utils/logger'

export const financeiroRouter = Router()

/** ========= Types ========= */
type UUID = string

interface FinanceiroRow {
  id: number | string
  data: Date | string | null
  tipo: string | null
  item: string | null
  valor: string | number | null
  qtd: number | null
  obs: string | null
  filamento_id: UUID | null
  created_at: Date | string
}

interface FinanceiroDTO {
  id: number | string
  data: string | null // YYYY-MM-DD
  tipo: string | null
  item: string | null
  valor: number
  qtd: number | null
  obs: string | null
  filamentoId?: UUID
  createdAt: Date | string
}

interface CreateFinanceiroBody {
  data?: string | null
  tipo: string
  item: string
  valor: number | string
  qtd?: number | string | null
  obs?: string | null
  filamentoId?: UUID | null
}

interface UpdateFinanceiroBody {
  data?: string | null
  tipo?: string
  item?: string
  valor?: number | string
  qtd?: number | string | null
  obs?: string | null
  filamentoId?: UUID | null
}

/** ========= Utils ========= */
const fmtDate = (d: unknown): string | null => {
  if (!d) return null
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  if (typeof d === 'string') return d.length >= 10 ? d.slice(0, 10) : d
  return null
}

const toNumber = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const rowToDTO = (r: FinanceiroRow): FinanceiroDTO => ({
  id: r.id,
  data: fmtDate(r.data),
  tipo: r.tipo,
  item: r.item,
  valor: toNumber(r.valor),
  qtd: r.qtd,
  obs: r.obs,
  filamentoId: r.filamento_id ?? undefined,
  createdAt: r.created_at,
})

/** Opcional: stub se você chama ensureSchema em outro módulo */
async function ensureSchema(_client: PoolClient): Promise<void> {
  // no-op (implemente aqui se precisar garantir schema/tabela)
}

/** ========= Rotas ========= */

// Listar lançamentos
financeiroRouter.get('/', async (_req: Request, res: Response) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result: QueryResult<FinanceiroRow> = await client.query(
      'SELECT * FROM financeiro ORDER BY created_at DESC'
    )
    await client.query('COMMIT')

    const data = result.rows.map(rowToDTO)
    res.json({ message: 'Lançamentos listados com sucesso', data })
  } catch (e) {
    try { await client.query('ROLLBACK') } catch {}
    logger.error('felix3d-financeiro', `Falha inesperada ao listar financeiro: ${e}`)
    res.status(500).json({ message: 'Falha inesperada ao listar financeiro', details: String(e) })
  } finally {
    client.release()
  }
})

// Criar lançamento
financeiroRouter.post('/', async (req: Request<unknown, unknown, CreateFinanceiroBody>, res: Response) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const body = req.body ?? {}
    if (!body.tipo || !body.item || body.valor == null || isNaN(Number(body.valor))) {
      await client.query('ROLLBACK')
      res.status(400).json({ message: 'Campos obrigatórios: tipo, item, valor' })
      return
    }

    const data = body.data ?? null
    const qtd = body.qtd != null ? Number(body.qtd) : 1
    const valor = Number(body.valor)
    const obs = body.obs ?? null
    const filamentoId = body.filamentoId ?? null

    const insert: QueryResult<FinanceiroRow> = await client.query(
      `INSERT INTO public.financeiro (data, tipo, item, valor, qtd, obs, filamento_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data, body.tipo, body.item, valor, qtd, obs, filamentoId]
    )

    await client.query('COMMIT')

    const created = rowToDTO(insert.rows[0])
    res.json({ message: 'Lançamento criado com sucesso', data: created })
  } catch (e) {
    try { await client.query('ROLLBACK') } catch {}
    logger.error('felix3d-financeiro', `Falha inesperada ao criar lançamento: ${e}`)
    res.status(500).json({ message: 'Falha inesperada ao criar lançamento', details: String(e) })
  } finally {
    client.release()
  }
})

// Atualizar lançamento
financeiroRouter.put('/:id', async (req: Request<{ id: string }, unknown, UpdateFinanceiroBody>, res: Response) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const id = req.params.id
    const body = req.body ?? {}

    const existing: QueryResult<FinanceiroRow> = await client.query(
      'SELECT * FROM financeiro WHERE id = $1',
      [id]
    )
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK')
      res.status(404).json({ message: 'Lançamento não encontrado' })
      return
    }

    const allowed = [
      { f: 'data', b: 'data' },
      { f: 'tipo', b: 'tipo' },
      { f: 'item', b: 'item' },
      { f: 'valor', b: 'valor' },
      { f: 'qtd', b: 'qtd' },
      { f: 'obs', b: 'obs' },
      { f: 'filamentoId', b: 'filamento_id' },
    ] as const

    const updateFields: string[] = []
    const updateValues: unknown[] = []
    let i = 1
    for (const m of allowed) {
      if ((body as any)[m.f] !== undefined) {
        updateFields.push(`${m.b} = $${i}`)
        updateValues.push((body as any)[m.f])
        i++
      }
    }

    if (updateFields.length === 0) {
      await client.query('ROLLBACK')
      res.status(400).json({ message: 'Nenhum campo válido fornecido para atualização' })
      return
    }

    updateValues.push(id)
    const q = `UPDATE financeiro SET ${updateFields.join(', ')} WHERE id = $${i} RETURNING *`
    const result: QueryResult<FinanceiroRow> = await client.query(q, updateValues)

    await client.query('COMMIT')

    const updated = rowToDTO(result.rows[0])
    res.json({ message: 'Lançamento atualizado com sucesso', data: updated })
  } catch (e) {
    try { await client.query('ROLLBACK') } catch {}
    logger.error('felix3d-financeiro', `Falha inesperada ao atualizar lançamento: ${e}`)
    res.status(500).json({ message: 'Falha inesperada ao atualizar lançamento', details: String(e) })
  } finally {
    client.release()
  }
})

// Remover lançamento
financeiroRouter.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await ensureSchema(client) // opcional

    const id = req.params.id
    const existing: QueryResult<FinanceiroRow> = await client.query(
      'SELECT * FROM financeiro WHERE id = $1',
      [id]
    )
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK')
      res.status(404).json({ message: 'Lançamento não encontrado' })
      return
    }

    const result: QueryResult<FinanceiroRow> = await client.query(
      'DELETE FROM financeiro WHERE id = $1 RETURNING *',
      [id]
    )
    await client.query('COMMIT')

    const removed = rowToDTO(result.rows[0])
    res.json({ message: 'Lançamento removido com sucesso', data: removed })
  } catch (e) {
    try { await client.query('ROLLBACK') } catch {}
    logger.error('felix3d-financeiro', `Falha inesperada ao deletar lançamento: ${e}`)
    res.status(500).json({ message: 'Falha inesperada ao deletar lançamento', details: String(e) })
  } finally {
    client.release()
  }
})

// Dashboard de finanças
financeiroRouter.get('/dashboard', async (_req: Request, res: Response) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Total de gastos
    const totalGastosResult: QueryResult<{ total: string | number | null }> = await client.query(
      `SELECT COALESCE(SUM((valor::numeric) * COALESCE(qtd, 1)), 0) AS total
         FROM public.financeiro`
    )
    const totalGastos = toNumber(totalGastosResult.rows[0]?.total)

    // Gastos por tipo
    const porTipoResult: QueryResult<{ tipo: string; total: string | number }> = await client.query(
      `SELECT COALESCE(tipo, 'outro') AS tipo,
              COALESCE(SUM((valor::numeric) * COALESCE(qtd, 1)), 0) AS total
         FROM public.financeiro
        GROUP BY COALESCE(tipo, 'outro')
        ORDER BY tipo`
    )
    const gastosPorTipo = {
      labels: porTipoResult.rows.map(r => r.tipo),
      series: porTipoResult.rows.map(r => toNumber(r.total)),
    }

    // Gastos por mês
    const porMesResult: QueryResult<{ ym: string; total: string | number }> = await client.query(
      `SELECT to_char(COALESCE(data::date, created_at::date), 'YYYY-MM') AS ym,
              COALESCE(SUM((valor::numeric) * COALESCE(qtd, 1)), 0) AS total
         FROM public.financeiro
        GROUP BY to_char(COALESCE(data::date, created_at::date), 'YYYY-MM')
        ORDER BY ym`
    )
    const keys = porMesResult.rows.map(r => r.ym)
    const gastosPorMes = {
      labels: keys.map(k => {
        const [y, m] = k.split('-')
        return `${m}/${y}`
      }),
      series: porMesResult.rows.map(r => toNumber(r.total)),
    }

    // Total de receita (pedidos entregues)
    const receitaResult: QueryResult<{ total: string | number | null }> = await client.query(
      `SELECT COALESCE(SUM(valor_venda::numeric), 0) AS total
         FROM public.pedidos
        WHERE lower(status) = 'entregue'`
    )
    const totalReceita = toNumber(receitaResult.rows[0]?.total)

    await client.query('COMMIT')

    res.json({
      message: 'Dashboard financeiro calculado com sucesso',
      data: {
        totalGastos,
        totalReceita,
        gastosPorTipo,
        gastosPorMes,
        receitaVsGastos: { receita: totalReceita, gastos: totalGastos },
      }
    })
  } catch (e) {
    try { await client.query('ROLLBACK') } catch {}
    logger.error('felix3d-financeiro', `Falha ao calcular dashboard financeiro: ${e}`)
    res.status(500).json({ message: 'Falha inesperada ao calcular dashboard financeiro', details: String(e) })
  } finally {
    client.release()
  }
})
