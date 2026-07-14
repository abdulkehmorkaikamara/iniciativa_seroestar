# PostgreSQL Setup & Migration Instructions

This directory contains database configurations and migrations instructions to connect the "Iniciativa SER o ESTAR" backend application to a production PostgreSQL database.

## 1. Database Connection String
To run the python backend correctly, declare the following environment variable in your `.env` configuration file in the root backend directory:

```env
DATABASE_URL=postgresql://<USERNAME>:<PASSWORD>@<HOST>:<PORT>/<DATABASE_NAME>
JWT_SECRET=generate-a-long-random-value
GEMINI_API_KEY=your_gemini_api_key_here
```

Example local developer installation configuration:
```env
DATABASE_URL=postgresql://postgres:replace-me@localhost:5432/ser_ostar_db
```

---

## 2. PostgreSQL Manual Table Creation Script

If you wish to create the database tables manually on your PostgreSQL client (instead of relying on FastAPI’s auto-generate `Base.metadata.create_all(bind=engine)` hook), run the following query block in your pgAdmin or psql shell:

```sql
-- 1. Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Students Profile Table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id_code VARCHAR(50) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    course_level VARCHAR(50) DEFAULT 'A1',
    class_group VARCHAR(50) DEFAULT 'Morning',
    learning_mode VARCHAR(50) DEFAULT 'Online',
    status VARCHAR(50) DEFAULT 'Active',
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Teachers Profile Table
CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id_code VARCHAR(50) UNIQUE NOT NULL,
    assigned_levels VARCHAR(255) DEFAULT 'A1,A2'
);

-- 4. Create Live Class Sessions Table
CREATE TABLE live_class_sessions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    course_level VARCHAR(50) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    date_time VARCHAR(100) NOT NULL,
    meeting_link VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Scheduled'
);

-- 5. Create Attendance Records Table
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_code VARCHAR(50) NOT NULL,
    course_level VARCHAR(50) NOT NULL,
    session_id INTEGER REFERENCES live_class_sessions(id) ON DELETE CASCADE,
    join_time TIMESTAMP WITH TIME ZONE,
    leave_time TIMESTAMP WITH TIME ZONE,
    total_minutes INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Absent'
);

-- 6. Create Chat Messages Table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES live_class_sessions(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    time_sent TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Lesson Notes Table
CREATE TABLE lesson_notes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    course_level VARCHAR(50) NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    shared_with_students BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    file_size VARCHAR(50) DEFAULT '1.2 MB'
);

-- 8. Create Recorded Classes Table
CREATE TABLE recorded_classes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    course_level VARCHAR(50) NOT NULL,
    date_recorded VARCHAR(100) NOT NULL,
    video_url VARCHAR(255) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    description TEXT
);

-- 9. Create Blog Posts Table
CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    excerpt TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    featured_image_url VARCHAR(255),
    published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Create Image Uploads Table
CREATE TABLE image_uploads (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    path VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Create Chatbot FAQs Table
CREATE TABLE chatbot_faqs (
    id SERIAL PRIMARY KEY,
    question VARCHAR(255) NOT NULL,
    answer TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en'
);
```

---

## 3. Seed Default FAQ Data Script
Run the following commands to populate the chatbot suggested FAQs in the database:

```sql
INSERT INTO chatbot_faqs (question, answer, language) VALUES
('How do I register?', 'To register as a student, navigate to the public website, click on REGISTER NOW or BOOK A FREE TRIAL CLASS, fill out your email, full name, phone number, and coarse level preference. Your account will automatically be generated!', 'en'),
('What is the difference between Ser and Estar?', 'SER is taught as the "Why" (permanent identity traits, source origin). ESTAR is taught as the "How" (location coordinates, temporary emotional or physical state). Learn with our custom visual charts!', 'en');
```
