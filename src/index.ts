import express, { Request, Response, NextFunction } from "express";
// import multer from "multer";
import { AppDataSource } from "./config/database";
import cors from "cors";
// import { publishClipEvent } from "./rabbitmq/publisher";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import helmet from "helmet";

import { userRouter } from "./routes/userPage";
import { videoRouter } from "./routes/video.route";
import { authRouter } from "./routes/auth.route";
import { notificationRouter } from "./routes/notification.route";
import { clientRouter } from "./routes/client.route";
import { quadrasRoute } from "./routes/quadrasFiliadas";

import { errorHandler } from "./middlewares/errorHandler";

export const ALLOWED_ORIGINS = new Set([
  "https://www.gravanois.com.br",
  "https://gravanois.com.br",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://felix-3d.vercel.app",
]);

AppDataSource.initialize()
  .then(() => {
    (async () => {
      const app = express();

      app.use(helmet());
      app.use(cookieParser());
      app.use(express.json({ limit: '5mb' }));
      app.set("trust proxy", 1);

      // Correlation id for logs and responses
      app.use((req: Request, res: Response, next: NextFunction) => {
        const requestId = (req.headers["x-request-id"] as string) || randomUUID();
        res.setHeader("X-Request-Id", requestId);
        (res.locals as any).requestId = requestId;
        next();
      });

      const corsOptions = {
        origin(origin: any, cb: any) {
          if (!origin) return cb(null, true);
          if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
          return cb(new Error(`CORS: origin não permitido: ${origin}`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["content-type", "authorization", "x-requested-with"],
        exposedHeaders: ["Set-Cookie"],
      };

      app.options(/.*/, cors(corsOptions));
      app.use(cors(corsOptions));

      // App routes
      app.use("/users", userRouter);
      app.use(videoRouter);
      app.use("/auth", authRouter);
      app.use("/notifications", notificationRouter);
      app.use("/api/clients", clientRouter);
      app.use("/api/quadras-filiadas", quadrasRoute);

      // Health check
      app.get("/", (req: Request, res: Response) => {
        res.send("Grava Nois api is running.");
      });

      // 404 handler for unmatched routes
      app.use((req: Request, res: Response) => {
        const requestId = (res.locals as any).requestId;
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: "Rota não encontrada"
          },
          requestId,
        });
      });

      // Global error handler - must be last
      app.use(errorHandler);

      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`Listening on http://localhost:${port}`);
      });
    })();
  })
  .catch((error) => {
    console.error("Error initializing Data Source:", error);
  });
