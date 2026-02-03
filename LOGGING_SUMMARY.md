# 📊 Logging Module - Complete System Summary

## 🏗️ Architecture Overview

```
Request Flow:
┌─────────────┐
│  Browser   │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────────────────────────────────┐
│              app.js                              │
│  • Express setup                                │
│  • loggingMiddleware (request ID, timing)       │
│  • Global crash handlers                        │
│  • uploadLogsCronJob (scheduled)                │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│           Routes (11 files)                      │
│  • withLogging wraps auth/validation middlewares│
│  • Logs middleware success/failure              │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│        Controllers (13 files)                    │
│  • logActivity (user actions → MongoDB)         │
│  • logError (errors → error.log)                │
│  • logSecurity (auth failures → security.log)  │
│  • logApplication (business logic → app.log)   │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  Services (mongooseLogger, serviceLogger)       │
│  • Track slow database queries (>100ms)         │
│  • Track slow service operations (>100ms)       │
│  • Auto log errors with context                 │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│          Logging Outputs                         │
│  • MongoDB: Activity logs (queryable)           │
│  • Files: system.log, application.log,          │
│           security.log, access.log, error.log   │
│  • Cloudinary: Archived completed logs          │
└─────────────────────────────────────────────────┘
```

---

## 📋 Component Breakdown

### **1. app.js** 🚀
**Purpose:** Application entry point and logging orchestration

**What it does:**
- ✅ Registers `loggingMiddleware` (first middleware - captures all requests)
- ✅ Registers global crash handlers:
  - `uncaughtException` → logs CRITICAL error and exits
  - `unhandledRejection` → logs rejection and continues
- ✅ Imports all route modules
- ✅ Registers `errorHandler` (catches all route errors)
- ✅ Calls `uploadLogsCronJob()` at startup (uploads logs daily)
- ✅ Logs server lifecycle events (START, DB_CONNECTED, READY)

**Log Events Created:**
- `SERVER_START` - Server starting
- `DATABASE_CONNECTED` - MongoDB connected
- `SERVER_READY` - Server listening
- `UNCAUGHT_EXCEPTION` - Unhandled errors (critical)
- `UNHANDLED_REJECTION` - Promise rejections

**Code Pattern:**
```javascript
logSystem({
  event: "SERVER_START",
  message: `Server starting on port ${PORT}`
});

uploadLogsCronJob(); // ← Starts daily log upload task
```

---

### **2. middlewares/logging.middleware.js** 📍
**Purpose:** Request-level tracking (request ID, timing, actor info)

**What it does:**
- ✅ Generates unique request ID (UUID) for each request
- ✅ Attaches requestId to `req.requestId` (available in all controllers)
- ✅ Sets response header `x-request-id` (client can track in browser dev tools)
- ✅ Measures response time using `process.hrtime.bigint()` (nanosecond precision)
- ✅ Determines actor type: `USER` (authenticated) or `ANON` (anonymous)
- ✅ For anonymous users, generates hash of IP + User-Agent (privacy-aware)
- ✅ Extracts IP address (handles proxies with `x-forwarded-for`)
- ✅ Parses user agent (Chrome, Firefox, Safari, Postman, etc.)
- ✅ Calls `logAccess()` with full request metadata

**Log Output:** Goes to `access.log`

**Example Log:**
```
GET /api/products 200 45ms [USER: user-123] [Postman]
```

**Data Passed to logAccess():**
```javascript
{
  requestId: "abc-123-def",
  method: "GET",
  path: "/api/products",
  statusCode: 200,
  responseTime: 45,  // milliseconds
  ip: "192.168.1.1",
  userAgent: "Chrome",
  actorType: "USER",
  userId: "user-123"
}
```

---

### **3. middlewares/withLogging.js** 🔐
**Purpose:** Wrap individual middleware to log success/failure

**What it does:**
- ✅ Takes a middleware name and the middleware function
- ✅ Measures execution time of that middleware
- ✅ Catches middleware errors
- ✅ Logs success: `MIDDLEWARE_SUCCESS` with duration
- ✅ Logs failure: `MIDDLEWARE_FAILURE` with error message
- ✅ Logs crashes: `MIDDLEWARE_ERROR` if middleware throws

**Usage in Routes:**
```javascript
router.post('/place',
  withLogging('Auth', verifyAuth),
  withLogging('AuthRole', authorizeRoles("user")),
  withLogging('Validation', validateBody(schema)),
  placeOrderCOD
)
```

