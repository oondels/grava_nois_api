import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VenueInstallation } from './VenueInstallations';
import { Client } from './Clients';

export enum PaymentProvider {
  STRIPE = 'stripe',
  MERCADO_PAGO = 'mercado_pago',
  ABACATE_PAY = 'abacate_pay',
  MANUAL = 'manual',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PIX = 'pix',
  BOLETO = 'boleto',
  CASH = 'cash',
}

export enum PaymentStatus {
  PENDING = 'pending',      // created but not completed yet
  PAID = 'paid',            // confirmed
  FAILED = 'failed',        // attempt failed
  REFUNDED = 'refunded',    // fully refunded
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELED = 'canceled',    // voided before payment
}

@Entity({ schema: 'grn_billing', name: 'payments' })
@Index(['clientId', 'installationId'])
@Index(['status'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ---- Relations ----
  @Column({ type: 'uuid', name: 'client_id' })
  clientId!: string;

  @ManyToOne(() => Client, { nullable: false })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @Column({ type: 'uuid', name: 'installation_id', nullable: true })
  installationId?: string | null;

  @ManyToOne(() => VenueInstallation, { nullable: true })
  @JoinColumn({ name: 'installation_id' })
  installation?: VenueInstallation;

  // ---- Payment details ----
  @Column({ type: 'enum', enum: PaymentProvider })
  provider!: PaymentProvider;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  method?: PaymentMethod | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerPaymentId?: string | null; // e.g., Stripe charge ID, MercadoPago payment ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerCustomerId?: string | null; // optional link to provider customer record

  // ---- Financial amounts ----
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount!: string; // store as string to preserve precision

  @Column({ type: 'varchar', length: 3, default: 'BRL' })
  currency!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  feeAmount!: string; // gateway fee, if applicable

  // ---- Metadata ----
  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null; // "Monthly subscription - July 2025"

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null; // store any provider webhook payload

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt?: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  dueAt?: Date | null;

  // ---- Auditing ----
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date | null;
}
