# Product Catalog

A full-stack MERN e-commerce application with role-based access control for Users, Sellers, and Admins.

## Architecture

- **Stack:** MongoDB, Express.js, React, Node.js
- **Pattern:** MVC (Model-View-Controller)
- **Frontend:** React (built and served from `/frontend/dist`)

## Features

### User Panel
- Browse products with guest cart functionality
- User authentication with cart merge on login
- Checkout process with Stripe integration

### Seller Panel
- Inventory and stock management
- Order overview and management
- Top-selling products analytics table

### Admin Panel
- Platform overview with pie charts
- Complete user and seller management
- All products and orders tables
- System-wide analytics

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

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
# Example structure (see .env.example for full list)
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
STRIPE_SECRET_KEY=your_stripe_key
NODE_ENV=production
```

## Running the Application

```bash
# Development mode (serves React frontend from dist)
NODE_ENV=production npm run dev

# Production mode
npm start
```

The application will serve the built React frontend from `/frontend/dist`.

## Dependencies

### Core
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **bcrypt** - Password hashing
- **jsonwebtoken** - Authentication tokens
- **cookie-parser** - Cookie handling

### Security
- **helmet** - HTTP headers security
- **express-rate-limit** - Rate limiting
- **cors** - Cross-origin resource sharing

### File Management
- **multer** - File upload handling
- **cloudinary** - Cloud storage for images
- **multer-storage-cloudinary** - Cloudinary integration

### Payment & Validation
- **stripe** - Payment processing
- **joi** - Request validation
- **dotenv** - Environment variables

## Project Structure

```
Product-Catalog/
├── controllers/       # Business logic
├── models/           # MongoDB schemas
├── routes/           # API endpoints
├── middlewares/      # Custom middleware
├── services/         # Service layer
├── utils/            # Helper functions
├── frontend/dist/    # Built React application
└── app.js           # Entry point
```

## API Endpoints

- `/api/users` - User authentication and management
- `/api/sellers` - Seller operations
- `/api/admin` - Admin operations
- `/api/products` - Product CRUD
- `/api/cart` - Cart management
- `/api/orders` - Order processing

## Collaborators

**Frontend Development:** [Frontend Developer Name/Reference]

## Contact

**Developer:** Waqas Anwar  
**Email:** waqasanwar1308@gmail.com

## License

This project is licensed under the MIT License.
