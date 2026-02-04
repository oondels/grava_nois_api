import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Client } from "../models/Clients";
import { CustomError } from "../types/CustomError";
import { CreateClientInput, UpdateClientDto } from "../validation/client.schemas";
import { logger } from "../utils/logger";

export class ClientService {
  private clientRepository: Repository<Client>;

  constructor() {
    this.clientRepository = AppDataSource.getRepository(Client);
  }

  private toClientView(client: Client) {
    return {
      id: client.id,
      legalName: client.legalName,
      tradeName: client.tradeName,
      responsibleName: client.responsibleName,
      responsibleEmail: client.responsibleEmail,
      responsiblePhone: client.responsiblePhone,
      retentionDays: client.retentionDays,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  async createClient(data: CreateClientInput) {
    try {
      // Verificar se já existe cliente com o mesmo email
      const existingClient = await this.clientRepository.findOne({
        where: { responsibleEmail: data.responsibleEmail }
      });

      if (existingClient) {
        throw new CustomError("Cliente com este email já existe", 409);
      }

      // Verificar CNPJ se fornecido
      if (data.cnpj) {
        const existingCnpj = await this.clientRepository.findOne({
          where: { cnpj: data.cnpj }
        });

        if (existingCnpj) {
          throw new CustomError("Cliente com este CNPJ já existe", 409);
        }
      }

      // Verificar CPF se fornecido
      if (data.responsibleCpf) {
        const existingCpf = await this.clientRepository.findOne({
          where: { responsibleCpf: data.responsibleCpf }
        });

        if (existingCpf) {
          throw new CustomError("Cliente com este CPF já existe", 409);
        }
      }

      const newClient = this.clientRepository.create({
        legalName: data.legalName,
        tradeName: data.tradeName,
        responsibleEmail: data.responsibleEmail,
        responsibleName: data.responsibleName,
        responsiblePhone: data.responsiblePhone,
        cnpj: data.cnpj,
        responsibleCpf: data.responsibleCpf,
        retentionDays: data.retentionDays,
      });

      await this.clientRepository.save(newClient);

      logger.info("client-service", `Client created: ${newClient.id}`);

      return newClient;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error("client-service", `Error creating client: ${error}`);
      throw new CustomError("Erro ao criar cliente", 500);
    }
  }

  async getClientById(id: string) {
    const client = await this.clientRepository.findOne({
      where: { id }
    });

    if (!client) {
      throw new CustomError("Cliente não encontrado", 404);
    }

    return client;
  }

  async getMe(clientId: string) {
    const client = await this.getClientById(clientId);
    return this.toClientView(client);
  }

  async updateMe(clientId: string, data: UpdateClientDto) {
    const client = await this.getClientById(clientId);

    if (data.tradeName !== undefined) {
      client.tradeName = data.tradeName;
    }
    if (data.responsibleName !== undefined) {
      client.responsibleName = data.responsibleName;
    }
    if (data.responsibleEmail !== undefined) {
      client.responsibleEmail = data.responsibleEmail;
    }
    if (data.responsiblePhone !== undefined) {
      client.responsiblePhone = data.responsiblePhone;
    }

    const updated = await this.clientRepository.save(client);
    logger.info("client-service", `Client updated by client: ${clientId}`);
    return this.toClientView(updated);
  }
}

export const clientService = new ClientService();
