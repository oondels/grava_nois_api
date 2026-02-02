import { MigrationInterface, QueryRunner } from "typeorm";

export class UserQuadras1769707712197 implements MigrationInterface {
    name = 'UserQuadras1769707712197'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" ADD "quadras_filiadas" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."grn_users" DROP COLUMN "quadras_filiadas"`);
    }

}
