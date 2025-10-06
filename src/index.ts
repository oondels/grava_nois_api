import express, { Request, Response, NextFunction } from "express";
// import multer from "multer";
import { AppDataSource } from "./config/database";
import cors from "cors";
// import { publishClipEvent } from "./rabbitmq/publisher";
import nodeMailer from "nodemailer";
import { config } from "./config/dotenv";
import cookieParser from "cookie-parser";

// Rotas temporárias (Felix3D)
import pedidosRouter from "./routes/felix3D/pedidos";
import produtosRouter from "./routes/felix3D/produtos";
import { financeiroRouter } from "./routes/felix3D/financeiro";

import { userRouter } from "./routes/userPage";
import { videoRouter } from "./routes/video.route";
import { authRouter } from "./routes/auth.route";

type ContactFormPayload = {
  estabelecimento: string;
  cnpjCpf: string;
  cep: string;
  endereco: string;
  estado: string;
  cidade: string;
  nome: string;
  telefone: string;
  email: string;
  segmento: string;
  qtdCameras: number | string;
  obs: string;
};

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

      const transporter = nodeMailer.createTransport({
        host: config.mail_host,
        port: 465,
        secure: true,
        auth: {
          user: config.mail_user,
          pass: config.mail_pass,
        },
      });

      app.use(cookieParser());

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

      app.use(express.json());

      // Temporary routes (Felix3D)
      app.use("/temp_felix3d/pedidos", pedidosRouter);
      app.use("/temp_felix3d/produtos", produtosRouter);
      app.use("/temp_felix3d/financeiro", financeiroRouter);

      // App routes
      app.use("/users", userRouter);
      app.use(videoRouter);
      app.use("/auth", authRouter);

      // Send email function (contato/prospecção)
      app.post("/send-email", async (req: Request, res: Response) => {
        const {
          estabelecimento = "",
          cnpjCpf = "",
          cep = "",
          endereco = "",
          estado = "",
          cidade = "",
          nome = "",
          telefone = "",
          email = "",
          segmento = "",
          qtdCameras = 1,
          obs = "",
        } = (req.body || {}) as Partial<ContactFormPayload>;

        // ===== Validações mínimas =====
        if (!nome.trim()) {
          return res.status(400).send("Por favor, preencha o seu nome.");
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).send("Informe um e-mail válido.");
        }

        const cameras = Number.isFinite(Number(qtdCameras)) ? Number(qtdCameras) : 1;

        // ===== Assunto dinâmico =====
        const subjectParts = ["Novo Cliente Grava Nóis", `<${email}>`];
        if (estabelecimento) subjectParts.push(`— ${estabelecimento}`);
        const loc = [cidade, estado].filter(Boolean).join(" / ");
        if (loc) subjectParts.push(`(${loc})`);
        const subject = subjectParts.join(" ");

        // ===== HTML do e-mail =====
        const safe = (v?: string | number) => String(v ?? "").trim() || "—";
        const html = `
        <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6; max-width:640px; margin:0 auto; background:#f9f9f9; padding:20px; border-radius:12px;">
          <div style="text-align:center; margin-bottom:20px;">
            <h1 style="color:#0d9757; font-size:22px; margin:0;">Nova Solicitação de Contato</h1>
            <p style="color:#777; margin:6px 0 0;">Grava Nóis — Formulário de Prospecção</p>
          </div>

          <div style="background:#fff; padding:18px; border-radius:10px; border:1px solid #eee;">
            <h2 style="color:#0056b3; font-size:18px; margin:0 0 12px;">Dados do Estabelecimento</h2>
            <table cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse;">
              <tbody>
                <tr><td style="width:40%; font-weight:bold; border-bottom:1px solid #f0f0f0;">Estabelecimento</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          estabelecimento
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">CNPJ/CPF</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          cnpjCpf
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Segmento</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          segmento
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Qtd. Câmeras</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          cameras
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Endereço</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          endereco
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Cidade/UF</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          loc
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">CEP</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          cep
        )}</td></tr>
              </tbody>
            </table>

            <h2 style="color:#0056b3; font-size:18px; margin:20px 0 12px;">Contato</h2>
            <table cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse;">
              <tbody>
                <tr><td style="width:40%; font-weight:bold; border-bottom:1px solid #f0f0f0;">Nome</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          nome
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Telefone</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          telefone
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">E-mail</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          email
        )}</td></tr>
              </tbody>
            </table>

            <h2 style="color:#0d9757; font-size:18px; margin:20px 0 8px;">Observações</h2>
            <div style="font-size:15px; color:#555; background:#f7f7f7; padding:12px; border-radius:8px; border:1px solid #eee;">
              ${safe(obs)}
            </div>
          </div>

          <div style="text-align:center; margin-top:22px; color:#888; font-size:13px;">
            <p>Este e-mail foi gerado automaticamente a partir do site.</p>
          </div>
        </div>
        `;

        try {
          await transporter.sendMail({
            to: "hendriusfelix.dev@gmail.com",
            subject,
            html,
            text: `
              Novo Cliente Grava Nóis
              Estabelecimento: ${safe(estabelecimento)}
              CNPJ/CPF: ${safe(cnpjCpf)}
              Segmento: ${safe(segmento)}
              Qtd. Câmeras: ${safe(cameras)}
              Endereço: ${safe(endereco)}
              Cidade/UF: ${safe(loc)}
              CEP: ${safe(cep)}

              Contato:
              - Nome: ${safe(nome)}
              - Telefone: ${safe(telefone)}
              - Email: ${safe(email)}

              Observações:
              ${safe(obs)}
              `.trim(),
          });

          console.log("Email sent");
          res.status(200).send("Email enviado. Entraremos em contato em breve.");
          return;
        } catch (error) {
          console.error("Erro ao enviar e-mail:", error);
          res
            .status(502)
            .send("Erro de comunicação ao enviar e-mail. Tente contato por WhatsApp -> +55 (75) 98246-6403");
          return;
        }
      });

      // Report errors (bug reports)
      app.post("/send-report", async (req: Request, res: Response) => {
        const {
          name = "",
          email = "",
          page = "",
          title = "",
          description = "",
          steps = "",
          severity = "Média",
          userAgent = "",
          url = "",
        } = (req.body || {}) as {
          name?: string;
          email?: string;
          page?: string;
          title?: string;
          description?: string;
          steps?: string;
          severity?: "Baixa" | "Média" | "Alta" | string;
          userAgent?: string;
          url?: string;
        };

        const safe = (v?: string) => String(v ?? "").trim() || "—";

        if (!description.trim()) {
          return res.status(400).send("Descrição é obrigatória.");
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).send("Informe um e-mail válido.");
        }

        const subject = ["Bug Report — Grava Nóis", title || page || "", severity ? `[${severity}]` : ""]
          .filter(Boolean)
          .join(" ");

        const html = `
        <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6; max-width:720px; margin:0 auto; background:#f9f9f9; padding:20px; border-radius:12px;">
          <div style="text-align:center; margin-bottom:20px;">
            <h1 style="color:#C62828; font-size:22px; margin:0;">Relatório de Erro</h1>
            <p style="color:#777; margin:6px 0 0;">Grava Nóis — Canal interno</p>
          </div>

          <div style="background:#fff; padding:18px; border-radius:10px; border:1px solid #eee;">
            <h2 style="color:#0056b3; font-size:18px; margin:0 0 12px;">Resumo</h2>
            <table cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse;">
              <tbody>
                <tr><td style="width:35%; font-weight:bold; border-bottom:1px solid #f0f0f0;">Título</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          title
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Severidade</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          String(severity)
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Página</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          page
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">URL</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          url
        )}</td></tr>
              </tbody>
            </table>

            <h2 style="color:#0d9757; font-size:18px; margin:20px 0 8px;">Descrição</h2>
            <div style="font-size:15px; color:#555; background:#f7f7f7; padding:12px; border-radius:8px; border:1px solid #eee; white-space:pre-wrap;">
              ${safe(description)}
            </div>

            ${steps?.trim()
            ? `<h3 style="color:#333; font-size:16px; margin:16px 0 8px;">Passos para reproduzir</h3>
                 <div style=\"font-size:15px; color:#555; background:#f7f7f7; padding:12px; border-radius:8px; border:1px solid #eee; white-space:pre-wrap;\">${safe(
              steps
            )}</div>`
            : ""
          }

            <h2 style="color:#0056b3; font-size:18px; margin:20px 0 12px;">Contato</h2>
            <table cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse;">
              <tbody>
                <tr><td style="width:35%; font-weight:bold; border-bottom:1px solid #f0f0f0;">Nome</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
            name
          )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">E-mail</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
            email
          )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">User-Agent</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
            userAgent
          )}</td></tr>
              </tbody>
            </table>
          </div>

          <div style="text-align:center; margin-top:22px; color:#888; font-size:13px;">
            <p>Este e-mail foi gerado automaticamente a partir do Reportar Erro.</p>
          </div>
        </div>`;

        try {
          await transporter.sendMail({
            to: "hendriusfelix.dev@gmail.com",
            subject,
            html,
            text: `
              Bug Report — Grava Nóis ${severity ? `[${severity}]` : ""}
              Título: ${safe(title)}
              Página: ${safe(page)}
              URL: ${safe(url)}

              Descrição:
              ${safe(description)}

              Passos para reproduzir:
              ${safe(steps)}

              Contato:
              - Nome: ${safe(name)}
              - Email: ${safe(email)}
              - User-Agent: ${safe(userAgent)}
            `.trim(),
          });

          return res.status(200).send("Relatório enviado. Obrigado por ajudar!");
        } catch (error) {
          console.error("Erro ao enviar e-mail de relatório:", error);
          return res.status(502).send("Falha ao enviar relatório. Tente novamente mais tarde.");
        }
      });

      // General feedback (não técnico)
      app.post("/send-feedback", async (req: Request, res: Response) => {
        const {
          name = "",
          email = "",
          message = "",
          page = "",
          url = "",
        } = (req.body || {}) as {
          name?: string;
          email?: string;
          message?: string;
          page?: string;
          url?: string;
        };

        const safe = (v?: string) => String(v ?? "").trim() || "—";
        if (!message.trim()) return res.status(400).send("Mensagem é obrigatória.");
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return res.status(400).send("Informe um e-mail válido.");

        const subject = ["Feedback — Grava Nóis", page || "", email ? `<${email}>` : ""].filter(Boolean).join(" ");

        const html = `
        <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6; max-width:720px; margin:0 auto; background:#f9f9f9; padding:20px; border-radius:12px;">
          <div style="text-align:center; margin-bottom:20px;">
            <h1 style="color:#0d9757; font-size:22px; margin:0;">Novo Feedback</h1>
            <p style="color:#777; margin:6px 0 0;">Grava Nóis — Site/App</p>
          </div>

          <div style="background:#fff; padding:18px; border-radius:10px; border:1px solid #eee;">
            <h2 style="color:#0056b3; font-size:18px; margin:0 0 12px;">Mensagem</h2>
            <div style="font-size:15px; color:#555; background:#f7f7f7; padding:12px; border-radius:8px; border:1px solid #eee; white-space:pre-wrap;">
              ${safe(message)}
            </div>

            <h2 style="color:#0056b3; font-size:18px; margin:20px 0 12px;">Detalhes</h2>
            <table cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse;">
              <tbody>
                <tr><td style="width:35%; font-weight:bold; border-bottom:1px solid #f0f0f0;">Nome</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          name
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">E-mail</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          email
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Página</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          page
        )}</td></tr>
                <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">URL</td><td style="border-bottom:1px solid #f0f0f0;">${safe(
          url
        )}</td></tr>
              </tbody>
            </table>
          </div>

          <div style="text-align:center; margin-top:22px; color:#888; font-size:13px;">
            <p>Este e-mail foi gerado automaticamente a partir do site.</p>
          </div>
        </div>`;

        try {
          await transporter.sendMail({
            to: "hendriusfelix.dev@gmail.com",
            subject,
            html,
            text: `
              Feedback — Grava Nóis
              Página: ${safe(page)}
              URL: ${safe(url)}

              Mensagem:
              ${safe(message)}

              Contato:
              - Nome: ${safe(name)}
              - Email: ${safe(email)}
            `.trim(),
          });
          return res.status(200).send("Feedback enviado. Obrigado!");
        } catch (error) {
          console.error("Erro ao enviar e-mail de feedback:", error);
          return res.status(502).send("Falha ao enviar feedback. Tente novamente mais tarde.");
        }
      });

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
