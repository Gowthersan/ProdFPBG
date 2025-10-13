-- CreateTable
CREATE TABLE "TypeOrganisation" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypeOrganisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "numTel" TEXT,
    "postalAddress" TEXT,
    "physicalAddress" TEXT,
    "userType" TEXT,
    "otp" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "contact" TEXT,
    "numTel" TEXT,
    "postalAddress" TEXT,
    "physicalAddress" TEXT,
    "type" TEXT,
    "usernamePersonneContacter" TEXT,
    "typeOrganisationId" TEXT,
    "otp" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projet" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT,
    "title" TEXT,
    "actPrin" TEXT,
    "dateLimPro" TIMESTAMP(3),
    "rAtt" TEXT,
    "objP" TEXT,
    "conjP" TEXT,
    "lexGcp" TEXT,
    "poRistEnvSoPo" TEXT,
    "dPRep" TEXT,
    "conseilPr" TEXT,
    "cv" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ficheC" TEXT,
    "lM" TEXT,
    "stR" TEXT,
    "rib" TEXT,
    "cA" TEXT,
    "budgetD" TEXT,
    "che" TEXT,
    "cartography" TEXT,
    "lP" TEXT,
    "stade" TEXT,
    "funding" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppelAProjet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "resume" TEXT NOT NULL,
    "contexte" TEXT NOT NULL,
    "objectif" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "geographicEligibility" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibleOrganisations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibleActivities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cofinancement" TEXT,
    "annexes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "launchDate" TIMESTAMP(3) NOT NULL,
    "cover" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppelAProjet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subvention" (
    "id" TEXT NOT NULL,
    "appelAProjetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountMin" INTEGER NOT NULL,
    "amountMax" INTEGER NOT NULL,
    "durationMaxMonths" INTEGER NOT NULL,
    "deadlineNoteConceptuelle" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subvention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleStep" (
    "id" TEXT NOT NULL,
    "subventionId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "dates" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thematique" (
    "id" TEXT NOT NULL,
    "appelAProjetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "typeSubvention" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thematique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TypeOrganisation_nom_key" ON "TypeOrganisation"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_username_key" ON "Organisation"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_email_key" ON "Organisation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AppelAProjet_code_key" ON "AppelAProjet"("code");

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_typeOrganisationId_fkey" FOREIGN KEY ("typeOrganisationId") REFERENCES "TypeOrganisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projet" ADD CONSTRAINT "Projet_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subvention" ADD CONSTRAINT "Subvention_appelAProjetId_fkey" FOREIGN KEY ("appelAProjetId") REFERENCES "AppelAProjet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleStep" ADD CONSTRAINT "CycleStep_subventionId_fkey" FOREIGN KEY ("subventionId") REFERENCES "Subvention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thematique" ADD CONSTRAINT "Thematique_appelAProjetId_fkey" FOREIGN KEY ("appelAProjetId") REFERENCES "AppelAProjet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
