import { AppointmentModel } from '../models/appointment.model.js';
import { makeController } from './crud.controller.js';
export const appointmentController = makeController(AppointmentModel);
