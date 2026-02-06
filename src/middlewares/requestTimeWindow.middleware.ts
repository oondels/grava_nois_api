import { Request, Response, NextFunction } from "express";

type TimeWindowOptions = {
	timeZone?: string;
	startMinutes?: number;
	endMinutes?: number;
};

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_START_MINUTES = 7 * 60; // 07:00
const DEFAULT_END_MINUTES = 23 * 60 + 30; // 23:30

const getMinutesInTimeZone = (date: Date, timeZone: string): number => {
	const formatter = new Intl.DateTimeFormat("pt-BR", {
		timeZone,
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
	});

	const parts = formatter.formatToParts(date);
	const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
	const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

	return hour * 60 + minute;
};

export const createRequestTimeWindowMiddleware = (
	options: TimeWindowOptions = {}
) => {
	const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
	const startMinutes = options.startMinutes ?? DEFAULT_START_MINUTES;
	const endMinutes = options.endMinutes ?? DEFAULT_END_MINUTES;

	return (_req: Request, res: Response, next: NextFunction) => {
		const currentMinutes = getMinutesInTimeZone(new Date(), timeZone);
		const isInsideWindow =
			currentMinutes >= startMinutes && currentMinutes <= endMinutes;

		if (!isInsideWindow) {
			res.status(403).json({
				error: "request_outside_allowed_time_window",
				message:
					"Requisições para esta rota são permitidas apenas entre 07:00 e 23:30 (America/Sao_Paulo).",
			});
			return;
		}

		next();
	};
};

export const allowOnlyBusinessWindow = createRequestTimeWindowMiddleware();
