-- AlterTable
ALTER TABLE "Projet" ADD COLUMN     "activities" JSONB,
ADD COLUMN     "activitiesEndDate" TIMESTAMP(3),
ADD COLUMN     "activitiesStartDate" TIMESTAMP(3),
ADD COLUMN     "activitiesSummary" TEXT,
ADD COLUMN     "agrement" TEXT,
ADD COLUMN     "budgetActivities" JSONB,
ADD COLUMN     "budgetDetaille" TEXT,
ADD COLUMN     "cartographie" TEXT,
ADD COLUMN     "chronogramme" TEXT,
ADD COLUMN     "contextJustification" TEXT,
ADD COLUMN     "cote" TEXT,
ADD COLUMN     "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "durationMonths" INTEGER,
ADD COLUMN     "expectedResults" TEXT,
ADD COLUMN     "ficheCircuit" TEXT,
ADD COLUMN     "fundingDetails" TEXT,
ADD COLUMN     "hasFunding" BOOLEAN DEFAULT false,
ADD COLUMN     "honorAccepted" BOOLEAN DEFAULT false,
ADD COLUMN     "indirectOverheads" INTEGER DEFAULT 0,
ADD COLUMN     "lettreMotivation" TEXT,
ADD COLUMN     "lettreSoutien" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "objectives" TEXT,
ADD COLUMN     "projectStage" TEXT,
ADD COLUMN     "replicability" TEXT,
ADD COLUMN     "risks" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'BROUILLON',
ADD COLUMN     "statutsReglement" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "sustainability" TEXT,
ADD COLUMN     "targetGroup" TEXT,
ADD COLUMN     "usdRate" INTEGER DEFAULT 655;

-- CreateTable
CREATE TABLE "Collaborateur" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "role" TEXT,
    "projetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collaborateur_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Collaborateur" ADD CONSTRAINT "Collaborateur_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collaborateur" ADD CONSTRAINT "Collaborateur_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
