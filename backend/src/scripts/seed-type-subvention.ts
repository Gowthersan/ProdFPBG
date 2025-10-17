// Script pour initialiser les types de subvention dans la base de données
import prisma from '../config/db.js';

async function main() {
  console.log('🌱 Initialisation des types de subvention...');

  // Type 1: Petite subvention
  const petite = await prisma.typeSubvention.upsert({
    where: { code: 'PETITE' },
    update: {
      libelle: 'Petite subvention',
      montantMinCfa: BigInt(5_000_000),
      montantMaxCfa: BigInt(50_000_000),
      dureeMaxMois: 12,
    },
    create: {
      code: 'PETITE',
      libelle: 'Petite subvention',
      montantMinCfa: BigInt(5_000_000),
      montantMaxCfa: BigInt(50_000_000),
      dureeMaxMois: 12,
    },
  });

  console.log('✅ Petite subvention:', petite);

  // Type 2: Moyenne subvention
  const moyenne = await prisma.typeSubvention.upsert({
    where: { code: 'MOYENNE' },
    update: {
      libelle: 'Moyenne subvention',
      montantMinCfa: BigInt(51_000_000),
      montantMaxCfa: BigInt(200_000_000),
      dureeMaxMois: 24,
    },
    create: {
      code: 'MOYENNE',
      libelle: 'Moyenne subvention',
      montantMinCfa: BigInt(51_000_000),
      montantMaxCfa: BigInt(200_000_000),
      dureeMaxMois: 24,
    },
  });

  console.log('✅ Moyenne subvention:', moyenne);

  console.log('\n🎉 Types de subvention initialisés avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
