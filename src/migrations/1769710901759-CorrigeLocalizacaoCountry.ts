import { MigrationInterface, QueryRunner } from "typeorm";

export class CorrigeLocalizacaoCountry1769710901759 implements MigrationInterface {
    name = 'CorrigeLocalizacaoCountry1769710901759'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" RENAME COLUMN "county" TO "country"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" RENAME COLUMN "country" TO "county"`);
    }

}