**Log Events Created:**
- `MIDDLEWARE_SUCCESS` - e.g., "Auth completed in 5ms"
- `MIDDLEWARE_FAILURE` - e.g., "Auth failed: Invalid token"
- `MIDDLEWARE_ERROR` - Middleware crashed

**Logs go to:** `application.log` (success) or `security.log` (failure)

---

### **4. utils/logger.js** 🎯
**Purpose:** Core logging system with 6 specialized loggers

**The 6 Loggers & Their Outputs:**

| Logger | Purpose | Output | Retention |
|--------|---------|--------|-----------|
| `activityLogger` | User actions (login, create, update, delete) | MongoDB + Console | Queryable, kept long-term |
| `systemLogger` | Server events (startup, shutdown, config) | system.log + Console | 30 days |
| `applicationLogger` | Business logic, slow queries | application.log + Console | 30 days |
| `securityLogger` | Failed logins, permission denials, attacks | security.log + Console | 90 days (compliance) |
| `accessLogger` | HTTP requests (timing, status, actor) | access.log (file only) | 14 days |
| `errorLogger` | All errors with stack traces | error.log + Console | 90 days |

**The 6 Helper Functions:**

```javascript
logActivity({ action, target, user, role, status, message, ... })
// → Activity logs to MongoDB
// Used in: controllers when user performs actions

logError({ error, context, metadata, ... })
// → Errors to error.log
// Used in: controllers, services, middleware

logSecurity({ event, severity, user, ip, message, ... })
// → Security events to security.log
// Used in: auth controllers, failed operations

logSystem({ event, message, metadata, ... })
// → System events to system.log
// Used in: app.js, startup/shutdown

logApplication({ event, message, metadata, ... })
// → Business logic to application.log
// Used in: middlewares, services (slow queries)

logAccess({ method, path, statusCode, responseTime, ... })
// → HTTP access to access.log
// Used in: loggingMiddleware (automatically)
```

**Custom MongoDB Transport:**
```javascript
class ActivityDatabaseTransport extends Transport
// Only ACTIVITY logs go to MongoDB (80% of logs)
// Others go to files (system, security, errors, etc.)
// This keeps DB lightweight, files handle volume
```

**Daily Log Rotation:**
- Files rotate daily: `access-2026-02-03.log`, `access-2026-02-04.log`, etc.
- Compression: Old logs compressed to `.gz` to save disk space
- Auto-cleanup: Oldest files deleted based on retention policy

---

### **5. utils/mongooseLogger.js** 🗄️
**Purpose:** Track slow database queries at the Mongoose schema level

**What it does:**
- ✅ Mongoose plugin that hooks into query lifecycle
- ✅ Wraps these operations: find, findOne, findById, updateOne, deleteOne, save, etc.
- ✅ Measures execution time using `process.hrtime.bigint()`
- ✅ If query takes **>100ms**, logs as WARN
- ✅ Logs query model name and method (e.g., "Product.findOne took 120ms")

**How it's Used:**
```javascript
// Applied to schemas in models/
productSchema.plugin(queryLoggerPlugin);
```

**Example Log:**
```
SLOW_DB_QUERY: Product.findOne took 145ms
```

**Logs go to:** `application.log`

**Benefit:** Identifies database bottlenecks automatically

---

### **6. utils/serviceLogger.js** 🔧
**Purpose:** Track slow service method calls

**What it does:**
- ✅ Creates a Proxy wrapper around service instances
- ✅ Intercepts all method calls on the service
- ✅ Measures execution time of each method
- ✅ If method takes **>100ms**, logs as WARN
- ✅ Catches errors and logs them with context

**How it's Used:**
```javascript
const ProductService = createLoggedService(
  'ProductService',
  new ProductServiceClass()
);
```

**Example Log:**
```
SLOW_SERVICE_OP: ProductService.findById took 150ms
```

**Logs go to:** `application.log`

**Benefit:** Identifies slow business logic automatically (not just DB)

---

### **7. utils/uploadLogsToCloudinary.js** ☁️
**Purpose:** Archive completed logs to cloud storage

