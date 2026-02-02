import { MigrationInterface, QueryRunner } from "typeorm";

export class LocalizacaoPadraoUsuario1769710803397 implements MigrationInterface {
    name = 'LocalizacaoPadraoUsuario1769710803397'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" ALTER COLUMN "county" SET DEFAULT 'BR'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" ALTER COLUMN "county" DROP DEFAULT`);
    }

}
