-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "commission_type" AS ENUM ('percentage', 'fixed', 'both');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('OWNER', 'MASTER');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'MASTER',
    "employee_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT,
    "service_id" UUID,
    "employee_id" UUID,
    "appointment_date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "status" "appointment_status" DEFAULT 'scheduled',
    "cancel_reason" TEXT,
    "actual_price" DECIMAL,
    "commission_earned" DECIMAL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_services" (
    "employee_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,

    CONSTRAINT "employee_services_pkey" PRIMARY KEY ("employee_id","service_id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "position" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "experience_years" INTEGER DEFAULT 0,
    "specialization" TEXT,
    "certificates" TEXT,
    "avatar_url" TEXT,
    "commission_type" "commission_type",
    "commission_value" DECIMAL,
    "fixed_salary" DECIMAL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "image_url" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "is_working" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "break_start" TIME(6),
    "break_end" TIME(6),

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL DEFAULT 0.00,
    "duration_minutes" INTEGER DEFAULT 30,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "image_url" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_name" TEXT DEFAULT 'Моя Компания',
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "working_hours" TEXT,
    "logo_url" TEXT,
    "default_commission_type" "commission_type" DEFAULT 'percentage',
    "default_commission_value" DECIMAL DEFAULT 30.00,
    "telegram_report_enabled" BOOLEAN DEFAULT false,
    "daily_report_enabled" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "gallery" TEXT[],
    "about_us_image" TEXT,
    "telegram_chat_id" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_services" ADD CONSTRAINT "employee_services_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_services" ADD CONSTRAINT "employee_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
