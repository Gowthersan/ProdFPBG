/*
  Warnings:

  - The `objectives` column on the `Projet` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Projet" DROP COLUMN "objectives",
ADD COLUMN     "objectives" JSONB;
