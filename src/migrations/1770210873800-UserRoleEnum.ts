import { MigrationInterface, QueryRunner } from "typeorm";

export class UserRoleEnum1770210873800 implements MigrationInterface {
    name = 'UserRoleEnum1770210873800'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" DROP COLUMN "role"`);
        await queryRunner.query(`CREATE TYPE "auth"."grn_user_role_enum" AS ENUM('common', 'admin', 'client')`);
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" ADD "role" "auth"."grn_user_role_enum" NOT NULL DEFAULT 'common'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "auth"."grn_user_role_enum"`);
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" ADD "role" character varying(32) NOT NULL DEFAULT 'common'`);
    }

}
