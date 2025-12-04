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

  // Mesmo que no banco ainda esteja NOT NULL, para OAuth você já alterou pra aceitar NULL
  @Column({ type: "varchar", length: 255, nullable: true })
  password?: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "boolean", name: "is_active", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", name: "email_verified", default: false })
  emailVerified!: boolean;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp", name: "updated_at" })
  updatedAt!: Date;

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
