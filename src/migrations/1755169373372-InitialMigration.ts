import { MigrationInterface, QueryRunner } from "typeorm";

export class AlteracaoSchemas1755169373372 implements MigrationInterface {
    name = 'AlteracaoSchemas1755169373372'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "grn_clients"."clients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "legalName" character varying(255) NOT NULL, "tradeName" character varying(255), "cnpj" character varying(14), "responsibleCpf" character varying(11), "responsibleName" character varying(255), "responsibleEmail" character varying(255), "responsiblePhone" character varying(20), "paymentCustomerId" character varying(255), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a63843865a50448e5238d5bd86" ON "grn_clients"."clients" ("cnpj") WHERE "cnpj" IS NOT NULL`);
        await queryRunner.query(`CREATE TYPE "grn_core"."venue_installations_contractmethod_enum" AS ENUM('per_video', 'monthly_subscription')`);
        await queryRunner.query(`CREATE TYPE "grn_core"."venue_installations_paymentstatus_enum" AS ENUM('none', 'active', 'past_due', 'canceled')`);
        await queryRunner.query(`CREATE TYPE "grn_core"."venue_installations_installationstatus_enum" AS ENUM('active', 'paused', 'decommissioned')`);
        await queryRunner.query(`CREATE TABLE "grn_core"."venue_installations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "client_id" uuid NOT NULL, "venue_name" character varying(120) NOT NULL, "description" character varying(255), "countryCode" character varying(2), "state" character varying(255), "city" character varying(255), "addressLine" character varying(255), "postalCode" character varying(20), "latitude" numeric(9,6), "longitude" numeric(9,6), "cameraCount" integer NOT NULL DEFAULT '1', "firmwareVersion" character varying(64), "uploadEndpoint" character varying(255), "buffer_pre_seconds" integer NOT NULL DEFAULT '30', "buffer_post_seconds" integer NOT NULL DEFAULT '10', "sportType" character varying(32), "is_online" boolean NOT NULL DEFAULT true, "last_heartbeat_at" TIMESTAMP WITH TIME ZONE, "networkType" character varying(64), "networkNote" text, "contractMethod" "grn_core"."venue_installations_contractmethod_enum" NOT NULL DEFAULT 'per_video', "paymentStatus" "grn_core"."venue_installations_paymentstatus_enum" NOT NULL DEFAULT 'none', "contract_id" uuid, "installationStatus" "grn_core"."venue_installations_installationstatus_enum" NOT NULL DEFAULT 'active', "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_afb6f6a1cb21a6f50dd5f3fcd77" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_addf546f089e2844b405a4a5bd" ON "grn_core"."venue_installations" ("client_id", "city") `);
        await queryRunner.query(`CREATE TYPE "grn_billing"."payments_provider_enum" AS ENUM('stripe', 'mercado_pago', 'manual')`);
        await queryRunner.query(`CREATE TYPE "grn_billing"."payments_method_enum" AS ENUM('credit_card', 'pix', 'boleto', 'cash')`);
        await queryRunner.query(`CREATE TYPE "grn_billing"."payments_status_enum" AS ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'canceled')`);
        await queryRunner.query(`CREATE TABLE "grn_billing"."payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "client_id" uuid NOT NULL, "installation_id" uuid, "provider" "grn_billing"."payments_provider_enum" NOT NULL, "method" "grn_billing"."payments_method_enum", "status" "grn_billing"."payments_status_enum" NOT NULL DEFAULT 'pending', "providerPaymentId" character varying(255), "providerCustomerId" character varying(255), "amount" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'BRL', "feeAmount" numeric(10,2) NOT NULL DEFAULT '0', "description" character varying(255), "metadata" jsonb, "paidAt" TIMESTAMP WITH TIME ZONE, "dueAt" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON "grn_billing"."payments" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_2cb5aef88302c15585bcb1ccdf" ON "grn_billing"."payments" ("client_id", "installation_id") `);
        await queryRunner.query(`ALTER TABLE "grn_core"."venue_installations" ADD CONSTRAINT "FK_20119078ac7c3e51183018f0d32" FOREIGN KEY ("client_id") REFERENCES "grn_clients"."clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "grn_billing"."payments" ADD CONSTRAINT "FK_bce3f30c3460065a6aeca163258" FOREIGN KEY ("client_id") REFERENCES "grn_clients"."clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "grn_billing"."payments" ADD CONSTRAINT "FK_344383acbdf9be115e063f4b07b" FOREIGN KEY ("installation_id") REFERENCES "grn_core"."venue_installations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "grn_billing"."payments" DROP CONSTRAINT "FK_344383acbdf9be115e063f4b07b"`);
        await queryRunner.query(`ALTER TABLE "grn_billing"."payments" DROP CONSTRAINT "FK_bce3f30c3460065a6aeca163258"`);
        await queryRunner.query(`ALTER TABLE "grn_core"."venue_installations" DROP CONSTRAINT "FK_20119078ac7c3e51183018f0d32"`);
        await queryRunner.query(`DROP INDEX "grn_billing"."IDX_2cb5aef88302c15585bcb1ccdf"`);
        await queryRunner.query(`DROP INDEX "grn_billing"."IDX_32b41cdb985a296213e9a928b5"`);
        await queryRunner.query(`DROP TABLE "grn_billing"."payments"`);
        await queryRunner.query(`DROP TYPE "grn_billing"."payments_status_enum"`);
        await queryRunner.query(`DROP TYPE "grn_billing"."payments_method_enum"`);
        await queryRunner.query(`DROP TYPE "grn_billing"."payments_provider_enum"`);
        await queryRunner.query(`DROP INDEX "grn_core"."IDX_addf546f089e2844b405a4a5bd"`);
        await queryRunner.query(`DROP TABLE "grn_core"."venue_installations"`);
        await queryRunner.query(`DROP TYPE "grn_core"."venue_installations_installationstatus_enum"`);
        await queryRunner.query(`DROP TYPE "grn_core"."venue_installations_paymentstatus_enum"`);
        await queryRunner.query(`DROP TYPE "grn_core"."venue_installations_contractmethod_enum"`);
        await queryRunner.query(`DROP INDEX "grn_clients"."IDX_a63843865a50448e5238d5bd86"`);
        await queryRunner.query(`DROP TABLE "grn_clients"."clients"`);
    }

}
