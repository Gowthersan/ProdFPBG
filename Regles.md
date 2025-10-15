/// ==============================
/// Prisma — FPBG (schéma renommé et aligné sur PDF)
/// ==============================
/// Ce schéma incorpore les renommages basés sur les termes du PDF (en français pour cohérence métier) :
/// - Modèles renommés : ex. AppelAProjet -> AppelProjets, ProjectSubmission -> DemandeSubvention, Activity -> Activite, etc.
/// - Champs renommés : ex. title -> titre, description -> description (déjà proche), code -> code, status -> statut, etc.
/// - Pas de changement structurel majeur : relations préservées, flux de données cohérent (ex. liens AAP → Thématiques → Demandes).
/// - Alignement PDF : Termes comme "Petite Subvention", "Subvention Moyenne", thématiques éligibles, pièces justificatives (DocumentKey), chronogramme (milestones).
/// - Pour inscription : Ajout de champs optionnels dans Utilisateur (role déduit, mais collecter typeOrganisation, typeSubvention préféré si applicable via org).
/// - Fonction d'identification rôle : Ajoutée comme exemple de méthode (non dans schema, mais à implémenter en backend, ex. middleware Node/Express).
/// - Migration : Utiliser `prisma migrate dev --name migration_francais` pour appliquer ; assurez-vous que les données existantes sont mappées (ex. via scripts).
/// - Référence constante au PDF : Thématiques, éligibilités, processus (note conceptuelle vs. complète), rapports, etc.
/// - Pas de méthodes backend changées : Seulement renommages pour cohérence flux (ex. soumission → évaluation → contrat → rapports).
/// - Pour page inscription : Modifiez pour collecter : email, mot de passe, nom/prénom, phone, typeOrganisation (enum), et liez à Organisation. Rôle déduit via route (fonction ci-dessous).

generator client {
provider = "prisma-client-js"
}

datasource db {
provider = "postgresql"
url = env("DATABASE_URL")
}

/// ==============================
/// Enums (référentiels fixes, renommés/alignés PDF)
/// ==============================

enum Role {
UTILISATEUR // Renommé de USER pour français
ADMINISTRATEUR // Renommé de ADMIN
}

enum TypeOrganisation { // Renommé de type, aligné PDF 3.5
ASSOCIATION
ONG
COMMUNAUTE
COOPERATIVE
PME
PMI
STARTUP
SECTEUR_PUBLIC // Entités gouvernementales
RECHERCHE // Organismes de recherche
PRIVE // Secteur privé
AUTRE
}

enum StadeProjet { // Renommé de ProjectStage
CONCEPTION
DEMARRAGE
AVANCE
PHASE_FINALE
}

enum TypeBudget { // Renommé de BudgetKind
DIRECT
INDIRECT
}

enum CleDocument { // Renommé de DocumentKey, aligné annexes PDF
LETTRE_MOTIVATION
CV
CERTIFICAT_ENREGISTREMENT
STATUTS_REGLEMENT
PV_ASSEMBLEE
RAPPORTS_FINANCIERS
RCCM
AGREMENT
ETATS_FINANCIERS
DOCUMENTS_STATUTAIRES
RIB
LETTRES_SOUTIEN
PREUVE_NON_FAILLITE
CARTOGRAPHIE
FICHE_CIRCUIT
BUDGET_DETAILLE
CHRONOGRAMME
}

enum StatutSoumission { // Renommé de SubmissionStatus
BROUILLON // DRAFT
SOUMIS // SUBMITTED
EN_REVUE // UNDER_REVIEW
APPROUVE // APPROVED
REJETE // REJECTED
}

enum TypeSoumission { // Inchangé, aligné processus PDF (note conceptuelle vs. complète)
NOTE_CONCEPTUELLE
PROPOSITION_COMPLETE
}

/// ==============================
/// Auth / Comptes (renommés)
/// ==============================
/// Renommages : User -> Utilisateur, org\* -> typeOrganisation etc.
/// Pour inscription : Collecter typeOrganisation, lier à Organisation.

