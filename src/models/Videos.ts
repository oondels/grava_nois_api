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
import { Client } from './Clients';
import { VenueInstallation } from './VenueInstallations';

export enum VideoContractType {
  MONTHLY = 'monthly_subscription',
  PER_VIDEO = 'per_video',
}

export enum VideoStatus {
  QUEUED = 'queued',
  UPLOADED_TEMP = 'uploaded_temp',
  UPLOADED = 'uploaded',
  PREVIEW_READY = 'preview_ready',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  DELIVERED = 'delivered',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Entity({ schema: 'grn_videos', name: 'videos' })
@Index(['clientId', 'venueId', 'status'])
@Index(['expiresAt'], { where: `"status" IN ('uploaded_temp','preview_ready','pending_payment')` })
@Index(['clipId'], { unique: true })
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Chave natural usada em todo o pipeline (mensagens MQ, API, etc.)
  @Column({ type: 'varchar', length: 64, name: 'clip_id', unique: true })
  clipId!: string;

  // Relations
  @Column({ type: 'uuid', name: 'client_id' })
  clientId!: string;

  @ManyToOne(() => Client, { nullable: false })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @Column({ type: 'uuid', name: 'venue_id' })
  venueId!: string;

  @ManyToOne(() => VenueInstallation, { nullable: false })
  @JoinColumn({ name: 'venue_id' })
  venue!: VenueInstallation;

  // Contrato & Status
  @Column({ type: 'enum', enum: VideoContractType, name: 'contract', nullable: false })
  contract!: VideoContractType;

  @Column({ type: 'enum', enum: VideoStatus, name: 'status', default: VideoStatus.QUEUED })
  status!: VideoStatus;

  // Paths no Storage
  @Column({ type: 'text', name: 'storage_path', nullable: true })
  storagePath?: string | null;

  // Metadados técnicos
  @Column({ type: 'int', name: 'duration_sec', nullable: true })
  durationSec?: number | null;

  @Column({ type: 'bigint', name: 'size_bytes', nullable: true })
  sizeBytes?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sha256?: string | null;

  // Opcional: snapshot de meta (codec/fps/resolução)
  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, any> | null;

  // Datas
  @Column({ type: 'timestamp with time zone', name: 'captured_at' })
  capturedAt!: Date;

  @Column({ type: 'timestamp with time zone', name: 'expires_at', nullable: true })
  expiresAt?: Date | null;

  // Auditoria
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date | null;
}
