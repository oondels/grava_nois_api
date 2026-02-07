import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientSubscription1770507840491 implements MigrationInterface {
    name = 'ClientSubscription1770507840491'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "grn_clients"."grn_client_subscription_status_enum" AS ENUM('active', 'pending', 'past_due', 'canceled')`);
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" ADD "subscriptionStatus" "grn_clients"."grn_client_subscription_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TYPE "grn_billing"."payments_provider_enum" RENAME TO "payments_provider_enum_old"`);
        await queryRunner.query(`CREATE TYPE "grn_billing"."payments_provider_enum" AS ENUM('stripe', 'mercado_pago', 'abacate_pay', 'manual')`);
        await queryRunner.query(`ALTER TABLE "grn_billing"."payments" ALTER COLUMN "provider" TYPE "grn_billing"."payments_provider_enum" USING "provider"::"text"::"grn_billing"."payments_provider_enum"`);
        await queryRunner.query(`DROP TYPE "grn_billing"."payments_provider_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "grn_billing"."payments_provider_enum_old" AS ENUM('stripe', 'mercado_pago', 'manual')`);
        await queryRunner.query(`ALTER TABLE "grn_billing"."payments" ALTER COLUMN "provider" TYPE "grn_billing"."payments_provider_enum_old" USING "provider"::"text"::"grn_billing"."payments_provider_enum_old"`);
        await queryRunner.query(`DROP TYPE "grn_billing"."payments_provider_enum"`);
        await queryRunner.query(`ALTER TYPE "grn_billing"."payments_provider_enum_old" RENAME TO "payments_provider_enum"`);
        await queryRunner.query(`ALTER TABLE "grn_clients"."clients" DROP COLUMN "subscriptionStatus"`);
        await queryRunner.query(`DROP TYPE "grn_clients"."grn_client_subscription_status_enum"`);
    }

}
