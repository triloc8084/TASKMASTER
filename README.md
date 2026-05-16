# TaskMaster - To-Do List Application

A modern to-do list application with task prioritization and deadline management features.

## Features

- Add, edit, and delete tasks
- Set task priorities (low, medium, high)
- Set task deadlines
- Filter tasks by priority
- Mark tasks as complete
- Responsive design
- Local storage support
- RESTful API backend

## Technologies Used

- Frontend: HTML5, CSS3, JavaScript
- Backend: PHP
- Database: MySQL
- Icons: Font Awesome

## Setup Instructions

1. **Database Setup**
   - Create a MySQL database
   - Import the `database.sql` file
   - Update database credentials in `api/config.php`

2. **Web Server Setup**
   - Place all files in your web server directory
   - Ensure PHP and MySQL are installed and running
   - Make sure the web server has write permissions for the database

3. **Configuration**
   - Update the database connection details in `api/config.php`:
     ```php
     define('DB_SERVER', 'localhost');
     define('DB_USERNAME', 'your_username');
     define('DB_PASSWORD', 'your_password');
     define('DB_NAME', 'todo_app');
     ```

4. **Access the Application**
   - Open `index.html` in your web browser
   - The application should be ready to use

## API Endpoints

- `GET /api/tasks.php` - Get all tasks
- `POST /api/tasks.php` - Create a new task
- `PUT /api/tasks.php` - Update a task
- `DELETE /api/tasks.php?id={id}` - Delete a task

## Project Structure

```
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── api/
│   ├── config.php
│   └── tasks.php
└── database.sql
```

## Contributing

Feel free to submit issues and enhancement requests.

## License

This project is licensed under the MIT License. 