// Config-driven modules: one generic ResourceView renders all of these.
const PRIORITY = ['low', 'medium', 'high'];
const REPEAT = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

export const RESOURCES = {
  tasks: {
    title: 'Tasks', singular: 'task', endpoint: '/tasks', sort: 'due_date', dueKey: 'due_date',
    done: (r) => r.completed, toggle: { field: 'completed', on: true, off: false, onLabel: 'Done', offLabel: 'Reopen' },
    filter: { key: 'completed', label: 'All', options: [['false', 'Open'], ['true', 'Completed']] },
    columns: [
      { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority', type: 'badge' }, { key: 'due_date', label: 'Due', type: 'date' },
      { key: 'recurrence', label: 'Repeats' },
    ],
    fields: [
      { key: 'title', type: 'text', required: true }, { key: 'category', type: 'text', default: 'general' },
      { key: 'priority', type: 'select', options: PRIORITY, default: 'medium' }, { key: 'due_date', type: 'date' },
      { key: 'recurrence', type: 'select', options: REPEAT, default: 'none' }, { key: 'notes', type: 'textarea' },
    ],
  },
  reminders: {
    title: 'Reminders', singular: 'reminder', endpoint: '/reminders', sort: 'remind_at',
    done: (r) => r.done, toggle: { field: 'done', on: true, off: false, onLabel: 'Done', offLabel: 'Reopen' },
    filter: { key: 'done', label: 'All', options: [['false', 'Pending'], ['true', 'Done']] },
    columns: [{ key: 'title', label: 'Title' }, { key: 'remind_at', label: 'Remind at', type: 'datetime' }],
    fields: [{ key: 'title', type: 'text', required: true }, { key: 'remind_at', type: 'datetime', required: true }, { key: 'notes', type: 'textarea' }],
  },
  bills: {
    title: 'Bills & Payments', singular: 'bill', endpoint: '/bills', sort: 'due_date', dueKey: 'due_date',
    done: (r) => r.status === 'paid', toggle: { field: 'status', on: 'paid', off: 'unpaid', onLabel: 'Mark paid', offLabel: 'Mark unpaid' },
    filter: { key: 'status', label: 'All', options: [['unpaid', 'Unpaid'], ['paid', 'Paid']] },
    columns: [
      { key: 'name', label: 'Bill' }, { key: 'amount', label: 'Amount', type: 'money' },
      { key: 'due_date', label: 'Due', type: 'date' }, { key: 'status', label: 'Status', type: 'badge' }, { key: 'recurrence', label: 'Repeats' },
    ],
    fields: [
      { key: 'name', type: 'text', required: true }, { key: 'amount', type: 'number', required: true },
      { key: 'due_date', type: 'date', required: true }, { key: 'status', type: 'select', options: ['unpaid', 'paid'], default: 'unpaid' },
      { key: 'recurrence', type: 'select', options: ['none', 'weekly', 'monthly', 'yearly'], default: 'none' }, { key: 'notes', type: 'textarea' },
    ],
  },
  appointments: {
    title: 'Appointments & Events', singular: 'appointment', endpoint: '/appointments', sort: 'starts_at',
    columns: [
      { key: 'title', label: 'Title' }, { key: 'starts_at', label: 'Starts', type: 'datetime' },
      { key: 'ends_at', label: 'Ends', type: 'datetime' }, { key: 'location', label: 'Location' },
    ],
    fields: [
      { key: 'title', type: 'text', required: true }, { key: 'starts_at', type: 'datetime', required: true },
      { key: 'ends_at', type: 'datetime' }, { key: 'location', type: 'text' }, { key: 'notes', type: 'textarea' },
    ],
  },
  documents: {
    title: 'Document Tracker', singular: 'document', endpoint: '/documents', sort: 'expires_on', dueKey: 'expires_on', files: true,
    columns: [
      { key: 'name', label: 'Document' }, { key: 'expires_on', label: 'Expires', type: 'date' },
      { key: 'renewal_remind_days', label: 'Remind (days)' }, { key: 'file_name', label: 'File' },
    ],
    fields: [
      { key: 'name', type: 'text', required: true }, { key: 'expires_on', type: 'date' },
      { key: 'renewal_remind_days', type: 'number', default: 30, int: true }, { key: 'reference_notes', type: 'textarea' },
    ],
  },
};
