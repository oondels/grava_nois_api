import express from "express";
import { NotificationController } from "../controllers/notification.controller";

export const notificationRouter = express.Router();

notificationRouter.post("/contact", NotificationController.sendContactEmail);

notificationRouter.post("/report", NotificationController.sendReportError);

