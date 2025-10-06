import express, { Request, Response, NextFunction } from "express";
// import multer from "multer";
import { AppDataSource } from "./config/database";
import cors from "cors";
// import { publishClipEvent } from "./rabbitmq/publisher";
import cookieParser from "cookie-parser";

// Rotas temporárias (Felix3D)
import pedidosRouter from "./routes/felix3D/pedidos";
import produtosRouter from "./routes/felix3D/produtos";
import { financeiroRouter } from "./routes/felix3D/financeiro";

import { userRouter } from "./routes/userPage";
import { videoRouter } from "./routes/video.route";
import { authRouter } from "./routes/auth.route";
import { notificationRouter } from "./routes/notification.route";

export const ALLOWED_ORIGINS = new Set([
  "https://www.gravanois.com.br",
  "https://gravanois.com.br",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://felix-3d.vercel.app",
  "https://pondaiba-bar.vercel.app",
]);

AppDataSource.initialize()
  .then(() => {
    (async () => {
      const app = express();

      app.use(cookieParser());
      app.use(express.json());
      app.use((req, res, next) => {
        next();
      });
      app.set("trust proxy", 1);
      app.use(
        cors({
          origin(origin, cb) {
            if (!origin) return cb(null, true);
            if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
            return cb(new Error(`CORS: origin não permitido: ${origin}`));
          },
          credentials: true,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          allowedHeaders: "*",
          exposedHeaders: ["Set-Cookie"],
        })
      );

      // Temporary routes (Felix3D)
      app.use("/temp_felix3d/pedidos", pedidosRouter);
      app.use("/temp_felix3d/produtos", produtosRouter);
      app.use("/temp_felix3d/financeiro", financeiroRouter);

      // App routes
      app.use("/users", userRouter);
      app.use(videoRouter);
      app.use("/auth", authRouter);
      app.use("/notifications", notificationRouter);

      // Health check
      app.get("/", (req: Request, res: Response) => {
        res.send("Video upload api is running.");
      });

      // Realiza criação de novo client
      app.post("/api/clients/", async (req: Request, res: Response) => {
        try {
          const data = req.body;

          if (!data || !data.legalName || !data.email || (!data.cnpj && !data.responsibleCpf)) {
            return res.status(400).json({ error: "Nome/Razão Social, Email e cpf/cnpj são obrigatórios." });
          }

          //! TODO: Fazer verificação da existencia de client

          const clientRepository = AppDataSource.getRepository("Client");
          const newClient = clientRepository.create({
            legalName: data.legalName,
            email: data.email,
            cnpj: data.cnpj,
            responsibleCpf: data.responsibleCpf,
          });
          await clientRepository.save(newClient);

          res.status(201).json(newClient);
        } catch (error) {
          console.error("Error creating client:", error);
          res.status(500).json({ error: "Internal server error." });
        }
      });

      // Cadastro de local e filizal instalada o serviço
      app.post("/api/venue-installations/:clientId", async (req: Request, res: Response) => {
        try {
          const data = req.body;
          const { clientId } = req.params;

          if (
            !data ||
            !clientId ||
            !data.venueName ||
            !data.addressLine ||
            !data.country ||
            !data.state ||
            !data.city ||
            !data.postalCode
          ) {
            return res.status(400).json({
              error: "Client ID, Venue Name, Address Line, Country, State, City and Postal Code are required.",
            });
          }

          const venueInstallationRepository = AppDataSource.getRepository("VenueInstallation");
          const newVenueInstallation = venueInstallationRepository.create({
            clientId: clientId,
            venueName: data.venueName,
            addressLine: data.addressLine,
            country: data.country,
            state: data.state,
            city: data.city,
            postalCode: data.postalCode,
          });
          await venueInstallationRepository.save(newVenueInstallation);

          res.status(201).json(newVenueInstallation);
        } catch (error) {
          console.error("Error creating venue installation:", error);
          res.status(500).json({ error: "Internal server error." });
        }
      });

      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`Listening on http://localhost:${port}`);
      });
    })();
  })
  .catch((error) => {
    console.error("Error initializing Data Source:", error);
  });
