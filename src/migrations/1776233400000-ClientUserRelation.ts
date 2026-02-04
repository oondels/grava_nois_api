import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientUserRelation1776233400000 implements MigrationInterface {
    name = 'ClientUserRelation1776233400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" ADD "user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" ADD CONSTRAINT "UQ_grn_clients_clients_user_id" UNIQUE ("user_id")`);
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" ADD CONSTRAINT "FK_grn_clients_clients_user_id" FOREIGN KEY ("user_id") REFERENCES "auth"."grn_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" DROP CONSTRAINT "FK_grn_clients_clients_user_id"`);
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" DROP CONSTRAINT "UQ_grn_clients_clients_user_id"`);
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" DROP COLUMN "user_id"`);
    }

}
