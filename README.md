# Product Catalog

A full-stack MERN e-commerce application with role-based access control for Users, Sellers, and Admins, featuring real-time chat functionality.

## Architecture

- **Stack:** MongoDB, Express.js, React, Node.js
- **Pattern:** MVC (Model-View-Controller)
- **Real-time Communication:** Socket.IO
- **Frontend:** React (built and served from `/frontend/dist`)

## Features

### User Panel
- Browse products with guest cart functionality
- User authentication with cart merge on login
- Email verification for account security
- Real-time chat with sellers
- Checkout process with Stripe integration

### Seller Panel
- Inventory and stock management
- Order overview and management
- Real-time chat with buyers
- Email verification for account security
- Top-selling products analytics table

### Admin Panel
- Platform overview with pie charts
- Complete user and seller management
- All products and orders tables
- System-wide analytics

### Real-time Chat System
- Direct messaging between users and sellers
- Typing indicators for enhanced user experience
- Message read/unread status tracking
- Room-based chat organization (one room per user-seller pair)
- Real-time message notifications
- JWT-based Socket.IO authentication
- Chat history persistence

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn
- SMTP credentials (for email verification)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd Product-Catalog

# Install dependencies
npm install
```

## Configuration

1. Create `.env.production` file in the root directory
2. Copy all variables from `.env.example`
3. Fill in your credentials:

```env
# Server Configuration
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payment Processing
STRIPE_SECRET_KEY=your_stripe_key

# Email Service (for verification)
SENDGRID_API_KEY=your_sendgrid_api
SENDGRID_FROM_EMAIL=your_google_email
SENDGRID_FROM_NAME=your_sengrid_email_title
```

## Running the Application

```bash
# Development mode (serves React frontend from dist)
NODE_ENV=production npm run dev

# Production mode
npm start
```

The application will serve the built React frontend from `/frontend/dist` and run Socket.IO server for real-time communication.

## Dependencies

### Core
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **bcrypt** - Password hashing
- **jsonwebtoken** - Authentication tokens
- **cookie-parser** - Cookie handling

### Real-time Communication
- **socket.io** - WebSocket library for real-time bidirectional communication
- **http** - HTTP server wrapper for Socket.IO integration

### Security
- **helmet** - HTTP headers security
- **express-rate-limit** - Rate limiting
- **cors** - Cross-origin resource sharing

### File Management
- **multer** - File upload handling
- **cloudinary** - Cloud storage for images
- **multer-storage-cloudinary** - Cloudinary integration

### Email & Verification
- **sendgrid** - Email sending service
- Email templates for verification codes

### Payment & Validation
- **stripe** - Payment processing
- **joi** - Request validation
- **dotenv** - Environment variables

## Project Structure

```
Product-Catalog/
├── controllers/       # Business logic
│   └── chat.controller.js
├── models/           # MongoDB schemas
│   └── chatMessage.model.js
├── routes/           # API endpoints
│   └── chat.routes.js
├── middlewares/      # Custom middleware
│   ├── verifyAuth.js
│   └── authorizeRoles.js
├── services/         # Service layer
│   ├── chatMessage.service.js
│   └── email.service.js
├── utils/            # Helper functions
│   ├── socketHandler.js
│   ├── emailTemplate.js
│   └── cloudinary.config.js
├── config/           # Configuration files
│   └── email.config.js
├── frontend/dist/    # Built React application
└── app.js           # Entry point
```

## API Endpoints

### Authentication
- `/api/users` - User authentication and management
- `/api/user/auth/verify-email` - Email verification for users
- `/api/sellers` - Seller operations
- `/api/seller/auth/verify-email` - Email verification for sellers

### E-commerce
- `/api/products` - Product CRUD
- `/api/cart` - Cart management
- `/api/orders` - Order processing
- `/api/inventory` - Inventory management

### Chat System
- `/api/chat/rooms` - Get user's chat rooms
- `/api/chat/rooms/seller` - Get seller's chat rooms
- `/api/chat/room-id` - Compute room ID for user-seller pair

### Admin
- `/api/superadmin` - Admin operations

## Socket.IO Events

### User Events
- `join_chat_room` - Join a chat room with a seller
- `send_message` - Send message to seller
- `typing_start` / `typing_stop` - Typing indicators
- `leave_chat_room` - Leave a chat room

### Seller Events
- `join_seller_chat_room` - Join a chat room with a user
- `send_seller_message` - Send message to user
- `seller_typing_start` / `seller_typing_stop` - Typing indicators
- `leave_seller_chat_room` - Leave a chat room

### Shared Events
- `new_message` - Receive new messages
- `new_message_notification` - Receive message notifications
- `chat_history` - Receive chat history on room join
- `error` - Socket error handling

## Chat System Architecture

### Room ID Format
```
user-{userId}-seller-{sellerId}
```
This ensures all products from the same seller go to the same room, centralizing communication.

### Authentication
Socket.IO connections are authenticated using JWT tokens passed through:
- `socket.handshake.auth.token`, or
- `socket.handshake.headers.authorization`

### Message Flow
1. User/Seller joins room via `join_chat_room` or `join_seller_chat_room`
2. Messages are saved to MongoDB via `ChatMessageService`
3. Messages are broadcast to all sockets in the room
4. Notifications are sent to offline participants
5. Messages are marked as read when users view the chat

## Contributors

**Frontend Development:**  
<a href="https://github.com/ww31b">
  <img src="https://github.com/ww31b.png" width="50" height="50" alt="ww31b"/>
</a>  
**Fazila Sohail**  
[Frontend Repository](https://github.com/ww31b/Mini-Product-Catalog-Frontend)

**Backend Development:**  
**Waqas Anwar**

## Contact

**Developer:** Waqas Anwar  
**Email:** waqasanwar1308@gmail.com

## License

This project is licensed under the MIT License.
