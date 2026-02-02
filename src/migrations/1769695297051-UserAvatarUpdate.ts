import { MigrationInterface, QueryRunner } from "typeorm";

export class UserAvatarUpdate1769695297051 implements MigrationInterface {
    name = 'UserAvatarUpdate1769695297051'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" ADD "avatarUrl" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" DROP COLUMN "avatarUrl"`);
    }

}
