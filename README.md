# LearnifyBackend - Educational Platform Backend API

LearnifyBackend is a comprehensive backend API for an interactive learning platform. The platform provides management of courses, lessons, tests, certificates, and achievements.

## 🚀 Features

- **User Authentication** - JWT-based registration, login, password reset
- **Course Management** - Create and manage courses, modules, and lessons
- **Progress Tracking** - Lesson completion, test submission, progress monitoring
- **Certificates** - Automatic certificate generation upon course completion
- **Achievements System** - Gamification with achievements and badges
- **Admin Panel** - User and content management
- **API Documentation** - Fully documented API with Swagger UI

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## ⚙️ Installation

1. **Clone the repository**:
```bash
git clone https://github.com/muzaffarbekmustafayev/LearnifyBackend.git
cd LearnifyBackend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:
Create a `.env` file:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/learnify
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRE=90d
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
CLIENT_URL=http://localhost:3000
```

4. **Start the server**:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/activate` - Account activation
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Token refresh
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - User profile

### Courses
- `GET,POST /api/courses` - List/create courses
- `GET /api/courses/my-courses` - My enrolled courses
- `GET,PUT,DELETE /api/courses/:id` - Get/update/delete course
- `PATCH /api/courses/:id/publish` - Publish course
- `PATCH /api/courses/:id/complete` - Complete course

### Lessons & Progress
- `POST /api/lessons/:id/complete` - Complete lesson
- `GET,PATCH /api/progress/:courseId` - Get/update progress
- `POST /api/progress/:courseId/complete` - Complete lesson

### Certificates & Achievements
- `POST /api/certificates/:courseId` - Generate certificate
- `GET /api/certificates/my` - My certificates
- `GET /api/achievements/my` - My achievements

### Admin Panel
- `GET,POST /api/users/admin/users` - User management
- `GET,PUT,DELETE /api/users/admin/users/:id` - Manage user

## 🗃️ Database Structure

- **Users** - Users (student, teacher, admin)
- **Courses** - Courses and their modules
- **Lessons** - Lessons and videos
- **Progress** - User progress tracking
- **Certificates** - Certificates
- **Achievements** - Achievements and badges

## 🔒 Security Features

- JWT authentication
- Password hashing (bcrypt)
- XSS and SQL injection protection
- Rate limiting
- CORS configuration
- Helmet security headers

## 📚 API Documentation

After starting the server, access the API documentation at:
[http://localhost:5000/api-docs](http://localhost:5000/api-docs)

## 🛠️ Development

```bash
# Development mode (auto-reload)
npm run dev

# Update Swagger documentation
npm run build-swagger
```

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License. See the `LICENSE` file for details.

## 📞 Contact

If you have questions, encounter issues, or have suggestions, please create an issue in the GitHub issues section.

##  Acknowledgments

Special thanks to the LearnifyBackend team and all contributors who have helped shape this project.

---

**⭐ If you like this project, please give it a star!**

---


*Learnify - Elevating Education to New Heights*