model Utilisateur {
id String @id @default(uuid())
email String @unique
hashMotPasse String // Renommé de passwordHash
prenom String? // Renommé de firstName
nom String? // Renommé de lastName
telephone String? // Renommé de phone

role Role @default(UTILISATEUR)
actif Boolean @default(true)
organisation Organisation? @relation(fields: [idOrganisation], references: [id], onDelete: SetNull)
idOrganisation String?

sessions Session[]
soumissions DemandeSubvention[] // Soumissions faites
evaluations Evaluation[] // Évaluations faites

creeLe DateTime @default(now()) // Renommé de createdAt
misAJourLe DateTime @updatedAt // Renommé de updatedAt

@@index([idOrganisation])
}

model Session {
id String @id @default(uuid())
jeton String @unique // Renommé de token
utilisateur Utilisateur @relation(fields: [idUtilisateur], references: [id], onDelete: Cascade)
idUtilisateur String
agentUtilisateur String? // Renommé de userAgent
ip String?
expireLe DateTime // Renommé de expiresAt
creeLe DateTime @default(now())
}

/// ==============================
/// Référentiels AAP & Thématiques (renommés)
/// ==============================

model TypeSubvention {
id Int @id @default(autoincrement())
code String @unique // ex: "PETITE", "MOYENNE"
libelle String // Renommé de label
montantMinCfa BigInt
montantMaxCfa BigInt
dureeMaxMois Int

appels AppelProjets[]
thematiques Thematique[]
}

model AppelProjets { // Renommé de AppelAProjet
id String @id @default(cuid())
code String @unique // ex: AAP-OBL-2025
titre String
description String?
dateDebut DateTime
dateFin DateTime
etapes Json? // Renommé milestones, chronogramme PDF
typeSubvention TypeSubvention? @relation(fields: [idTypeSubvention], references: [id], onDelete: SetNull)
idTypeSubvention Int?

thematiques Thematique[]
organisations LienAppelOrganisation[] // Renommé de AProjetOrganisation
soumissions DemandeSubvention[]

creeLe DateTime @default(now())
misAJourLe DateTime @updatedAt

@@index([idTypeSubvention])
@@index([dateDebut, dateFin])
}

model Thematique {
id String @id @default(cuid())
appelProjets AppelProjets @relation(fields: [idAppelProjets], references: [id], onDelete: Cascade)
idAppelProjets String
titre String // Renommé de title
points String[] @default([]) // Renommé de bullets
ordre Int @default(0)
typeSubvention TypeSubvention @relation(fields: [idTypeSubvention], references: [id], onDelete: Restrict)
idTypeSubvention Int

creeLe DateTime @default(now())
misAJourLe DateTime @updatedAt

@@index([idAppelProjets, idTypeSubvention, ordre])
}

/// ==============================
/// Organisations & rattachements (renommés)
/// ==============================

model Organisation {
id String @id @default(cuid())
nom String
type TypeOrganisation
email String?
telephone String? // Renommé de phone

liensAppel LienAppelOrganisation[]
projets DemandeSubvention[]
utilisateurs Utilisateur[] // Renommé de users

creeLe DateTime @default(now())
misAJourLe DateTime @updatedAt

@@index([type])
@@index([nom])
}

model LienAppelOrganisation { // Renommé de AProjetOrganisation
id String @id @default(cuid())
appelProjets AppelProjets @relation(fields: [idAppelProjets], references: [id], onDelete: Cascade)
idAppelProjets String
organisation Organisation @relation(fields: [idOrganisation], references: [id], onDelete: Cascade)
idOrganisation String

statut String?
dateDebut DateTime?
dateFin DateTime?

activites Activite[]

@@unique([idAppelProjets, idOrganisation])
@@index([idAppelProjets])
@@index([idOrganisation])
}

/// ==============================
/// Soumission de projet (renommée DemandeSubvention)
/// ==============================
/// Renommages : title -> titre, location -> localisation, etc.

