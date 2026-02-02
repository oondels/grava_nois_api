import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientRetentionDays1770057064202 implements MigrationInterface {
    name = 'ClientRetentionDays1770057064202'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" ADD "retentionDays" integer NOT NULL DEFAULT '3'`);
        await queryRunner.query(`COMMENT ON COLUMN "grn_clients"."clients"."retentionDays" IS 'Tempo em dias para manter os vídeos hospedados no S3'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "grn_clients"."clients"."retentionDays" IS 'Tempo em dias para manter os vídeos hospedados no S3'`);
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" DROP COLUMN "retentionDays"`);
    }

}
