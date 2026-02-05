import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientUserRelation21770213062115 implements MigrationInterface {
    name = 'ClientUserRelation21770213062115'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" DROP CONSTRAINT "FK_grn_clients_clients_user_id"`);
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" ADD CONSTRAINT "FK_07a7a09b04e7b035c9d90cf4984" FOREIGN KEY ("user_id") REFERENCES "auth"."grn_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" DROP CONSTRAINT "FK_07a7a09b04e7b035c9d90cf4984"`);
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" ADD CONSTRAINT "FK_grn_clients_clients_user_id" FOREIGN KEY ("user_id") REFERENCES "auth"."grn_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
