import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendResponse } from '../../utils/sendResponse.js';
import { userService } from './user.service.js';

const list: RequestHandler = async (_req, res) => {
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: 'Staff',
    data: { users: await userService.listUsers() },
  });
};

/**
 * Adds a staff member and returns their code **once**.
 *
 * Only a keyed hash is stored, so this response is the only time the code can
 * be read. Losing it means reissuing, which is the right way round: a code the
 * system could hand back is a code a database dump hands over.
 */
const create: RequestHandler = async (req, res) => {
  const body = req.validated?.body as { name: string; payrollRef?: string };
  const { user, code } = await userService.createStaff(body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    message: `${user.name} added. Their code is ${code} — it cannot be shown again.`,
    data: { user, code },
  });
};

const update: RequestHandler = async (req, res) => {
  const { id } = req.validated?.params as { id: string };
  const changes = req.validated?.body as Parameters<typeof userService.updateUser>[1];

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: 'Staff member updated',
    data: { user: await userService.updateUser(id, changes) },
  });
};

const resetCode: RequestHandler = async (req, res) => {
  const { id } = req.validated?.params as { id: string };
  const { user, code } = await userService.resetCode(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: `New code for ${user.name} is ${code} — it cannot be shown again.`,
    data: { user, code },
  });
};

export const userController = { list, create, update, resetCode };
