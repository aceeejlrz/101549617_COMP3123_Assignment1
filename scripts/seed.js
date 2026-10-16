/**
 * Creates two demo users (User A and User B), each with their own employees, so the
 * ownership rules can be tested immediately. Safe to re-run: existing demo users and
 * their employees are removed and recreated.
 *
 * Usage: npm run seed
 *
 * The credentials below are non-sensitive demo values for local testing and marking only.
 */
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/user.model');
const Employee = require('../src/models/employee.model');

const DEMO_USERS = [
  {
    username: 'demo_user_a',
    email: 'demo.user.a@example.com',
    password: 'DemoUserA@2026',
    employees: [
      {
        first_name: 'Olivia',
        last_name: 'Martin',
        email: 'olivia.martin@example.com',
        position: 'Software Engineer',
        salary: 85000,
        date_of_joining: '2024-03-15',
        department: 'Engineering',
      },
      {
        first_name: 'Liam',
        last_name: 'Chen',
        email: 'liam.chen@example.com',
        position: 'QA Analyst',
        salary: 68000,
        date_of_joining: '2023-09-01',
        department: 'Quality Assurance',
      },
    ],
  },
  {
    username: 'demo_user_b',
    email: 'demo.user.b@example.com',
    password: 'DemoUserB@2026',
    employees: [
      {
        first_name: 'Noah',
        last_name: 'Williams',
        email: 'noah.williams@example.com',
        position: 'Product Manager',
        salary: 98000,
        date_of_joining: '2022-06-20',
        department: 'Product',
      },
      {
        first_name: 'Emma',
        last_name: 'Brown',
        email: 'emma.brown@example.com',
        position: 'UX Designer',
        salary: 76000,
        date_of_joining: '2024-01-08',
        department: 'Design',
      },
    ],
  },
];

async function seed() {
  await connectDB();

  for (const { employees, ...credentials } of DEMO_USERS) {
    const existing = await User.find({ $or: [{ username: credentials.username }, { email: credentials.email }] });
    for (const user of existing) {
      await Employee.deleteMany({ user: user._id });
      await user.deleteOne();
    }

    // User.create runs the pre-save hook, so the password is stored as a bcrypt hash.
    const user = await User.create(credentials);
    await Employee.create(employees.map((employee) => ({ ...employee, user: user._id })));
    console.log(`Created ${user.username} (${user.email}) with ${employees.length} employees - id ${user.id}`);
  }

  console.log('\nDemo credentials (local testing only):');
  console.table(DEMO_USERS.map(({ username, email, password }) => ({ username, email, password })));
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
