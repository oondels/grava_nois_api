import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User, OauthProvider } from "./User";

@Entity({ name: "grn_users_oauth", schema: "auth" })
export class UserOauth {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id", unique: true })
  userId!: string;

  @OneToOne(() => User, (user: User) => user.oauth, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "text", name: "oauth_provider" })
  oauthProvider!: OauthProvider;

  @Column({ type: "text", name: "oauth_id" })
  oauthId!: string;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;
}
