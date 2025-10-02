/** 
 * Tabela que armazena as instalações do sistema em cada local (Cliente)
*/
import 'reflect-metadata';
import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, JoinColumn
} from 'typeorm';
import { Client } from './Clients';

// Simple enums (or use enum tables if you prefer)
export enum ContractMethod {
  PER_VIDEO = 'per_video',
  MONTHLY_SUBSCRIPTION = 'monthly_subscription',
}

export enum PaymentStatus {
  NONE = 'none',            // no subscription, or pay-per-video not prepaid
  ACTIVE = 'active',        // subscription paid and current
  PAST_DUE = 'past_due',    // subscription past due
  CANCELED = 'canceled',
}

export enum InstallationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DECOMMISSIONED = 'decommissioned',
}

@Entity({ schema: 'grn_core', name: 'venue_installations' })
@Index(['clientId', 'city'])
export class VenueInstallation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ---- Relations ----
  @Column({ type: 'uuid', name: 'client_id' })
  clientId!: string; // FK -> clients.id

  @ManyToOne(() => Client, { nullable: false })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  // ---- Basic identity ----
  @Column({ type: 'varchar', length: 120, name: 'venue_name' })
  venueName!: string; // "Quadra Society X", "Ginásio Y"

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  // ---- Address / Geo ----
  @Column({ type: 'varchar', length: 2, nullable: true })
  countryCode?: string | null; // "BR"

  @Column({ type: 'varchar', length: 255, nullable: true })
  state?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode?: string | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  latitude?: string | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  longitude?: string | null;

  // ---- Operational setup ----
  @Column({ type: 'int', default: 1 })
  cameraCount!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  firmwareVersion?: string | null; // Pi image/app version

  @Column({ type: 'varchar', length: 255, nullable: true })
  uploadEndpoint?: string | null; // where clips are posted

  @Column({ type: 'int', default: 30, name: 'buffer_pre_seconds' })
  bufferPreSeconds!: number;

  @Column({ type: 'int', default: 10, name: 'buffer_post_seconds' })
  bufferPostSeconds!: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  sportType?: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_online' })
  isOnline!: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'last_heartbeat_at' })
  lastHeartbeatAt?: Date | null;

  // ---- Network/Notes ----
  @Column({ type: 'varchar', length: 64, nullable: true })
  networkType?: string | null; // wifi/ethernet/4g/5g

  @Column({ type: 'text', nullable: true })
  networkNote?: string | null;

  // ---- Commercial / Billing snapshot (lightweight) ----
  @Column({ type: 'enum', enum: ContractMethod, default: ContractMethod.PER_VIDEO })
  contractMethod!: ContractMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.NONE })
  paymentStatus!: PaymentStatus;

  @Column({ type: 'uuid', nullable: true, name: 'contract_id' })
  contractId?: string | null; // FK -> contracts.id (optional shortcut)

  // ---- Lifecycle ----
  @Column({ type: 'enum', enum: InstallationStatus, default: InstallationStatus.ACTIVE })
  installationStatus!: InstallationStatus;

  @Column({ type: 'boolean', default: true })
  active!: boolean; // quick toggle used by ops/UI

  // ---- Auditing ----
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date | null;
}
