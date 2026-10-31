const { recordStatus } = require('../src/services/application.service');

describe('application status history (parity with legacy application_events)', () => {
  test('appends an event and updates status on the document', () => {
    const app = { status: 'Applied', history: [{ status: 'Applied', at: new Date() }] };
    recordStatus(app, 'Shortlisted', null, 'user1');
    expect(app.status).toBe('Shortlisted');
    expect(app.history).toHaveLength(2);
    expect(app.history[1]).toMatchObject({ status: 'Shortlisted', by: 'user1' });
    expect(app.history[1].at).toBeInstanceOf(Date);
  });

  test('captures a rejection reason as the event note', () => {
    const app = { status: 'Applied', history: [] };
    recordStatus(app, 'Rejected', 'Not enough experience', 'u2');
    expect(app.history[0].note).toBe('Not enough experience');
  });

  test('returns the same reference for chaining', () => {
    const app = { status: 'Applied', history: [] };
    expect(recordStatus(app, 'Under Review')).toBe(app);
  });
});
