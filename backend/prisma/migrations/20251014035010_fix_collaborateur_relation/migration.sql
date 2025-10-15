/*
  Warnings:

  - You are about to drop the column `userId` on the `Collaborateur` table. All the data in the column will be lost.
  - Made the column `projetId` on table `Collaborateur` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Collaborateur" DROP CONSTRAINT "Collaborateur_projetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Collaborateur" DROP CONSTRAINT "Collaborateur_userId_fkey";

-- AlterTable
ALTER TABLE "Collaborateur" DROP COLUMN "userId",
ALTER COLUMN "projetId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Collaborateur" ADD CONSTRAINT "Collaborateur_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
