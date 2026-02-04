import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Client } from "../models/Clients";
import { Payment } from "../models/Payments";
import { Video } from "../models/Videos";
import { VenueInstallation } from "../models/VenueInstallations";
import { CustomError } from "../types/CustomError";
import { ClientInvoicesQuery, CreateClientInput, UpdateClientDto } from "../validation/client.schemas";
import { logger } from "../utils/logger";

export class ClientService {
  private clientRepository: Repository<Client>;
  private videoRepository: Repository<Video>;
  private venueRepository: Repository<VenueInstallation>;
  private paymentRepository: Repository<Payment>;

  constructor() {
    this.clientRepository = AppDataSource.getRepository(Client);
    this.videoRepository = AppDataSource.getRepository(Video);
    this.venueRepository = AppDataSource.getRepository(VenueInstallation);
    this.paymentRepository = AppDataSource.getRepository(Payment);
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
      subscriptionStatus: client.subscriptionStatus,
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

  async getClientStats(clientId: string) {
    const totalVideosPromise = this.videoRepository
      .createQueryBuilder("video")
      .innerJoin("video.venue", "venue", "venue.clientId = :clientId", { clientId })
      .getCount();

    const storageUsedPromise = this.videoRepository
      .createQueryBuilder("video")
      .innerJoin("video.venue", "venue", "venue.clientId = :clientId", { clientId })
      .select("COALESCE(SUM(video.sizeBytes), 0)", "storageUsed")
      .getRawOne<{ storageUsed: string | null }>();

    const activeVenuesPromise = this.venueRepository
      .createQueryBuilder("venue")
      .where("venue.clientId = :clientId", { clientId })
      .andWhere("venue.active = true")
      .getCount();

    // TODO: Corrigir contagem de usuarios vinculados ao cliente
    // const linkedUsersPromise = AppDataSource.createQueryBuilder()
    //   .select("COUNT(DISTINCT u.id)", "totalLinkedUsers")
    //   .from("auth.grn_users", "u")
    //   .innerJoin(
    //     "LATERAL jsonb_array_elements_text(COALESCE(u.quadras_filiadas, '[]'::jsonb)) q(value)",
    //     "q",
    //     "true"
    //   )
    //   .innerJoin(VenueInstallation, "venue", "venue.id = q.value::uuid")
    //   .where("venue.clientId = :clientId", { clientId })
    //   .getRawOne<{ totalLinkedUsers: string | null }>();

    const [totalVideos, storageUsedRaw, activeVenues] = await Promise.all([
      totalVideosPromise,
      storageUsedPromise,
      activeVenuesPromise,
      // linkedUsersPromise,
    ]);

    return {
      totalVideos,
      totalLinkedUsers: 0,
      storageUsed: Number(storageUsedRaw?.storageUsed ?? 0),
      activeVenues,
    };
  }

  async getInvoices(clientId: string, query: ClientInvoicesQuery) {
    const { page, limit, status, provider, from, to } = query;

    const qb = this.paymentRepository
      .createQueryBuilder("payment")
      .where("payment.clientId = :clientId", { clientId })
      .orderBy("payment.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere("payment.status = :status", { status });
    }

    if (provider) {
      qb.andWhere("payment.provider = :provider", { provider });
    }

    if (from) {
      qb.andWhere("payment.createdAt >= :from", { from });
    }

    if (to) {
      qb.andWhere("payment.createdAt <= :to", { to });
    }

    const [payments, total] = await qb.getManyAndCount();

    return {
      items: payments.map((payment) => ({
      id: payment.id,
      chargedAt: payment.createdAt,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt,
      dueAt: payment.dueAt,
      provider: payment.provider,
      method: payment.method,
      description: payment.description,
      providerPaymentId: payment.providerPaymentId,
      })),
      total,
      page,
      limit,
    };
  }

  async getSubscriptionStatus(clientId: string) {
    const client = await this.getClientById(clientId);
    return { subscriptionStatus: client.subscriptionStatus };
  }
}

export const clientService = new ClientService();