**What it does:**
- ✅ Runs on a **cron schedule** (daily)
- ✅ Finds all **completed log files** (not today's file, which is still being written to)
- ✅ Both `.log` and `.gz` (compressed) files are eligible
- ✅ Uploads each file to Cloudinary
- ✅ Organized in folder structure: `logs/{env}/{type}/{year}/{month}/{day}`
- ✅ Logs the upload success/failure
- ✅ Handles errors gracefully (doesn't crash server)

**Example Upload Path:**
```
logs/production/error/2026/02/03/error-2026-02-03.log
logs/production/security/2026/02/03/security-2026-02-03.log.gz
```

**Log Events Created:**
- `LOG_UPLOAD_SUCCESS` - File uploaded to Cloudinary
- `LOG_UPLOAD_FAILED` - Upload error
- `LOG_UPLOAD_SKIPPED` - File is empty
- `NO_LOGS_TO_UPLOAD` - No completed files found
- `LOG_READ_FAILED` - Can't read logs directory

**Benefit:** 
- Permanent backup of logs (Cloudinary is reliable)
- Local disk doesn't fill up (old logs archived)
- Searchable archive in cloud

---

### **8. middlewares/errorHandler.js** ⚠️
**Purpose:** Global error catcher for all routes

**What it does:**
- ✅ Catches **any error thrown in route handlers**
- ✅ Calls `logError()` with error details, path, method, userId
- ✅ Hides error details in production (security)
- ✅ Returns consistent JSON error response with requestId
- ✅ Status code: uses error's status or defaults to 500

**Usage:**
- Automatically registered in app.js: `app.use(errorHandler)` (LAST middleware)

**Example Response:**
```javascript
{
  error: true,
  message: "Internal server error",  // In production
  requestId: "abc-123"
}
```

**Logs go to:** `error.log`

---

### **9. Routes (11 files)** 🛣️
**Purpose:** Expose API endpoints with middleware protection

**Key Pattern:**
```javascript
router.post('/place',
  withLogging('Auth', verifyAuth),                    // ✅ Logs auth
  withLogging('AuthRole', authorizeRoles("user")),    // ✅ Logs role check
  actionLimiter(),                                     // Rate limiting
  withLogging('Validation', validateBody(schema)),    // ✅ Logs validation
  placeOrderCOD                                        // ← Controller
)
```

**Routes Using withLogging:**
- ✅ products.routes.js (11 routes)
- ✅ cart.routes.js (4 routes)
- ✅ order.routes.js (6 routes)
- ✅ inventory.routes.js (6 reports)
- ✅ userAuth.routes.js (5 routes)
- ✅ sellerAuth.routes.js (5 routes)
- ✅ superAdmin.routes.js (4+ routes)
- ✅ adminChat.routes.js (4+ routes)
- ✅ chat.routes.js (3+ routes)
- ✅ activity.routes.js (2+ routes)
- ✅ me.js (1 route)

**Log Events Created:**
- Success/failure of each middleware (via withLogging)
- Then controller logs business actions (via logActivity/logError)

---

### **10. Controllers (13 files)** 🎮
**Purpose:** Handle business logic and API responses

**Logging Pattern:**

```javascript
export const placeOrder = async (req, res) => {
  try {
    // Business logic here
    
    // On success
    logActivity({
      action: 'PLACE_ORDER',
      user: req.auth.userId,
      role: 'User',
      status: 'success',
      message: `User placed order: ${orderId}`,
      metadata: { orderId, total, requestId: req.requestId }
    });
    
    res.json({ success: true, orderId });
  } catch (error) {
    // On error
    logError({
      error,
      context: 'PlaceOrder.payment',
      metadata: { userId: req.auth.userId, requestId: req.requestId }
    });
    
    res.status(500).json({ error: true, message: error.message });
  }
};
```

**Controllers with Good Logging (9/13):**
- ✅ sellerProducts.controller.js (11 logs)
- ✅ sellerAuth.controller.js (18 logs - excellent!)
- ✅ superAdminAuth.controller.js (7 logs)
- ✅ adminChat.controller.js (2 logs)
- ✅ chat.controller.js (3 logs)
- ✅ order.controller.js (logActivity/logError)
- ✅ sellerOrders.controller.js (logActivity/logError)
- ✅ superAdminManage.controller.js (logActivity/logError)
- ✅ cart.controller.js (logActivity/logError)

**Controllers without Logging (4/13) - Not Critical:**
- ⚠️ publicProducts.controller.js (public read-only, no mutations)
- ⚠️ me.controller.js (just reads user data)
- ⚠️ activity.controller.js (reads logs, not critical)
- ⚠️ sellerInventory.controller.js (non-critical reports)

**Log Events Created:**
- `PLACE_ORDER`, `UPDATE_ORDER_STATUS`, `CANCEL_ORDER`, etc.
- `LOGIN`, `REGISTER`, `EMAIL_VERIFY`, etc.
- `DELETE_SELLER`, `DELETE_PRODUCT`, etc.
- All user actions go to MongoDB + activity logs queryable

---

## 🔄 Complete Request Lifecycle

### **Example: User Places an Order**

```
1. Browser sends POST /api/order/place
   ↓
2. loggingMiddleware catches it
   • Generates requestId: "abc-123"
   • Starts timer
   ↓
3. withLogging('Auth', verifyAuth) middleware
   • Checks token
   • Logs: MIDDLEWARE_SUCCESS (auth passed)
   ↓
4. withLogging('AuthRole', authorizeRoles("user")) middleware
   • Checks user role
   • Logs: MIDDLEWARE_SUCCESS (role check passed)
   ↓
5. actionLimiter() middleware
   • Rate limiting check
   ↓
6. withLogging('Validation', validateBody(schema)) middleware
   • Validates request body
   • Logs: MIDDLEWARE_SUCCESS (validation passed)
   ↓
7. placeOrderCOD controller
   • Fetches products
   • mongooseLogger: Logs if queries >100ms
   • Validates inventory
   • Creates order in DB
   • Calls OrderService methods
   • serviceLogger: Logs if operations >100ms
   • logActivity({ action: 'PLACE_ORDER', ... })
     → Stored in MongoDB activity logs
   ↓
8. loggingMiddleware (finish event)
   • Calculates total response time: 150ms
   • logAccess({ path: '/api/order/place', responseTime: 150 })
     → Written to access.log
   ↓
9. Response sent to client with x-request-id header
   ↓
10. Daily cron job (uploadLogsCronJob)
    • Uploads access.log, error.log, etc. to Cloudinary
    • Compresses old logs
    • Deletes based on retention policy
```

---

## 📊 Log Files & Locations

```
logs/server/
├── access-2026-02-03.log        (All HTTP requests)
├── application-2026-02-03.log   (Business logic, slow queries)
├── error-2026-02-03.log         (All errors with stack traces)
├── security-2026-02-03.log      (Failed logins, attacks, permissions)
├── system-2026-02-03.log        (Server startup, shutdown, events)
├── access-2026-02-02.log.gz     (Compressed archive)
├── application-2026-02-02.log.gz
└── ... (older compressed files)

MongoDB:
└── ActivityLog collection (All user actions, queryable)
```

---

## 🎯 Log Retention Policy

| Log Type | Retention | Storage | Searchable |
|----------|-----------|---------|-----------|
| Access (HTTP) | 14 days | File | No (grep only) |
| Application | 30 days | File | No (grep only) |
| System | 30 days | File | No (grep only) |
| Security | 90 days | File | No (grep only) |
| Error | 90 days | File | No (grep only) |
| Activity | ∞ | MongoDB | **Yes** (queryable) |

---

## 🚀 Startup Sequence

```javascript
// app.js startup:

1. Global crash handlers registered
   ↓
2. Express app created
   ↓
3. loggingMiddleware registered (FIRST)
   ↓
4. Security middleware (helmet, cors, etc.)
   ↓
5. Body parsers
   ↓
6. All routes registered
   ↓
7. Global errorHandler registered (LAST)
   ↓
8. startServer() called:
   a. logSystem('SERVER_START')
   b. connectDB() → MongoDB connection
   c. logSystem('DATABASE_CONNECTED')
   d. uploadLogsCronJob() → Starts daily schedule
   e. httpServer.listen()
   f. logSystem('SERVER_READY')
```

---

## ✅ Summary Checklist

- ✅ **Request Tracking:** Every request gets unique ID + response time
- ✅ **Middleware Logging:** Each middleware logged for success/failure
- ✅ **Controller Logging:** Business logic logged (9/13 controllers)
- ✅ **Error Handling:** Global error handler + per-controller try/catch
- ✅ **Database Monitoring:** Slow queries logged automatically (>100ms)
- ✅ **Service Monitoring:** Slow operations logged automatically (>100ms)
- ✅ **Security Events:** Failed logins, permission denials tracked
- ✅ **Activity Audit:** All user actions in MongoDB (queryable)
- ✅ **Log Rotation:** Daily rotation, compression, cleanup
- ✅ **Cloud Backup:** Logs archived to Cloudinary daily
- ✅ **Crash Handling:** Uncaught exceptions and rejections logged

---

## 🎓 Key Takeaways

1. **Everything is logged** - From request entry to response exit
2. **Multiple log levels** - Activity, error, security, system, application, access
3. **Automatic monitoring** - Slow queries and operations detected
4. **Permanent audit trail** - All user actions in MongoDB, searchable
5. **Scalable storage** - Old logs archived to cloud, disk space managed
6. **Request tracing** - Unique ID follows request through entire stack
7. **Well-integrated** - Logging touches app.js, routes, controllers, services
