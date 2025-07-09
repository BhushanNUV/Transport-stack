# Authentication System Documentation

## Overview
The Driver Health Dashboard uses a JWT-based authentication system with secure session management.

## Features
- JWT token-based authentication
- Secure password hashing with bcryptjs
- Role-based access control (Admin, Manager, Supervisor)
- Automatic session management with HTTP-only cookies
- Protected routes with middleware
- Clean, professional login UI
- Loading states and error handling

## Default Credentials

### Admin User
- Email: `admin@driverhealthsystem.com`
- Password: `admin123`
- Role: ADMIN

### Manager User
- Email: `manager@driverhealthsystem.com`
- Password: `manager123`
- Role: MANAGER

### Supervisor User
- Email: `supervisor@driverhealthsystem.com`
- Password: `supervisor123`
- Role: SUPERVISOR

## Setup Instructions

1. **Environment Variables**
   Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

2. **Database Setup**
   Run Prisma migrations:
   ```bash
   npm run db:push
   ```

3. **Seed the Database**
   Create default users:
   ```bash
   npm run db:seed
   ```

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/me` - Get current user information

## Components

### AuthContext
- Provides authentication state throughout the app
- Handles login/logout functionality
- Manages user data

### Middleware
- Protects routes that require authentication
- Redirects to login page if not authenticated
- Validates JWT tokens

### Login Page
- Clean, professional UI
- Form validation
- Error handling
- Loading states
- Demo credentials display

## Security Features
- Passwords hashed with bcryptjs (12 rounds)
- JWT tokens with 24-hour expiration
- HTTP-only cookies for token storage
- Secure cookie settings in production
- Protected API routes
- Middleware-based route protection