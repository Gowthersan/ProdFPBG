import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middlewares/error.middleware.js';
import { AuthService } from '../services/auth.service.js';

const authService = new AuthService();

export class AuthController {
  /**
   * POST /api/auth/register/agent
   * Inscription d'un agent FPBG - Étape 1 : Envoi de l'OTP
   */
  static async registerAgentFpbg(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.registerAgentFpbg(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/register/organisation
   * Inscription d'une organisation - Étape 1 : Envoi de l'OTP
   */
  static async registerOrganisation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.registerOrganisation(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/verify-otp
   * Vérification de l'OTP - Étape 2 : Création du compte et génération du JWT
   * Body: { email: string, otp: string }
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        throw new AppError('Email et code OTP requis.', 400);
      }

      const result = await authService.verifyOtp(email, otp);

      // Définir le cookie avec le token
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/resend-otp
   * Renvoyer un nouveau code OTP
   * Body: { email: string }
   */
  static async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('Email requis.', 400);
      }

      const result = await authService.resendOtp(email);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Connexion avec email/username + mot de passe uniquement
   * Body: { username: string (email ou username), password: string }
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        throw new AppError('Email/Username et mot de passe requis.', 400);
      }

      const result = await authService.login({ username, password });

      // Définir le cookie avec le token
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Vérifier l'authentification et récupérer les infos utilisateur
   */
  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Non authentifié.', 401);
      }

      const result = await authService.isAuthenticated(req.user.userId);
      res.json({ authenticated: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Déconnexion
   */
  static async logout(req: Request, res: Response) {
    res.clearCookie('token');
    res.json({ message: 'Déconnexion réussie.' });
  }

  /**
   * POST /api/auth/refresh-token
   * Rafraîchir le token JWT
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Non authentifié.', 401);
      }

      const result = await authService.refreshToken(req.user.userId);

      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        message: 'Token rafraîchi avec succès.',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}
