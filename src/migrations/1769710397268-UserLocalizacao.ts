import { MigrationInterface, QueryRunner } from "typeorm";

export class UserLocalizacao1769710397268 implements MigrationInterface {
    name = 'UserLocalizacao1769710397268'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" ADD "cep" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" ADD "state" text`);
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" ADD "city" text`);
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" ADD "county" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" DROP COLUMN "county"`);
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" DROP COLUMN "cep"`);
    }

}
