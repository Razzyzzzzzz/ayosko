import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const iso = z.string().datetime({ offset: true });
const text = (max = 200) => z.string().trim().min(1).max(max);
const notes = z.string().trim().max(2000).nullable().optional();

export const taskSchema = z.object({
  title: text(), notes,
  category: text(50).default('general'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: date.nullable().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).default('none'),
  completed: z.boolean().optional(),
});

export const reminderSchema = z.object({
  title: text(), notes, remind_at: iso, done: z.boolean().optional(),
});

export const billSchema = z.object({
  name: text(), amount: z.number().min(0).max(1e9), due_date: date,
  status: z.enum(['unpaid', 'paid']).default('unpaid'),
  recurrence: z.enum(['none', 'weekly', 'monthly', 'yearly']).default('none'),
  notes,
});

export const appointmentSchema = z.object({
  title: text(), starts_at: iso, ends_at: iso.nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(), notes,
});

export const documentSchema = z.object({
  name: text(), reference_notes: notes,
  expires_on: date.nullable().optional(),
  renewal_remind_days: z.number().int().min(0).max(365).default(30),
});

export const profileSchema = z.object({
  full_name: text(100).optional(),
  timezone: text(60).optional(),
  onboarded: z.boolean().optional(),
}).strict();

export const prefsSchema = z.object({
  tasks: z.boolean().optional(), bills: z.boolean().optional(),
  appointments: z.boolean().optional(), documents: z.boolean().optional(),
  budgets: z.boolean().optional(),
  lead_days: z.number().int().min(0).max(30).optional(),
}).strict();

// Categories are stored lowercase so they match the filters and budgets.
const categoryName = z.string().trim().toLowerCase().min(1).max(30);

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive().max(1e9),
  category: categoryName,
  description: z.string().trim().max(200).nullable().optional(),
  spent_on: date,
});

export const categorySchema = z.object({
  type: z.enum(['income', 'expense']),
  name: categoryName,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #22c55e').optional(),
});

// One monthly limit per category; category "overall" = the whole-month budget.
export const budgetSchema = z.object({
  category: categoryName,
  monthly_limit: z.number().min(0).max(1e9),
});

export const inboxSchema = z.object({ text: text(500) });

// AI assistant chat: hanggang 12 mensahe; ang sagot ng assistant ay pwedeng mas mahaba kaysa tanong
export const assistantSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(4000),
  })).min(1).max(12),
});

export const idParam = z.object({ id: z.string().uuid() });

// PATCH = every field optional (defaults removed so they don't overwrite existing values)
export const patchOf = (schema) =>
  z.object(Object.fromEntries(
    Object.entries(schema.shape).map(([k, v]) => [k, (v._def.innerType ?? v).optional()])
  ));