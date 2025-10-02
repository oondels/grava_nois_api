import { Router, Request, Response } from 'express'
import { supabaseDb } from '../config/pg'

export const userRouter = Router()

userRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id

    const user = await supabaseDb`
    select
      name, avatar_url, state, city, country, quadras, provider
    from grn_auth.profiles
    where user_id = ${userId}
  `

    res.status(200).json({
      message: "Usuario encontrado com sucesso",
      user: user[0] || null
    })
  } catch (error: any) {
    console.error("Erro ao buscar usuário:", error)

    res.status(500).json({
      status: 500,
      message: "Erro ao buscar usuário",
      error: error.message
    })
  }
})

// Atualiza dados do usuário: qualquer campo enviado diferente do banco é atualizado
userRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id
    const payload = (req.body || {}) as Record<string, any>

    // Busca o perfil completo para comparar
    const currentRows = await supabaseDb`
      select * from grn_auth.profiles where user_id = ${userId} limit 1
    `

    const current = currentRows?.[0]
    if (!current) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    // Campos não atualizáveis
    const blocked = new Set(['id', 'user_id', 'created_at', 'updated_at', 'deleted_at'])

    // Monte lista de alterações apenas para campos existentes no registro atual
    const updates: Record<string, any> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (blocked.has(key)) continue
      if (!(key in current)) continue

      const currVal = (current as any)[key]
      const changed = typeof value === 'object' && value !== null
        ? JSON.stringify(currVal) !== JSON.stringify(value)
        : currVal !== value
      if (changed) {
        updates[key] = value
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(200).json({ message: 'Nada para atualizar', user: current })
    }

    const updatedRows = await supabaseDb`
      update grn_auth.profiles
      set ${supabaseDb(updates)}, updated_at = now()
      where user_id = ${userId}
      returning *
    `

    const updated = updatedRows?.[0] || null
    return res.status(200).json({ message: 'Perfil atualizado com sucesso', user: updated })
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error)
    return res.status(500).json({ message: 'Erro ao atualizar usuário', error: error?.message || String(error) })
  }
})
