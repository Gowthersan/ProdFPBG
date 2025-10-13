// Types et interfaces pour le backend FPBG

export interface LoginVM {
  username: string;
  password: string;
}

export interface FpbgUsersDTO {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  numTel?: string;
  postalAddress?: string;
  physicalAddress?: string;
  userType?: string;
}

export interface OrganisationDTO {
  name?: string;
  email: string;
  password: string;
  username?: string;
  contact?: string;
  numTel?: string;
  postalAddress?: string;
  physicalAddress?: string;
  type?: string;
  usernamePersonneContacter?: string;
  typeOrganisationId?: string;
}

export interface ProjetFormDTO {
  id?: string;
  organisationId?: string;
  title?: string;
  actPrin?: string;
  dateLimPro?: Date | string | null;
  rAtt?: string;
  objP?: string;
  conjP?: string;
  lexGcp?: string;
  poRistEnvSoPo?: string;
  dPRep?: string;
  conseilPr?: string;
  stade?: string;
  funding?: string;
  username?: string;
  email?: string;
  password?: string;
  numTel?: string;
  postalAddress?: string;
  physicalAddress?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  userType?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