model DemandeSubvention {
id String @id @default(cuid())
code String? @unique
statut StatutSoumission @default(SOUMIS)

typeSoumission TypeSoumission @default(NOTE_CONCEPTUELLE)
idParent String?
parent DemandeSubvention? @relation("SoumissionsEnfants", fields: [idParent], references: [id], onDelete: SetNull)
enfants DemandeSubvention[] @relation("SoumissionsEnfants")

appelProjets AppelProjets? @relation(fields: [idAppelProjets], references: [id], onDelete: SetNull)
idAppelProjets String?
organisation Organisation? @relation(fields: [idOrganisation], references: [id], onDelete: SetNull)
idOrganisation String?

soumisPar Utilisateur? @relation(fields: [idSoumisPar], references: [id], onDelete: SetNull)
idSoumisPar String?

// Étape 1 — Proposition
titre String
localisation String // Renommé de location
groupeCible String // Renommé de targetGroup
justificationContexte String // Renommé de contextJustification

// Étape 2 — Objectifs & résultats
objectifs String
resultatsAttendus String // Renommé de expectedResults
dureeMois Int // Renommé de durationMonths

// Étape 3 — Activités
dateDebutActivites DateTime // Renommé de activitiesStartDate
dateFinActivites DateTime // Renommé de activitiesEndDate
resumeActivites String // Renommé de activitiesSummary

activites Activite[]
risques Risque[] // Renommé de Risk
piecesJointes PieceJointe[] // Renommé de Attachment
evaluations Evaluation[]
contrat Contrat?
rapports Rapport[] // Renommé de Report
cofinanceurs Cofinanceur[] // Renommé de Cofunder

// Budget
tauxUsd Int @default(600) // Renommé de usdRate
fraisIndirectsCfa Decimal @db.Decimal(14, 2) @default(0) // Renommé de indirectOverheadsCfa

terrainCfa Decimal? @db.Decimal(14, 2)
investCfa Decimal? @db.Decimal(14, 2)
overheadCfa Decimal? @db.Decimal(14, 2)
cofinCfa Decimal? @db.Decimal(14, 2)

// Autres étapes
stadeProjet StadeProjet @default(DEMARRAGE) // Renommé de projectStage
aFinancement Boolean @default(false) // Renommé de hasFunding
detailsFinancement String? // Renommé de fundingDetails
honneurAccepte Boolean @default(false) // Renommé de honorAccepted
texteDurabilite String // Renommé de sustainabilityText
texteReplication String? // Renommé de replicationText

creeLe DateTime @default(now())
misAJourLe DateTime @updatedAt

@@index([idSoumisPar, creeLe])
@@index([stadeProjet, statut])
@@index([idAppelProjets])
@@index([idOrganisation])
@@index([typeSoumission])
}

/// ==============================
/// Activités / Sous-activités / Budget (renommés)
/// ==============================

model Activite { // Renommé de Activity
id String @id @default(cuid())
demande DemandeSubvention @relation(fields: [idDemande], references: [id], onDelete: Cascade)
idDemande String

lienAppelOrganisation LienAppelOrganisation? @relation(fields: [idLienAppelOrganisation], references: [id], onDelete: SetNull)
idLienAppelOrganisation String?

ordre Int @default(0) // Renommé de order
titre String
debut DateTime // Renommé de start
fin DateTime // Renommé de end
resume String // Renommé de summary

sousActivites SousActivite[] // Renommé de subs
lignesBudget LigneBudget[] // Renommé de budgetLines

@@index([idDemande, ordre])
@@index([idLienAppelOrganisation])
@@index([debut, fin])
}

model SousActivite { // Renommé de SubActivity
id String @id @default(cuid())
activite Activite @relation(fields: [idActivite], references: [id], onDelete: Cascade)
idActivite String

ordre Int @default(0)
libelle String // Renommé de label
resume String? // Renommé de summary

@@index([idActivite, ordre])
}

model LigneBudget { // Renommé de BudgetLine
id String @id @default(cuid())
activite Activite @relation(fields: [idActivite], references: [id], onDelete: Cascade)
idActivite String

ordre Int @default(0)
libelle String // Renommé de label
type TypeBudget @default(DIRECT) // Renommé de kind
cfa Decimal @db.Decimal(14, 2)
pctFpbg Int @default(100) // Renommé de fpbgPct
pctCofin Int @default(0) // Renommé de cofinPct

@@index([idActivite, ordre])
}

/// ==============================
/// Risques & Pièces jointes (renommés)
/// ==============================

model Risque { // Renommé de Risk
id String @id @default(cuid())
demande DemandeSubvention @relation(fields: [idDemande], references: [id], onDelete: Cascade)
idDemande String

ordre Int @default(0)
description String
mitigation String

@@index([idDemande, ordre])
}

