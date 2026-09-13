import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendResponse } from '../../utils/sendResponse.js';
import type { PunchAction, PunchType } from './punch.interface.js';
import { punchService } from './punch.service.js';

type LookupBody = { code: string };
type RecordBody = { code: string; action: PunchAction; idempotencyKey: string };
type CreateBody = { userId: string; type: PunchType; at: string };

/**
 * Step one at the keypad: name the person and offer what they can do.
 *
 * Deliberately a POST despite reading nothing — a GET would put the code in the
 * URL, and from there into logs and browser history.
 */
const lookup: RequestHandler = async (req, res) => {
  const { code } = req.validated?.body as LookupBody;
  const status = await punchService.lookup(code, req.ip ?? 'unknown');

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: `Hello, ${status.name}`,
    data: status,
  });
};

/** Step two: write it. The code is sent again because staff hold no session. */
const record: RequestHandler = async (req, res) => {
  const body = req.validated?.body as RecordBody;
  const result = await punchService.record({
    ...body,
    address: req.ip ?? 'unknown',
  });

  sendResponse(res, {
    // A replay is not a new punch, so it answers 200 rather than 201 while
    // returning the original time.
    statusCode: result.replayed ? StatusCodes.OK : StatusCodes.CREATED,
    message: `Thanks, ${result.name}`,
    data: result,
  });
};

/** The forgotten clock-out, entered by a manager after the fact. */
const managerCreate: RequestHandler = async (req, res) => {
  const body = req.validated?.body as CreateBody;
  const punch = await punchService.managerCreate({
    userId: body.userId,
    type: body.type,
    local: body.at,
    managerId: req.auth!.sub,
  });

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    message: 'Punch added',
    data: { punch },
  });
};

const managerAmend: RequestHandler = async (req, res) => {
  const { id } = req.validated?.params as { id: string };
  const { at } = req.validated?.body as { at: string };

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: 'Punch updated',
    data: { punch: await punchService.managerAmend({ punchId: id, local: at }) },
  });
};

const managerVoid: RequestHandler = async (req, res) => {
  const { id } = req.validated?.params as { id: string };
  await punchService.managerVoid(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: 'Punch removed',
    data: null,
  });
};

export const punchController = {
  lookup,
  record,
  managerCreate,
  managerAmend,
  managerVoid,
};
