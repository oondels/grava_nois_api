import express from "express";
import { NotificationController } from "../controllers/notification.controller";

export const notificationRouter = express.Router();

//* antigo /send-email
notificationRouter.post("/contact", NotificationController.sendContactEmail);

//* antigo /send-report
notificationRouter.post("/report", NotificationController.sendReportError);

// notificationRouter.post("/send-feedback", NotificationController.sendFeedback);

