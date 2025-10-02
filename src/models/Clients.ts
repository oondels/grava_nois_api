import 'reflect-metadata';
import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, JoinColumn
} from 'typeorm';

@Entity({ schema: 'grn_clients', name: 'clients' })
@Index(['cnpj'], { unique: true, where: '"cnpj" IS NOT NULL' })
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  legalName!: string; // Razão social ou nome

  @Column({ type: 'varchar', length: 255, nullable: true })
  tradeName?: string | null; // Nome fantasia

  @Column({ type: 'varchar', length: 14, nullable: true })
  cnpj?: string | null;

  @Column({ type: 'varchar', length: 11, nullable: true })
  responsibleCpf?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  responsibleName?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  responsibleEmail?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  responsiblePhone?: string | null;

  // Optional: link to payment provider customer
  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentCustomerId?: string | null; // Stripe/MercadoPago id

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date | null;
}
