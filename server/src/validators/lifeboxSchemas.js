import { z } from 'zod';
import { documentSchema } from './schemas.js';
import { DOC_CATEGORIES, BLOOD_TYPES } from '../utils/lifeboxConstants.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const optText = (n) => z.string().trim().max(n).nullable().optional();

// Documents module schema + LifeBox's optional fields (no defaults, so the old Documents page sends/validates exactly as before).
export const lifeboxDocumentSchema = documentSchema.extend({ category: z.enum(DOC_CATEGORIES).optional(), document_number: optText(60) });

export const reminderSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  category: z.enum(DOC_CATEGORIES).default('other'),
  due_on: date,
  remind_days: z.number().int().min(0).max(365).default(7),
  notes: optText(1000),
});

export const eventSchema = z.object({ title: z.string().trim().min(1, 'Title is required').max(120), description: optText(1000), event_date: date });

export const emergencySchema = z.object({
  blood_type: z.enum(BLOOD_TYPES).nullable().optional(),
  allergies: optText(500), conditions: optText(500), medications: optText(500),
  doctor_name: optText(100), doctor_phone: optText(30), hmo_name: optText(100), hmo_number: optText(60),
  preferred_hospital: optText(150), notes: optText(1000),
  // The first contact is the "Primary" contact.
  contacts: z.array(z.object({
    name: z.string().trim().min(1, 'Contact name is required').max(80),
    relationship: optText(40),
    phone: z.string().trim().min(3).max(30).regex(/^[+\d][\d\s()+-]*$/, 'Enter a valid phone number'),
  })).max(5, 'You can add up to 5 contacts').default([]),
});