model PieceJointe { // Renommé de Attachment
id String @id @default(cuid())
demande DemandeSubvention @relation(fields: [idDemande], references: [id], onDelete: Cascade)
idDemande String

cle CleDocument
nomFichier String // Renommé de fileName
typeMime String // Renommé de mimeType
tailleOctets Int // Renommé de sizeBytes
cleStockage String // Renommé de storageKey
url String?
requis Boolean @default(false) // Renommé de required
telechargeLe DateTime @default(now()) // Renommé de uploadedAt
valideLe DateTime? // Renommé de validatedAt
validateur Utilisateur? @relation(fields: [idValidateur], references: [id], onDelete: SetNull)
idValidateur String?

@@unique([idDemande, cle])
@@index([cle])
@@index([idValidateur])
}

/// ==============================
/// Suivi post-soumission (renommés)
/// ==============================

model Evaluation {
id String @id @default(cuid())
demande DemandeSubvention @relation(fields: [idDemande], references: [id], onDelete: Cascade)
idDemande String

evaluateur Utilisateur @relation(fields: [idEvaluateur], references: [id], onDelete: Restrict)
idEvaluateur String
score Float?
commentaires String? // Renommé de comments
criteres Json? // Renommé de criteria

creeLe DateTime @default(now())
misAJourLe DateTime @updatedAt

@@index([idDemande])
@@index([idEvaluateur])
}

model Contrat {
id String @id @default(cuid())
demande DemandeSubvention @relation(fields: [idDemande], references: [id], onDelete: Cascade)
idDemande String @unique

signeLe DateTime? // Renommé de signedAt
planningDecaissement Json? // Renommé de disbursementSchedule

creeLe DateTime @default(now())
misAJourLe DateTime @updatedAt

@@index([idDemande])
}

model Rapport { // Renommé de Report
id String @id @default(cuid())
demande DemandeSubvention @relation(fields: [idDemande], references: [id], onDelete: Cascade)
idDemande String

type String // ex. : "intermediaire", "final"
dateEcheance DateTime // Renommé de dueDate
soumisLe DateTime? // Renommé de submittedAt
contenu String?

creeLe DateTime @default(now())
misAJourLe DateTime @updatedAt

@@index([idDemande, dateEcheance])
}

model Cofinanceur { // Renommé de Cofunder
id String @id @default(cuid())
demande DemandeSubvention @relation(fields: [idDemande], references: [id], onDelete: Cascade)
idDemande String

source String
montant Decimal @db.Decimal(14, 2)
enNature Boolean @default(false) // Renommé de inKind

creeLe DateTime @default(now())
misAJourLe DateTime @updatedAt

@@index([idDemande])
}

model JournalAudit { // Renommé de AuditLog
id String @id @default(cuid())
entite String // ex. : "DemandeSubvention"
idEntite String
action String // ex. : "mise_a_jour_statut"
idUtilisateur String?
details Json?

creeLe DateTime @default(now())

@@index([entite, idEntite])
@@index([idUtilisateur])
}

/// ==============================
/// OTP (renommé)
/// ==============================

model Otp {
id String @id @default(cuid())
nomUtilisateur String // Renommé de username
code String
expireLe DateTime // Renommé de expiresAt

creeLe DateTime @default(now())

@@index([nomUtilisateur])
@@index([expireLe])
}

// Exemple de fonction pour identifier rôle basé sur route (implémenter en backend, ex. middleware)
// Ne change pas méthodes existantes, juste ajoute pour cohérence flux.
// function determinerRoleParRoute(chemin: string): Role {
// if (chemin.startsWith('/admin')) {
// return Role.ADMINISTRATEUR;
// }
// return Role.UTILISATEUR;
// }

// Instructions pour agent IA : "Refais complètement les types et variables en renommant en français aligné PDF (ex. User -> Utilisateur, title -> titre), place-les exactement pour flux cohérent (soumission -> éval -> contrat), modifie inscription pour collecter role/typeSubvention/typeOrganisation via formulaire, migre DB avec Prisma migrate, relie tables comme schema exemple, réfère toujours à PDF pour méthodes (ex. traitement demandes section IV). N'ajoute/pas change méthodes backend, juste renomme."

// Pour organisation modèles : Groupe par catégorie (auth, référentiels, soumissions, suivi), utilise tables pour docs/comparaisons si besoin. Première étape : prisma migrate.
