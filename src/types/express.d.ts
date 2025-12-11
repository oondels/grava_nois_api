import { DecodedToken } from "../middlewares/auth.middleware";

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export {}; // Garante que o arquivo seja tratado como módulo e que a declaração global seja aplicada
