import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { pool } from '../../config/pg'

const router = Router()

// Schemas de validação
const pedidoCreateSchema = z.object({
  numero: z.string().min(1, 'numero é obrigatório'),
  categoria: z.string().min(1, 'categoria é obrigatória'),
  produto: z.string().min(1, 'produto é obrigatório'),
  filamento: z.string().min(1, 'filamento é obrigatório'),
  cliente: z.string().min(1, 'cliente é obrigatório'),
  categoriaOutro: z.string().nullable().optional(),
  tempoImpressaoMin: z.coerce.number().int().nonnegative().optional(),
  pesoGramas: z.coerce.number().int().nonnegative().optional(),
  valorVenda: z.coerce.number().nonnegative().optional(),
  status: z.string().optional(),
  pausado: z.coerce.boolean().optional(),
})

const pedidoUpdateSchema = z
  .object({
    cliente: z.string().optional(),
    produto: z.string().optional(),
    categoria: z.string().optional(),
    categoriaOutro: z.string().nullable().optional(),
    filamento: z.string().optional(),
    tempoImpressaoMin: z.coerce.number().int().nonnegative().optional(),
    pesoGramas: z.coerce.number().int().nonnegative().optional(),
    status: z.string().optional(),
    pausado: z.coerce.boolean().optional(),
    valorVenda: z.coerce.number().nonnegative().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Nenhum campo válido fornecido para atualização',
  })

// Listar todos os pedidos
router.get('/', async (req: Request, res: Response) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const result = await client.query('SELECT * FROM pedidos ORDER BY created_at DESC')

    await client.query('COMMIT')

    const data = result.rows.map((row: any) => ({
      id: row.id,
      numero: row.numero,
      cliente: row.cliente,
      produto: row.produto,
      categoria: row.categoria,
      categoriaOutro: row.categoria_outro,
      filamento: row.filamento,
      tempoImpressaoMin: row.tempo_impressao_min,
      pesoGramas: row.peso_gramas,
      pausado: row.pausado,
      valorVenda: row.valor_venda,
      createdAt: row.created_at,
      status: row.status,
    }))

    return res.json({ message: 'Pedidos listados com sucesso', data })
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Erro ao realizar rollback:', rollbackError)
    }
    console.error('Falha inesperada ao listar pedidos:', e)
    return res.status(500).json({ message: 'Falha inesperada ao listar pedidos', details: String(e) })
  } finally {
    client.release()
  }
})

// Postar pedido
router.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect()
  console.log('novo pedido')

  try {
    await client.query('BEGIN')

    const parsed = pedidoCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        message: 'Campos inválidos',
        errors: parsed.error.flatten(),
      })
    }
    const newPedido = parsed.data

    const existingOrder = await client.query('SELECT numero FROM pedidos WHERE numero = $1', [newPedido.numero])

    if (existingOrder.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        message: 'Pedido já existente com este número.',
      })
    }

    const produto = await client.query(
      `
      INSERT INTO public.pedidos (
        numero, categoria, categoria_outro, produto, filamento, cliente, 
        tempo_impressao_min, peso_gramas, valor_venda, status, pausado
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
      `,
      [
        newPedido.numero,
        newPedido.categoria,
        newPedido.categoriaOutro || null,
        newPedido.produto,
        newPedido.filamento,
        newPedido.cliente,
        newPedido.tempoImpressaoMin || 0,
        newPedido.pesoGramas || 0,
        newPedido.valorVenda || 0,
        newPedido.status || 'solicitado',
        newPedido.pausado || false,
      ],
    )

    if (produto.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(500).json({ message: 'Erro ao inserir pedido' })
    }

    await client.query('COMMIT')

    const createdOrder = {
      id: produto.rows[0].id,
      numero: produto.rows[0].numero,
      cliente: produto.rows[0].cliente,
      produto: produto.rows[0].produto,
      categoria: produto.rows[0].categoria,
      categoriaOutro: produto.rows[0].categoria_outro,
      filamento: produto.rows[0].filamento,
      tempoImpressaoMin: produto.rows[0].tempo_impressao_min,
      pesoGramas: produto.rows[0].peso_gramas,
      pausado: produto.rows[0].pausado,
      valorVenda: produto.rows[0].valor_venda,
      createdAt: produto.rows[0].created_at,
      status: produto.rows[0].status,
    }

    return res.json({ message: 'Pedido cadastrado com sucesso', data: createdOrder })
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Erro ao realizar rollback:', rollbackError)
    }
    console.error('Falha inesperada ao cadastrar pedido:', e)
    return res.status(500).json({ message: 'Falha inesperada ao cadastrar pedido', details: String(e) })
  } finally {
    client.release()
  }
})

