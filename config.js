// Supabase配置（将配置分离，便于维护）
const SUPABASE_CONFIG = {
    url: 'https://lmuevzsrbmwgmiajbmnl.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtdWV2enNyYm13Z21pYWpibW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTU1NTgsImV4cCI6MjA4NDk5MTU1OH0.z37w3IqppAaNlJ5yHao5M7Lg090rPJ8KoZLsJXcA8zw'
};

// 角色常量
const ROLES = {
    TEACHER: 'teacher',
    PARENT: 'parent',
    STUDENT: 'student'
};

// 页面常量
const PAGES = {
    DASHBOARD: 'dashboard',
    STUDY: 'study',
    VOCABULARY: 'vocabulary',
    ACHIEVEMENTS: 'achievements',
    CLASS: 'class',
    STUDENTS: 'students',
    WORDS: 'words',
    PARENTS: 'parents',
    ANALYTICS: 'analytics',
    CHILDREN: 'children',
    REPORTS: 'reports',
    ENCOURAGE: 'encourage',
    PROGRESS: 'progress',
    SETTINGS: 'settings'
};
