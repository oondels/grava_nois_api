declare global {
  namespace Express {
    interface Request {
      user?: import("../middlewares/auth").DecodedToken;
    }
  }
}

export {}; // Garante que o arquivo seja tratado como módulo e que a declaração global seja aplicada
