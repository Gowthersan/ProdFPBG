import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { JwtPayload, LoginVM, OrganisationDTO, UtilisateurDTO } from '../types/index.js';
import { generateOtp } from '../utils/generateOtp.js';
import { sendOTPEmail } from '../utils/mailer.js';

// Stockage temporaire des inscriptions en attente (en production, utilisez Redis)
const pendingRegistrations: {
  [email: string]: {
    registrationData: any;
    otp: string;
    otpExpiry: Date;
    type: 'user' | 'organisation';
  };
} = {};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET n'est pas défini dans les variables d'environnement");
  }
  return secret;
};

/**
 * Convertir les BigInt en string pour la sérialisation JSON
 */
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      serialized[key] = serializeBigInt(obj[key]);
    }
    return serialized;
  }

  return obj;
}

export class AuthService {
  /**
   * INSCRIPTION - Étape 1 : Enregistrer un agent FPBG et envoyer l'OTP
   * Cette méthode génère un code OTP et l'envoie par email à l'utilisateur
   */
  async registerAgentFpbg(userData: UtilisateurDTO) {
    const { email, nomUtilisateur, motDePasse } = userData;

    // ====================================
    // 1. Vérifier si l'utilisateur existe déjà
    // ====================================
    const existingUser = await prisma.utilisateur.findFirst({
      where: {
        OR: [{ email }]
      }
    });

    if (existingUser) {
      throw new AppError("Email ou nom d'utilisateur déjà utilisé.", 409);
    }

    // ====================================
    // 2. Hasher le mot de passe pour la sécurité
    // ====================================
    const hashedPassword = await bcrypt.hash(motDePasse, 12);

    // ====================================
    // 3. Générer le code OTP (6 chiffres, valide 5 minutes)
    // ====================================
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // ====================================
    // 4. Stocker temporairement les données d'inscription
    // ====================================
    pendingRegistrations[email] = {
      registrationData: { ...userData, motDePasse: hashedPassword },
      otp,
      otpExpiry,
      type: 'user'
    };

    // ====================================
    // 5. Envoyer l'OTP par email via Nodemailer
    // ====================================
    console.log(`📧 OTP généré pour ${email}: ${otp}`);

    try {
      await sendOTPEmail(email, otp, userData.prenom || userData.nomUtilisateur || 'Utilisateur');
      console.log(`✅ Email OTP envoyé à ${email}`);
    } catch (error: any) {
      console.error(`❌ Erreur envoi email à ${email}:`, error.message);
      throw new AppError("Impossible d'envoyer l'email de vérification", 500);
    }

    return {
      message: 'Un code de vérification a été envoyé à votre adresse email.',
      email
    };
  }

  /**
   * INSCRIPTION - Étape 1 : Enregistrer une organisation et envoyer l'OTP
   * Cette méthode génère un code OTP et l'envoie par email à l'organisation
   */
  async registerOrganisation(orgData: OrganisationDTO) {
    const { email, motDePasse, ...otherData } = orgData;

    // ====================================
    // 1. Vérifier si l'email existe déjà (Utilisateur ou Organisation)
    // ====================================
    const existingUser = await prisma.utilisateur.findUnique({ where: { email } });
    const existingOrg = await prisma.organisation.findFirst({ where: { email } });

    if (existingUser || existingOrg) {
      throw new AppError('Cet email est déjà utilisé.', 409);
    }

    // ====================================
    // 2. Valider et hasher le mot de passe
    // ====================================
    if (!motDePasse || typeof motDePasse !== 'string' || motDePasse.trim() === '') {
      throw new AppError('Un mot de passe valide est requis.', 400);
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 6); // Supprimez l'opérateur !

    // ====================================
    // 3. Générer le code OTP (6 chiffres, valide 5 minutes)
    // ====================================
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // ====================================
    // 4. Stocker temporairement les données d'inscription
    // ====================================
    pendingRegistrations[email] = {
      registrationData: { ...orgData, password: hashedPassword },
      otp,
      otpExpiry,
      type: 'organisation'
    };

    // ====================================
    // 5. Envoyer l'OTP par email via Nodemailer
    // ====================================
    console.log(`📧 OTP généré pour ${email}: ${otp}`);

    try {
      await sendOTPEmail(email, otp, orgData.nom_organisation || orgData.personneContact || 'Organisation');
      console.log(`✅ Email OTP envoyé à ${email}`);
    } catch (error: any) {
      console.error(`❌ Erreur envoi email à ${email}:`, error.message);
      throw new AppError("Impossible d'envoyer l'email de vérification", 500);
    }

    return {
      message: 'Un code de vérification a été envoyé à votre adresse email.',
      email
    };
  }

