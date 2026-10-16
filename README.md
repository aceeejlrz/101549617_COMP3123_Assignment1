# COMP 3123 – Assignment 1: Secure Employee Management REST API

**Student ID:** 101549617
**Course:** COMP 3123 – Full Stack Development I (Backend Assignment, 10%)

A secure RESTful backend built with **Node.js, Express and MongoDB (Mongoose)**. Users sign up and log in to receive a **JWT**, then manage **their own** employees through protected CRUD endpoints. Each employee belongs to the user who created it, and no user can see or change another user's employees.

---

## Table of Contents

1. [Features](#features)
2. [Technologies](#technologies)
3. [Project Structure](#project-structure)
4. [Installation](#installation)
5. [Configuration (Environment Variables)](#configuration-environment-variables)
6. [Data Models](#data-models)
7. [API Reference](#api-reference)
8. [Authentication](#authentication)
9. [Authorization – Employee Ownership](#authorization--employee-ownership)
10. [Security](#security)
11. [Error Handling & HTTP Status Codes](#error-handling--http-status-codes)
12. [Logging](#logging)
13. [Health Check](#health-check)
14. [Testing (Postman)](#testing-postman)
15. [Sample Credentials for Marking](#sample-credentials-for-marking)

---

## Features

- User signup and login (username **or** email + password)
- Passwords hashed with **bcrypt** and never returned in responses
- **JWT** authentication with `Authorization: Bearer <token>`
- Employee CRUD restricted to the authenticated owner (**per-user visibility and authorization**)
- User → Employee relationship stored in MongoDB (`employee.user` references `User._id`)
- Input validation with **express-validator** (required fields, lengths, email, positive salary, ISO dates, ObjectIds, unknown fields)
- **Helmet** security headers
- **Rate limiting**: login brute-force protection, signup limit and a general API limit
- Centralized JSON error handling with the right HTTP status codes
- Local file logging with **winston** (requests, auth events, validation/authorization failures, errors)
- `GET /health` endpoint with database status
- Postman collection with automated tests for every endpoint

## Technologies

| Area | Technology |
| --- | --- |
| Runtime / framework | Node.js (18+), Express 5 |
| Database | MongoDB, Mongoose 8 (database name: `comp3123_assignment1`) |
| Authentication | jsonwebtoken (HS256), bcryptjs |
| Security | helmet, express-rate-limit, express-validator, cors |
| Configuration | dotenv |
| Logging | winston |
| Testing | Postman (collection included), newman (optional CLI runner) |
| Development | nodemon |

## Project Structure

```
./
├── server.js                    # Entry point: connects to MongoDB, starts the HTTP server, graceful shutdown
├── src/
│   ├── app.js                   # Express app: Helmet, CORS, logging, body parsing, routes, error handling
│   ├── config/
│   │   ├── env.js               # Loads and validates environment variables
│   │   └── db.js                # Mongoose connection (dbName: comp3123_assignment1)
│   ├── routes/
│   │   ├── user.routes.js       # /api/v1/user  (signup, login)
│   │   ├── employee.routes.js   # /api/v1/emp   (employee CRUD, JWT protected)
│   │   └── health.routes.js     # /health
│   ├── controllers/             # HTTP layer: read validated input, call services, send responses
│   ├── services/                # Business logic: users, employees (ownership), JWT tokens
│   ├── models/                  # Mongoose schemas: User, Employee
│   ├── middleware/
│   │   ├── auth.js              # JWT verification (Bearer token)
│   │   ├── rateLimiters.js      # Login / signup / general API rate limits
│   │   ├── validate.js          # Turns validation results into 400 responses
│   │   ├── requestLogger.js     # Logs every request (method, path, status, duration)
│   │   ├── notFound.js          # 404 for unsupported routes
│   │   └── errorHandler.js      # Centralized JSON error handler
│   ├── validators/              # express-validator rules for users and employees
│   └── utils/                   # ApiError, logger, shared regex patterns
├── scripts/
│   ├── seed.js                  # Creates demo User A / User B with employees
│   └── generate-expired-token.js# Prints an expired JWT to test 401 handling
├── postman/
│   └── COMP3123_Assignment1.postman_collection.json
├── logs/                        # Runtime logs (app.log, error.log) – git-ignored; sample.log is committed
├── .env.example                 # Safe example configuration
└── package.json
```

Request flow: **route → (rate limiter) → auth middleware → validation → controller → service → model → MongoDB**, with any error passed to the central error handler.

---

## Installation

### Prerequisites

- Node.js 18 or newer
- MongoDB – either a local MongoDB Community Server or a free MongoDB Atlas cluster
- Postman (for API testing)

### 1. Clone the repository

```bash
git clone https://github.com/aceeejlrz/101549617__COMP3123_Assignment1.git
cd 101549617__COMP3123_Assignment1
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set at least `MONGODB_URI` and `JWT_SECRET`. To generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Start MongoDB

- **Local:** start the MongoDB service (Windows: `net start MongoDB`, macOS: `brew services start mongodb-community`, Linux: `sudo systemctl start mongod`). Use `MONGODB_URI=mongodb://127.0.0.1:27017`.
- **Atlas:** create a cluster, add a database user and allow your IP address, then paste the connection string into `MONGODB_URI`.

The application always uses the database **`comp3123_assignment1`** (set with Mongoose's `dbName` option), and the `users` and `employees` collections are created automatically.

### 5. Start the application

```bash
npm run dev     # development, restarts on file changes (nodemon)
npm start       # plain node
```

The API runs at `http://localhost:3000` (or the `PORT` you configured). Check `http://localhost:3000/health`.

### 6. (Optional) Seed demo data

```bash
npm run seed
```

This creates two demo users, each with two employees (see [Sample Credentials](#sample-credentials-for-marking)).

### 7. Test the API

Import `postman/COMP3123_Assignment1.postman_collection.json` into Postman and run it with the Collection Runner (see [Testing](#testing-postman)), or from the command line:

```bash
npx newman run postman/COMP3123_Assignment1.postman_collection.json
```

---

## Configuration (Environment Variables)

All configuration comes from environment variables (`.env`). The real `.env` file is git-ignored; `.env.example` documents every variable without real secrets.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MONGODB_URI` | **Yes** | – | MongoDB connection string (local or Atlas). The database name is always `comp3123_assignment1`. |
| `JWT_SECRET` | **Yes** | – | Secret used to sign JWTs. Must be at least 32 characters; the server refuses to start otherwise. |
| `PORT` | No | `3000` | HTTP port. |
| `NODE_ENV` | No | `development` | Environment name. |
| `JWT_EXPIRES_IN` | No | `1h` | Token lifetime (`15m`, `1h`, `1d`, or a number of seconds). |
| `BCRYPT_SALT_ROUNDS` | No | `12` | bcrypt cost factor (clamped to 10–15). |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Window for the general `/api` limit (15 min). |
| `RATE_LIMIT_MAX` | No | `300` | Max requests per IP per window for all `/api` routes. |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No | `900000` | Window for login and signup limits (15 min). |
| `LOGIN_RATE_LIMIT_MAX` | No | `5` | Max **failed** login attempts per IP per window. |
| `SIGNUP_RATE_LIMIT_MAX` | No | `20` | Max signup requests per IP per window. |
| `TRUST_PROXY` | No | `false` | Set to `1` when deployed behind a reverse proxy so client IPs are correct. |
| `CORS_ORIGIN` | No | `*` | Allowed origin(s), comma separated. |
| `LOG_LEVEL` | No | `info` | winston log level. |
| `LOG_DIR` | No | `logs` | Directory for log files. |

---

## Data Models

### User (`users` collection)

| Field | Type | Rules |
| --- | --- | --- |
| `_id` | ObjectId | Generated by MongoDB |
| `username` | String | Required, **unique**, 3–30 characters (letters, numbers, `_` `.` `-`), stored in lowercase |
| `email` | String | Required, **unique**, valid email format, stored in lowercase |
| `password` | String | Required; stored only as a **bcrypt hash**; `select: false` and removed from JSON output |
| `created_at` / `updated_at` | Date | Maintained automatically by Mongoose timestamps |

### Employee (`employees` collection)

| Field | Type | Rules |
| --- | --- | --- |
| `_id` | ObjectId | Generated by MongoDB |
| `first_name`, `last_name` | String | Required, 1–50 characters, letters/spaces/`'`/`.`/`-` |
| `email` | String | Required, valid email format |
| `position`, `department` | String | Required, 2–100 characters |
| `salary` | Number | Required, must be a positive number |
| `date_of_joining` | Date | Required, valid ISO 8601 date (e.g. `2024-03-15`) |
| `user` | ObjectId → `User` | **Owner** of the employee. Required, must reference an existing user, immutable, always taken from the JWT |
| `created_at` / `updated_at` | Date | Maintained automatically |

**Relationship:** one user owns many employees (`User 1 ── * Employee`) through `employee.user`. A compound unique index on `{ user, email }` speeds up "my employees" queries and stops one user from adding two employees with the same email. Different users can each have an employee with the same email.

---

## API Reference

Base URL: `http://localhost:3000`

| # | Method | Endpoint | Auth | Success | Description |
| - | --- | --- | --- | --- | --- |
| 1 | POST | `/api/v1/user/signup` | No | **201** | Register a new user |
| 2 | POST | `/api/v1/user/login` | No | **200** | Log in with username or email + password and receive a JWT |
| 3 | GET | `/api/v1/emp/employees` | JWT | **200** | List the authenticated user's employees |
| 4 | POST | `/api/v1/emp/employees` | JWT | **201** | Create an employee owned by the authenticated user |
| 5 | GET | `/api/v1/emp/employees/{eid}` | JWT | **200** | Get one of the authenticated user's employees |
| 6 | PUT | `/api/v1/emp/employees/{eid}` | JWT | **200** | Update one of the authenticated user's employees |
| 7 | DELETE | `/api/v1/emp/employees?eid=xxx` | JWT | **204** | Delete one of the authenticated user's employees |
| – | GET | `/health` | No | **200** | Health check |

All request and response bodies are JSON. Successful responses contain `"status": true`; error responses contain `"status": false` and a `message` (plus an `errors` array for validation errors).

### 1. Signup – `POST /api/v1/user/signup`

Request:

```json
{
  "username": "jane_doe",
  "email": "jane.doe@example.com",
  "password": "Secure@123"
}
```

Password rules: at least 8 characters, with at least one uppercase letter, one lowercase letter, one number and one special character.

Response `201 Created`:

```json
{
  "status": true,
  "message": "User created successfully.",
  "user_id": "6ad18417fa5ae9b67c916c37",
  "user": {
    "_id": "6ad18417fa5ae9b67c916c37",
    "username": "jane_doe",
    "email": "jane.doe@example.com",
    "created_at": "2026-10-16T01:55:35.954Z",
    "updated_at": "2026-10-16T01:55:35.954Z"
  }
}
```

Errors: `400` validation failed (missing fields, invalid email, weak password, unknown fields, malformed JSON) · `409` username or email already exists · `429` too many signup attempts.

### 2. Login – `POST /api/v1/user/login`

Request with **username + password**:

```json
{ "username": "jane_doe", "password": "Secure@123" }
```

or with **email + password**:

```json
{ "email": "jane.doe@example.com", "password": "Secure@123" }
```

Response `200 OK`:

```json
{
  "status": true,
  "message": "Login successful.",
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": "1h",
  "expires_at": "2026-10-16T02:55:36.000Z",
  "user": {
    "_id": "6ad18417fa5ae9b67c916c37",
    "username": "jane_doe",
    "email": "jane.doe@example.com",
    "created_at": "2026-10-16T01:55:35.954Z",
    "updated_at": "2026-10-16T01:55:35.954Z"
  }
}
```

Errors: `400` missing username/email or password · `401` invalid credentials (`"Invalid username/email or password"`, the same message whether the user exists or not) · `429` too many failed attempts.

### 3. List employees – `GET /api/v1/emp/employees`

Header: `Authorization: Bearer <jwt>`

Response `200 OK` (only employees owned by the caller):

```json
{
  "status": true,
  "count": 1,
  "employees": [
    {
      "_id": "6ad18418fa5ae9b67c916c3c",
      "first_name": "Olivia",
      "last_name": "Martin",
      "email": "olivia.martin@example.com",
      "position": "Software Engineer",
      "salary": 85000,
      "date_of_joining": "2024-03-15T00:00:00.000Z",
      "department": "Engineering",
      "user": "6ad18417fa5ae9b67c916c37",
      "created_at": "2026-10-16T01:55:36.759Z",
      "updated_at": "2026-10-16T01:55:36.759Z"
    }
  ]
}
```

### 4. Create employee – `POST /api/v1/emp/employees`

Header: `Authorization: Bearer <jwt>`

```json
{
  "first_name": "Olivia",
  "last_name": "Martin",
  "email": "olivia.martin@example.com",
  "position": "Software Engineer",
  "salary": 85000,
  "date_of_joining": "2024-03-15",
  "department": "Engineering"
}
```

Response `201 Created`:

```json
{
  "status": true,
  "message": "Employee created successfully.",
  "employee_id": "6ad18418fa5ae9b67c916c3c",
  "employee": {
    "_id": "6ad18418fa5ae9b67c916c3c",
    "first_name": "Olivia",
    "last_name": "Martin",
    "email": "olivia.martin@example.com",
    "position": "Software Engineer",
    "salary": 85000,
    "date_of_joining": "2024-03-15T00:00:00.000Z",
    "department": "Engineering",
    "user": "6ad18417fa5ae9b67c916c37",
    "created_at": "2026-10-16T01:55:36.759Z",
    "updated_at": "2026-10-16T01:55:36.759Z"
  }
}
```

The owner (`user`) is set from the JWT. Sending a `user` field (or any other unknown field) returns `400`.

Errors: `400` validation failed · `401` missing/invalid/expired token · `409` you already have an employee with this email.

### 5. Get employee – `GET /api/v1/emp/employees/{eid}`

Response `200 OK`:

```json
{
  "status": true,
  "employee": { "_id": "6ad18418fa5ae9b67c916c3c", "first_name": "Olivia", "...": "..." }
}
```

Errors: `400` invalid ObjectId · `401` · `403` employee belongs to another user · `404` employee not found.

### 6. Update employee – `PUT /api/v1/emp/employees/{eid}`

Send any of the employee fields; at least one is required, and every field sent is validated.

```json
{ "position": "Senior Software Engineer", "salary": 95000 }
```

Response `200 OK`:

```json
{
  "status": true,
  "message": "Employee details updated successfully.",
  "employee": {
    "_id": "6ad18418fa5ae9b67c916c3c",
    "first_name": "Olivia",
    "last_name": "Martin",
    "email": "olivia.martin@example.com",
    "position": "Senior Software Engineer",
    "salary": 95000,
    "date_of_joining": "2024-03-15T00:00:00.000Z",
    "department": "Engineering",
    "user": "6ad18417fa5ae9b67c916c37",
    "created_at": "2026-10-16T01:55:36.759Z",
    "updated_at": "2026-10-16T01:55:37.027Z"
  }
}
```

Errors: `400` invalid id / validation failed / empty body · `401` · `403` · `404` · `409` duplicate employee email.

### 7. Delete employee – `DELETE /api/v1/emp/employees?eid=xxx`

Response `204 No Content` (empty body).

Errors: `400` `eid` missing or invalid · `401` · `403` employee belongs to another user · `404` employee not found.

### Error response format

```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    { "field": "salary", "location": "body", "message": "Salary must be a positive number" },
    { "field": "email", "location": "body", "message": "Email must be a valid email address" }
  ]
}
```

---

## Authentication

1. **Signup:** `POST /api/v1/user/signup`. Input is validated, the password is hashed with bcrypt in the User model's `pre('save')` hook, and the user is stored. The response never includes the password.
2. **Login:** `POST /api/v1/user/login` with `username` or `email` plus `password`. The stored hash is compared with `bcrypt.compare`. If no user matches, a dummy hash is still compared, so the response takes about as long and gives the same message (this makes user enumeration harder).
3. **JWT:** on success the server signs a token (HS256) with `JWT_SECRET`. It contains the user id in the standard `sub` claim and the username, plus `iat`, `exp` and `iss` claims. Default lifetime: 1 hour (`JWT_EXPIRES_IN`).
4. **Authorization header:** clients send the token on every protected request:

   ```
   Authorization: Bearer <jwt_token>
   ```

5. **Protected employee endpoints:** every `/api/v1/emp/employees...` route runs the `authenticate` middleware first, which:
   - rejects a **missing** header → `401 "Access denied. No token provided..."`
   - rejects a **malformed** header (not `Bearer <token>`) → `401`
   - verifies signature, algorithm (HS256 only) and issuer → `401 "Invalid token"`
   - rejects **expired** tokens → `401 "Token has expired. Please log in again."`
   - confirms the user in `sub` still exists in MongoDB → otherwise `401`
   - stores the verified identity in `req.user`. This is the only identity used for ownership.

Authentication runs **before** validation, so an unauthenticated request always receives `401`. To test an expired token without waiting, run `npm run token:expired` and use the printed token.

## Authorization – Employee Ownership

**Rule:** a user can only access employees that belong to that user.

How the server enforces it:

1. **Owner from the token, never from the client.** On create, the service sets `user: req.user.id` (from the verified JWT). A `user` field in the request body is rejected with `400`, and the schema marks `user` as `immutable`, so it can never be changed by an update.
2. **Ownership in every database query.** Read, update and delete all filter by **both** the employee id **and** the owner:

   ```js
   Employee.find({ user: userId })                              // list
   Employee.findOne({ _id: eid, user: userId })                 // get
   Employee.findOneAndUpdate({ _id: eid, user: userId }, ...)   // update
   Employee.findOneAndDelete({ _id: eid, user: userId })        // delete
   ```

   Changing `eid` in the URL or query string cannot reach another user's document, because the filter always includes `user: <authenticated user id>`.
3. **Clear response codes.** When the owner-scoped query finds nothing, the service checks whether the id exists at all:
   - the employee exists but belongs to someone else → **`403 Forbidden`** (and an `Authorization failed` warning is logged)
   - no employee has that id → **`404 Not Found`**

The Postman folder **"06 Ownership – Cross-User Access"** proves this with two users: User A's GET/PUT/DELETE on User B's employee all return 403, the reverse also returns 403, and both employees are confirmed unchanged afterwards.

---

## Security

| Measure | Implementation |
| --- | --- |
| **Password hashing** | bcryptjs with a cost factor of 12 (configurable). Hashing happens in the model's `pre('save')` hook, so a plain-text password is never stored. The field has `select: false` and is stripped from JSON output, so it is never returned. |
| **JWT** | Signed with a secret from the environment (minimum 32 characters, checked at startup). Verification only accepts HS256 (this blocks `alg: none` tokens), checks the issuer and expiry, and confirms the user still exists. |
| **Helmet** | `app.use(helmet())` sets security headers on every response: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` and others, and it removes `X-Powered-By`. These headers help protect against MIME sniffing, clickjacking, protocol downgrade, cross-site leaks and technology fingerprinting. |
| **Rate limiting** | express-rate-limit (see below). |
| **Input validation** | express-validator on every route: types, required fields, lengths, email format, positive numeric salary, strict ISO 8601 dates, MongoDB ObjectIds, and rejection of unknown fields (blocks mass assignment such as `user`, `_id`, `role`). Mongoose schema validators are a second layer. |
| **NoSQL injection** | Validators require strings (so `{"username": {"$gt": ""}}` is rejected), and Mongoose `sanitizeFilter` wraps any `$` operators in query filters. |
| **Environment variables** | Secrets (`MONGODB_URI`, `JWT_SECRET`) come only from `.env`, which is git-ignored. `.env.example` contains placeholders. The server refuses to start without them. |
| **Request limits** | JSON bodies are limited to 10 KB (`413` if larger). Bodies must be JSON objects. |
| **Error responses** | Stack traces and internal details are only logged. Clients receive generic messages for `500` errors. |

### Rate limiting

**What it is:** rate limiting caps how many requests a client (identified by IP address) can make in a time window. It slows down brute-force password guessing, credential stuffing, mass account creation and request floods.

**Protected endpoints:**

| Limiter | Applies to | Default limit |
| --- | --- | --- |
| Login | `POST /api/v1/user/login` | **5 failed attempts** per IP per 15 minutes (successful logins are not counted) |
| Signup | `POST /api/v1/user/signup` | 20 requests per IP per 15 minutes |
| General API | every `/api/...` route | 300 requests per IP per 15 minutes |

**When the limit is exceeded:** the server responds with **`429 Too Many Requests`** and stops processing the request. The response includes standard rate-limit headers, and a warning is written to the log. All further requests to that endpoint from the same IP get 429 until the window resets (the block also applies to a correct password, which is what stops brute-force attacks).

Tested result (6th failed login within 15 minutes):

```
HTTP/1.1 429 Too Many Requests
RateLimit-Policy: 5;w=900
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 898
Retry-After: 898

{"status":false,"message":"Too many failed login attempts from this IP. Please try again after 15 minute(s)."}
```

Counters are kept in memory, so restarting the server resets them. The limits are configurable through `.env`.

---

## Error Handling & HTTP Status Codes

All errors go through one central error handler (`src/middleware/errorHandler.js`), which returns a consistent JSON body. Operational errors are thrown as `ApiError` objects. Mongoose validation/cast errors, duplicate-key errors (`11000`), malformed JSON and JWT errors are converted to the right status codes. Unknown routes return a JSON `404`.

| Code | When it is used |
| --- | --- |
| **200 OK** | Successful login, list, get and update |
| **201 Created** | User registered, employee created |
| **204 No Content** | Employee deleted (empty body) |
| **400 Bad Request** | Validation failed, malformed JSON, invalid ObjectId, missing `eid`, unknown fields, empty update |
| **401 Unauthorized** | Invalid login credentials; missing, malformed, invalid or expired JWT |
| **403 Forbidden** | Authenticated user tries to access an employee owned by another user |
| **404 Not Found** | Employee does not exist; unsupported route |
| **409 Conflict** | Username or email already registered; duplicate employee email for the same user |
| **413 Payload Too Large** | JSON body larger than 10 KB |
| **429 Too Many Requests** | Rate limit exceeded |
| **500 Internal Server Error** | Unexpected server or database error (details are logged, not returned) |

---

## Logging

- **Library:** winston
- **Location:** `logs/app.log` (all levels from `info` up) and `logs/error.log` (errors only), relative to the project root (configurable with `LOG_DIR`). Files rotate at 5 MB and keep 5 files. Logs are also printed to the console.
- **Format:** one JSON object per line with a `timestamp` and `level`.

**What is logged:**

| Event | Example message |
| --- | --- |
| Server startup / database connection | `Server started on http://localhost:3000`, `MongoDB connected` |
| Every API request | `GET /api/v1/emp/employees 200` with method, path, status, duration (ms), client IP, user id |
| Authentication attempts | `User signup successful`, `Login successful`, `Login failed: invalid credentials`, `Authentication failed: expired token` |
| Validation failures | `Validation failed` with the field names and messages |
| Authorization failures | `Authorization failed: employee belongs to another user` with user id and employee id |
| Successful operations | `Employee created`, `Employee updated`, `Employee deleted` |
| Rate limiting | `Rate limit exceeded: login` |
| Errors | `Unhandled error` with the stack trace (`error.log`) |

**Intentionally excluded:** passwords (request bodies are never logged, and validation logs only contain field names and messages, never submitted values), JWT tokens and the `Authorization` header, `JWT_SECRET`, and the MongoDB connection string or credentials (only the host name is logged).

Generated log files are git-ignored. **`logs/sample.log`** is a real log captured during a full Postman collection run, included as evidence.

Sample entries (taken from `logs/sample.log`):

```json
{"event":"login","identifier":"user_a_mvabejn4","ip":"::1","level":"info","message":"Login successful","timestamp":"2026-10-16T01:54:40.027Z","userId":"6ad183de26b27ffc86d39720"}
{"errors":[{"field":"email","message":"Email must be a valid email address"}],"level":"warn","message":"Validation failed","method":"POST","path":"/api/v1/user/signup","timestamp":"2026-10-16T01:54:39.452Z"}
{"action":"read","employeeId":"6ad183e326b27ffc86d3974a","event":"authorization","level":"warn","message":"Authorization failed: employee belongs to another user","timestamp":"2026-10-16T01:54:43.395Z","userId":"6ad183de26b27ffc86d39720"}
{"durationMs":5,"ip":"::1","level":"info","message":"GET /api/v1/emp/employees 200","method":"GET","path":"/api/v1/emp/employees","status":200,"timestamp":"2026-10-16T01:54:41.890Z","type":"request","userId":"6ad183de26b27ffc86d39720"}
```

---

## Health Check

`GET /health` (no authentication, not rate limited)

Response `200 OK`:

```json
{
  "status": "ok",
  "message": "COMP3123 Assignment 1 API is running",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-10-16T01:55:35.877Z",
  "uptime_seconds": 6,
  "database": {
    "status": "connected",
    "name": "comp3123_assignment1"
  }
}
```

`status` is `"ok"` when MongoDB is connected and `"degraded"` when the server is running but the database is not connected. `database.status` can be `connected`, `connecting`, `disconnecting` or `disconnected`.

---

## Testing (Postman)

The collection **`postman/COMP3123_Assignment1.postman_collection.json`** contains 54 requests in 10 folders. Each request has test scripts that check the status code and the response body:

| Folder | Covers |
| --- | --- |
| 00 Health & Security Headers | `/health`, Helmet headers present, no `X-Powered-By` |
| 01 User Signup | valid signup (User A and User B), duplicate username, duplicate email, invalid email, invalid password, missing fields, malformed JSON |
| 02 User Login | username + password, email + password, invalid credentials, unknown user, missing credentials |
| 03 JWT Authentication | missing JWT, malformed header, invalid JWT, expired JWT |
| 04 Employees – User A CRUD | create, list, get by id, update; missing fields, invalid email, invalid salary, invalid date, client-supplied owner, missing JWT, invalid id, non-existent employee, invalid update, empty update |
| 05 Employees – User B | User B creates an employee; each user's list only contains their own employees |
| 06 Ownership – Cross-User Access | A → B and B → A for GET/PUT/DELETE all return **403**; data confirmed unchanged |
| 07 Delete Employee | delete (204), get deleted (404), missing/invalid `eid` (400), non-existent (404), missing JWT (401) |
| 08 Unsupported Routes | unknown route returns a JSON 404 |
| 09 Rate Limiting | repeats failed logins until **429**, checks the rate-limit headers, and confirms a valid login is also blocked |

**How to run:**

1. Start the API (`npm run dev`).
2. Import the collection into Postman. Check the `baseUrl` collection variable (default `http://localhost:3000`).
3. *(Optional)* run `npm run token:expired` and paste the token into the `expiredToken` collection variable.
4. Run the whole collection with the **Collection Runner**, in order. Signup generates new usernames each run, and the JWTs and employee IDs are saved to collection variables automatically.
5. The last folder triggers the login rate limiter. **Restart the server** (or wait 15 minutes) before running the collection again.

Command line alternative:

```bash
npx newman run postman/COMP3123_Assignment1.postman_collection.json
```

Latest run: **56 requests, 183 assertions, 0 failures** (the rate-limit request repeats itself until it gets 429).

---

## Sample Credentials for Marking

Run `npm run seed` to create these **non-sensitive demo accounts** in your local database. They are for testing only.

| User | Username | Email | Password | Employees |
| --- | --- | --- | --- | --- |
| User A | `demo_user_a` | `demo.user.a@example.com` | `DemoUserA@2026` | Olivia Martin, Liam Chen |
| User B | `demo_user_b` | `demo.user.b@example.com` | `DemoUserB@2026` | Noah Williams, Emma Brown |

Log in as each user to confirm that User A only sees Olivia and Liam, User B only sees Noah and Emma, and that using the other user's employee id returns `403 Forbidden`.
