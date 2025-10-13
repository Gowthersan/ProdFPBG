-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "grantType" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "username" DROP NOT NULL;