// Editar pedido
router.put('/:id', async (req: Request, res: Response) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const pedidoId = req.params.id
    const parsed = pedidoUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Campos inválidos', errors: parsed.error.flatten() })
    }
    const updateData = parsed.data as any

    const existingPedido = await client.query('SELECT * FROM pedidos WHERE id = $1', [pedidoId])

    if (existingPedido.rows.length === 0) {
      await client.query('ROLLBACK')
      client.release()
      return res.status(404).json({ message: 'Pedido não encontrado' })
    }

    const allowedFields = [
      { frontend: 'cliente', backend: 'cliente' },
      { frontend: 'produto', backend: 'produto' },
      { frontend: 'categoria', backend: 'categoria' },
      { frontend: 'categoriaOutro', backend: 'categoria_outro' },
      { frontend: 'filamento', backend: 'filamento' },
      { frontend: 'tempoImpressaoMin', backend: 'tempo_impressao_min' },
      { frontend: 'pesoGramas', backend: 'peso_gramas' },
      { frontend: 'status', backend: 'status' },
      { frontend: 'pausado', backend: 'pausado' },
      { frontend: 'valorVenda', backend: 'valor_venda' },
    ] as const

    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramCount = 1

    for (const field of allowedFields) {
      if (updateData[field.frontend] !== undefined) {
        updateFields.push(`${field.backend} = $${paramCount}`)
        updateValues.push(updateData[field.frontend])
        paramCount++
      }
    }

    if (updateFields.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Nenhum campo válido fornecido para atualização' })
    }

    updateValues.push(pedidoId)
    const updateQuery = `UPDATE pedidos SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`

    const result = await client.query(updateQuery, updateValues)

    if (result.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(500).json({ message: 'Erro ao atualizar pedido' })
    }

    const updatedOrder = {
      id: result.rows[0].id,
      numero: result.rows[0].numero,
      cliente: result.rows[0].cliente,
      produto: result.rows[0].produto,
      categoria: result.rows[0].categoria,
      categoriaOutro: result.rows[0].categoria_outro,
      filamento: result.rows[0].filamento,
      tempoImpressaoMin: result.rows[0].tempo_impressao_min,
      pesoGramas: result.rows[0].peso_gramas,
      pausado: result.rows[0].pausado,
      valorVenda: result.rows[0].valor_venda,
      createdAt: result.rows[0].created_at,
      status: result.rows[0].status,
    }

    await client.query('COMMIT')

    return res.json({ message: 'Pedido atualizado com sucesso', data: updatedOrder })
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Erro ao realizar rollback:', rollbackError)
    }
    console.error('Falha inesperada ao atualizar pedido:', e)
    return res.status(500).json({ message: 'Falha inesperada ao atualizar pedido', details: String(e) })
  } finally {
    client.release()
  }
})

// Deletar pedido
router.delete('/:id', async (req: Request, res: Response) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const pedidoId = req.params.id

    const existingPedido = await client.query('SELECT * FROM pedidos WHERE id = $1', [pedidoId])

    if (existingPedido.rows.length === 0) {
      await client.query('ROLLBACK')
      client.release()
      return res.status(404).json({ message: 'Pedido não encontrado' })
    }

    const result = await client.query('DELETE FROM pedidos WHERE id = $1 RETURNING *', [pedidoId])

    if (result.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(500).json({ message: 'Erro ao deletar pedido' })
    }

    const deletedOrder = {
      id: result.rows[0].id,
      numero: result.rows[0].numero,
      cliente: result.rows[0].cliente,
      produto: result.rows[0].produto,
      categoria: result.rows[0].categoria,
      categoriaOutro: result.rows[0].categoria_outro,
      filamento: result.rows[0].filamento,
      tempoImpressaoMin: result.rows[0].tempo_impressao_min,
      pesoGramas: result.rows[0].peso_gramas,
      pausado: result.rows[0].pausado,
      valorVenda: result.rows[0].valor_venda,
      createdAt: result.rows[0].created_at,
      status: result.rows[0].status,
    }

    await client.query('COMMIT')

    return res.json({ message: 'Pedido removido com sucesso', data: deletedOrder })
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Erro ao realizar rollback:', rollbackError)
    }
    console.error('Falha inesperada ao deletar pedido:', e)
    return res.status(500).json({ message: 'Falha inesperada ao deletar pedido', details: String(e) })
  } finally {
    client.release()
  }
})

export default router
