# Control de Compra - Backend API

Backend API for Control de Compra, an offline-first purchase management system for cacao and other products.

## 🚀 Tech Stack

- **Node.js** + **Express** - REST API
- **Prisma** - ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Swagger** - API Documentation
- **bcrypt** - Password hashing
- **Nodemailer** - Email service

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- SMTP email account (Gmail, SendGrid, etc.)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd control-de-compra-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT
- `EMAIL_*` - Email service configuration

4. **Setup database**
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with default data
npm run prisma:seed
```

## 🏃 Running the Server

### Development mode (with auto-reload)
```bash
npm run dev
```

### Production mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Swagger JSON**: http://localhost:3000/api-docs.json

## 🔑 Default Credentials

After running the seed script:
- **Email**: admin@controldecompra.com
- **Password**: admin123

⚠️ **Change these credentials in production!**

## 📁 Project Structure

```
control-de-compra-backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.js             # Database seeding
├── src/
│   ├── config/
│   │   └── swagger.js      # Swagger configuration
│   ├── middleware/
│   │   ├── auth.js         # Authentication middleware
│   │   └── validation.js   # Validation middleware
│   ├── routes/
│   │   └── auth.js         # Authentication routes
│   ├── utils/
│   │   └── emailService.js # Email templates
│   └── server.js           # Main server file
├── .env.example            # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Use token in requests
```bash
Authorization: Bearer <your-jwt-token>
```

## 🗄️ Database

### View database in Prisma Studio
```bash
npm run prisma:studio
```

### Create new migration
```bash
npm run prisma:migrate
```

## 🚢 Deployment (Railway)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Deploy to Railway**
- Go to [Railway.app](https://railway.app)
- Create new project from GitHub repo
- Add PostgreSQL database
- Set environment variables
- Deploy!

Railway will automatically:
- Install dependencies
- Run Prisma migrations
- Start the server

## 📝 Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed database
- `npm test` - Run tests

## 🌍 Multi-language Support

The API supports Spanish (es) and English (en):
- Email templates are bilingual
- Users can set their preferred language

## 📧 Email Configuration

### Gmail Setup
1. Enable 2-factor authentication
2. Generate app password
3. Use in `.env`:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 🔒 Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with configurable expiry
- CORS enabled
- Input validation with express-validator
- SQL injection protection via Prisma

## 📄 License

MIT

## 👥 Support

For support, email support@controldecompra.com