  /**
   * INSCRIPTION - Étape 2 : Vérifier l'OTP et créer le compte
   * Cette méthode vérifie le code OTP entré par l'utilisateur,
   * crée le compte dans la base de données, et génère un token JWT
   */
  async verifyOtp(email: string, otp: string) {
    // ====================================
    // 1. Récupérer les données d'inscription en attente
    // ====================================
    const pending = pendingRegistrations[email];

    if (!pending) {
      throw new AppError('Aucune inscription en attente pour cet email.', 400);
    }

    // ====================================
    // 2. Vérifier que le code OTP est correct
    // ====================================
    if (pending.otp !== otp) {
      throw new AppError('Code OTP invalide.', 400);
    }

    // ====================================
    // 3. Vérifier que le code OTP n'est pas expiré (5 minutes)
    // ====================================
    if (pending.otpExpiry < new Date()) {
      delete pendingRegistrations[email];
      throw new AppError("Code OTP expiré. Veuillez recommencer l'inscription.", 400);
    }

    const { registrationData, type } = pending;

    try {
      if (type === 'user') {
        // ====================================
        // 4a. UTILISATEUR : Créer le compte utilisateur
        // ====================================
        const user = await prisma.utilisateur.create({
          data: {
            email: registrationData.email,
            hashMotPasse: registrationData.motDePasse,
            prenom: registrationData.prenom ?? null,
            nom: registrationData.nom ?? null,
            telephone: registrationData.telephone ?? null,
            role: 'UTILISATEUR'
          }
        });

        // Supprimer les données temporaires
        delete pendingRegistrations[email];

        // ====================================
        // 5a. Générer le token JWT pour la session
        // ====================================
        const token = this.generateToken({
          userId: user.id,
          email: user.email,
          userType: 'user'
        });

        const { hashMotPasse: _, ...userWithoutPassword } = user;

        // ====================================
        // 6. Retourner les données avec le chemin de redirection
        // ====================================
        return {
          message: 'Compte vérifié avec succès !',
          token,
          user: userWithoutPassword,
          type: 'user',
          redirectTo: '/soumission' // 🎯 Redirection vers soumission
        };
      } else {
        // ====================================
        // 4b. ORGANISATION : Créer User → Organisation → TypeOrganisation
        // ====================================
        const result = await prisma.$transaction(async (tx) => {
          // ÉTAPE 1: Créer l'Utilisateur en premier
          const user = await tx.utilisateur.create({
            data: {
              email: registrationData.email,
              hashMotPasse: registrationData.password,
              prenom: registrationData.prenom ?? registrationData.personneContact ?? null,
              nom: registrationData.nom ?? null,
              telephone: registrationData.telephone ?? registrationData.telephoneContact ?? null,
              role: 'UTILISATEUR'
            }
          });

          // ÉTAPE 2: Mapper le type d'organisation vers l'enum TypeOrganisation
          const mapTypeOrganisation = (type: string): any => {
            const mapping: Record<string, string> = {
              'Secteur privé (PME, PMI, Startups)': 'PRIVE',
              'ONG et Associations': 'ONG',
              'Coopératives communautaires': 'COOPERATIVE',
              'Communautés organisées': 'COMMUNAUTE',
              'Entités gouvernementales': 'SECTEUR_PUBLIC',
              'Organismes de recherche': 'RECHERCHE'
            };
            return mapping[type] || 'AUTRE';
          };

          // ÉTAPE 2.5: Trouver le TypeSubvention correspondant
          let idTypeSubvention: number | undefined;
          if (registrationData.typeSubvention) {
            const typeSubventionStr = registrationData.typeSubvention.toLowerCase();
            const code = typeSubventionStr.includes('petite') ? 'PETITE' :
                         typeSubventionStr.includes('moyenne') ? 'MOYENNE' : null;

            if (code) {
              const typeSubvention = await tx.typeSubvention.findUnique({
                where: { code }
              });
              idTypeSubvention = typeSubvention?.id;
            }
          }

          // ÉTAPE 3: Créer l'Organisation liée
          const type = registrationData.type;
          const organisation = await tx.organisation.create({
            data: {
              nom: registrationData.nom_organisation ?? registrationData.type ?? 'Organisation',
              type: mapTypeOrganisation(type),
              email: registrationData.email,
              telephone: registrationData.telephone ?? registrationData.telephoneContact ?? null,
              idTypeSubvention, // 🎯 Sauvegarder le type de subvention choisi
              utilisateurs: {
                connect: { id: user.id } // 🔗 Lier l'utilisateur à l'organisation
              }
            },
            include: {
              typeSubvention: true // 🎯 Inclure le typeSubvention dans la réponse
            }
          });

          return { user, organisation };
        });

        // Supprimer les données temporaires
        delete pendingRegistrations[email];

        // ====================================
        // 5b. Générer le token JWT avec l'ID du User (pas de l'organisation)
        // ====================================
        const token = this.generateToken({
          userId: result.user.id,
          email: result.user.email,
          userType: 'organisation'
        });

        const { hashMotPasse: _, ...userWithoutPassword } = result.user;

        // ====================================
        // 6. Retourner les données avec le chemin de redirection
        // ====================================
        return {
          message: 'Compte vérifié avec succès !',
          token,
          user: {
            ...userWithoutPassword,
            organisation: serializeBigInt(result.organisation) // 🎯 Sérialiser les BigInt
          },
          type: 'organisation',
          redirectTo: '/soumission' // 🎯 Redirection vers soumission
        };
      }
    } catch (error: any) {
      delete pendingRegistrations[email];
      throw new AppError('Erreur lors de la création du compte: ' + error.message, 500);
    }
  }

