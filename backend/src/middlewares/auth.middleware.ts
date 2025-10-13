import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index.js';

// Étendre l'interface Request pour inclure user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Récupérer le JWT_SECRET avec une vérification
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET n\'est pas défini dans les variables d\'environnement');
  }
  return secret;
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Récupérer le token depuis les cookies ou le header Authorization
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token manquant. Authentification requise.' });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Continue sans user si le token est invalide
    next();
  }
};

// Middleware pour vérifier que l'utilisateur est admin
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  if (req.user.userType !== 'admin' && req.user.userType !== 'agent') {
    return res.status(403).json({ error: 'Accès refusé. Droits administrateur requis.' });
  }

  next();
};
