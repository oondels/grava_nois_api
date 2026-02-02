import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from "typeorm";
import { UserOauth } from "./UserOauth";

export type OauthProvider = "google" | "apple" | "github";

@Entity({ name: "grn_users", schema: "auth" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", unique: true })
  email!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  username?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  password?: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  avatarUrl?: string | null;

  @Column({ type: "boolean", name: "is_active", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", name: "email_verified", default: false })
  emailVerified!: boolean;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp", name: "updated_at" })
  updatedAt!: Date;

  @Column({ type: "jsonb", name: "quadras_filiadas", nullable: true })
  quadrasFiliadas?: any;

  @Column({ type: "varchar", length: 20, nullable: true })
  cep?: string | null;

  @Column({ type: "text", nullable: true })
  state?: string | null;

  @Column({ type: "text", nullable: true })
  city?: string | null;

  @Column({ type: "text", nullable: true, default: "BR" })
  country?: string | null;

  @Column({ type: "timestamp", name: "last_login_at", nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: "varchar", length: 32, default: "common" })
  role!: string;

  @Column({
    type: "varchar",
    length: 255,
    name: "oauth_id",
    nullable: true,
    unique: true,
  })
  oauthId?: string | null;

  @Column({
    type: "text",
    name: "oauth_provider",
    nullable: true,
  })
  oauthProvider?: OauthProvider | null;

  // Relação 1–1 com a tabela de OAuth detalhada
  @OneToOne(() => UserOauth, (oauth) => oauth.user)
  oauth?: UserOauth | null;
}
