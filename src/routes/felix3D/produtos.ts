import { Router, Request, Response } from 'express'
import { pool } from '../../config/pg'

const router = Router()

// Listar todos os produtos
router.get('/', async (req: Request, res: Response) => {
  console.log('listando produtos')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query('SELECT * FROM produtos ORDER BY created_at DESC')

    await client.query('COMMIT')

    const data = result.rows

    return res.json({ message: 'Produtos listados com sucesso', data })
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Erro ao fazer rollback:', rollbackError)
    }

    console.error('Falha inesperada ao listar produtos:', e)
    return res.status(500).json({ message: 'Falha inesperada ao listar produtos', details: String(e) })
  } finally {
    client.release()
  }
})

// Postar produto
router.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect()
  console.log('novo produto')

  try {
    await client.query('BEGIN')

    const newProduto = req.body as any

    if (!newProduto.nome) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        message: "Campo obrigatório 'nome' ausente",
      })
    }

    const existingProduct = await client.query('SELECT nome FROM produtos WHERE nome = $1', [newProduto.nome])

    if (existingProduct.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        message: 'Produto já existente com este nome.',
      })
    }

    const produto = await client.query(
      `
      INSERT INTO public.produtos (nome, peso_gramas, tempo_impressao_min, multicolor, mao_de_obra, valor) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
      `,
      [
        newProduto.nome,
        newProduto.peso_gramas || 0,
        newProduto.tempo_impressao_min || 0,
        newProduto.multicolor || false,
        newProduto.mao_de_obra || false,
        newProduto.valor || null,
      ],
    )

    if (produto.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(500).json({ message: 'Erro ao inserir produto' })
    }

    await client.query('COMMIT')

    return res.json({ message: 'Produto cadastrado com sucesso', data: produto.rows[0] })
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Erro ao realizar rollback:', rollbackError)
    }
    console.error('Falha inesperada ao cadastrar produto:', e)
    return res.status(500).json({ message: 'Falha inesperada ao cadastrar produto', details: String(e) })
  } finally {
    client.release()
  }
})

// Editar produto
router.put('/:id', async (req: Request, res: Response) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const produtoId = req.params.id
    const updateData = req.body as any

    const existingProduto = await client.query('SELECT * FROM produtos WHERE id = $1', [produtoId])

    if (existingProduto.rows.length === 0) {
      await client.query('ROLLBACK')
      client.release()
      return res.status(404).json({ message: 'Produto não encontrado' })
    }

    if (updateData.nome) {
      const duplicateName = await client.query('SELECT id FROM produtos WHERE nome = $1 AND id != $2', [updateData.nome, produtoId])

      if (duplicateName.rows.length > 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ message: 'Já existe outro produto com este nome' })
      }
    }

    const allowedFields = ['nome', 'peso_gramas', 'tempo_impressao_min', 'multicolor', 'mao_de_obra', 'valor'] as const
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramCount = 1

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`)
        updateValues.push(updateData[field])
        paramCount++
      }
    }

    if (updateFields.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Nenhum campo válido fornecido para atualização' })
    }

    updateValues.push(produtoId)

    const updateQuery = `UPDATE produtos SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`

    const result = await client.query(updateQuery, updateValues)

    if (result.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(500).json({ message: 'Erro ao atualizar produto' })
    }

    await client.query('COMMIT')

    return res.json({ message: 'Produto atualizado com sucesso', data: result.rows[0] })
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Erro ao realizar rollback:', rollbackError)
    }
    console.error('Falha inesperada ao atualizar produto:', e)
    return res.status(500).json({ message: 'Falha inesperada ao atualizar produto', details: String(e) })
  } finally {
    client.release()
  }
})

// Deletar produto
router.delete('/:id', async (req: Request, res: Response) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const produtoId = req.params.id

    const existingProduto = await client.query('SELECT * FROM produtos WHERE id = $1', [produtoId])

    if (existingProduto.rows.length === 0) {
      await client.query('ROLLBACK')
      client.release()
      return res.status(404).json({ message: 'Produto não encontrado' })
    }

    const pedidosUsandoProduto = await client.query('SELECT id FROM pedido_itens WHERE produto_id = $1 LIMIT 1', [produtoId])

    if (pedidosUsandoProduto.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        message: 'Não é possível excluir este produto pois ele está sendo usado em um ou mais pedidos',
      })
    }

    const result = await client.query('DELETE FROM produtos WHERE id = $1 RETURNING *', [produtoId])

    if (result.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(500).json({ message: 'Erro ao deletar produto' })
    }

    await client.query('COMMIT')

    return res.json({ message: 'Produto removido com sucesso', data: result.rows[0] })
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Erro ao realizar rollback:', rollbackError)
    }
    console.error('Falha inesperada ao deletar produto:', e)
    return res.status(500).json({ message: 'Falha inesperada ao deletar produto', details: String(e) })
  } finally {
    client.release()
  }
})

export default router
