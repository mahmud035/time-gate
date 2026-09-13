import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';
import { config } from '../../../config/index.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { timesheetService } from './timesheet.service.js';

/** A date from the manager's picker is a local day, not a UTC instant. */
const startOfLocalDay = (isoDate: string): Date =>
  DateTime.fromISO(isoDate, { zone: config.TIMEZONE }).startOf('day').toJSDate();

const rangeOf = (req: Parameters<RequestHandler>[0]) => {
  const { from, to } = req.validated?.query as { from: string; to: string };

  return { from: startOfLocalDay(from), to: startOfLocalDay(to) };
};

const list: RequestHandler = async (req, res) => {
  const { from, to } = rangeOf(req);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: 'Timesheet',
    data: await timesheetService.timesheet(from, to),
  });
};

const exportCsv: RequestHandler = async (req, res) => {
  const { from, to } = rangeOf(req);
  const { from: rawFrom, to: rawTo } = req.validated?.query as {
    from: string;
    to: string;
  };

  const csv = await timesheetService.exportCsv(from, to);

  // Sent as a download rather than through sendResponse: this one response is a
  // file, not an envelope.
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="timegate-${rawFrom}_to_${rawTo}.csv"`,
  );
  res.status(StatusCodes.OK).send(csv);
};

export const timesheetController = { list, exportCsv };