  /**
   * CONNEXION - Authentification avec email + mot de passe uniquement
   */
  async login(loginData: LoginVM) {
    const { email, motDePasse } = loginData;

    // Le username est maintenant toujours un EMAIL
    // On cherche d'abord parmi les utilisateurs (par email uniquement)
    const user = await prisma.utilisateur.findUnique({
      where: { email: email },
      include: {
        organisation: {
          include: {
            typeSubvention: true // 🎯 Inclure le type de subvention
          }
        }
      }
    });

    if (user) {
      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(motDePasse, user.hashMotPasse);

      if (!isPasswordValid) {
        throw new AppError('Email ou mot de passe incorrect.', 401);
      }

      // Générer le token JWT avec l'ID de l'utilisateur
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        userType: user.organisation ? 'organisation' : 'user'
      });

      const { hashMotPasse: _, ...userWithoutSensitiveData } = user;

      // ✅ Déterminer la redirection en fonction du rôle
      let redirectTo = '/dashboard'; // Par défaut
      if (user.role === 'ADMINISTRATEUR') {
        redirectTo = '/admin/dashboard';
      }

      console.log('✅ [AUTH SERVICE] Login réussi:', {
        email: user.email,
        role: user.role,
        type: user.organisation ? 'organisation' : 'user',
        redirectTo
      });

      return {
        message: 'Connexion réussie.',
        token,
        user: serializeBigInt(userWithoutSensitiveData), // 🎯 Sérialiser les BigInt
        type: user.organisation ? 'organisation' : 'user',
        role: user.role, // ✅ Ajouter le rôle dans la réponse
        redirectTo // ✅ Ajouter la redirection basée sur le rôle
      };
    }

    throw new AppError('Email ou mot de passe incorrect.', 401);
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  async isAuthenticated(userId: string) {
    // Chercher l'utilisateur avec son organisation
    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      include: {
        organisation: {
          include: {
            typeSubvention: true // 🎯 Inclure le type de subvention
          }
        }
      }
    });

    if (user) {
      const { hashMotPasse: _, ...userWithoutPassword } = user;
      return {
        user: serializeBigInt(userWithoutPassword), // 🎯 Sérialiser les BigInt
        type: user.organisation ? 'organisation' : 'user'
      };
    }

    throw new AppError('Utilisateur non trouvé.', 404);
  }

  /**
   * Rafraîchir le token
   */
  async refreshToken(userId: string) {
    const { user, type } = await this.isAuthenticated(userId);

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      userType: type === 'user' ? (user as any).userType : 'organisation'
    });

    return { token, user, type };
  }

  /**
   * Générer un token JWT
   */
  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
  }

  /**
   * RENVOYER OTP : Générer et envoyer un nouveau code OTP
   * Cette méthode permet de renvoyer un nouveau code OTP si le précédent a expiré
   * ou n'a pas été reçu par l'utilisateur
   */
  async resendOtp(email: string) {
    // ====================================
    // 1. Vérifier qu'il existe une inscription en attente
    // ====================================
    const pending = pendingRegistrations[email];

    if (!pending) {
      throw new AppError('Aucune inscription en attente pour cet email.', 400);
    }

    // ====================================
    // 2. Générer un nouveau code OTP (6 chiffres, valide 5 minutes)
    // ====================================
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Mettre à jour le code OTP dans les données temporaires
    pending.otp = otp;
    pending.otpExpiry = otpExpiry;

    // ====================================
    // 3. Envoyer le nouveau OTP par email via Nodemailer
    // ====================================
    console.log(`📧 Nouveau OTP généré pour ${email}: ${otp}`);

    try {
      const userName =
        pending.type === 'user'
          ? pending.registrationData.prenom || pending.registrationData.nomUtilisateur || 'Utilisateur'
          : pending.registrationData.nom || pending.registrationData.personneContact || 'Organisation';

      await sendOTPEmail(email, otp, userName);
      console.log(`✅ Nouvel email OTP envoyé à ${email}`);
    } catch (error: any) {
      console.error(`❌ Erreur envoi email à ${email}:`, error.message);
      throw new AppError("Impossible d'envoyer l'email de vérification", 500);
    }

    return {
      message: 'Un nouveau code de vérification a été envoyé à votre adresse email.',
      email
    };
  }
}
