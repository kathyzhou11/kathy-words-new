// common.js - 共享功能

// 导航管理
const Navigation = {
    // 获取当前用户信息
    getCurrentUser() {
        return {
            role: localStorage.getItem('userRole'),
            name: localStorage.getItem('userName'),
            id: localStorage.getItem('userId')
        };
    },
    
    // 检查登录状态
    checkAuth(requiredRole) {
        const user = this.getCurrentUser();
        
        if (!user.role) {
            window.location.href = 'index.html';
            return false;
        }
        
        if (requiredRole && user.role !== requiredRole) {
            // 如果不是对应角色，重定向到对应页面
            switch(user.role) {
                case 'teacher':
                    window.location.href = 'teacher.html';
                    break;
                case 'parent':
                    window.location.href = 'parent.html';
                    break;
                case 'student':
                    window.location.href = 'student.html';
                    break;
            }
            return false;
        }
        
        return true;
    },
    
    // 退出登录
    logout() {
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('currentParent');
        localStorage.removeItem('currentTeacher');
        localStorage.removeItem('currentStudent');
        
        window.location.href = 'index.html';
    },
    
    // 创建顶部导航栏
    createTopNav() {
        const user = this.getCurrentUser();
        
        return `
            <nav class="top-nav">
                <div class="nav-brand">
                    <i class="fas fa-brain"></i>
                    <span>单词大师训练营</span>
                    <small class="role-badge ${user.role}">${this.getRoleName(user.role)}</small>
                </div>
                <div class="nav-user">
                    <div class="user-info">
                        <i class="fas fa-user-circle"></i>
                        <span>${user.name}</span>
                    </div>
                    <button class="btn-logout" onclick="Navigation.logout()">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </nav>
        `;
    },
    
    // 获取角色名称
    getRoleName(role) {
        const roles = {
            'teacher': '教师端',
            'parent': '家长端',
            'student': '学生端'
        };
        return roles[role] || '用户';
    },
    
    // 创建侧边栏菜单
    createSidebarMenu(role) {
        const menus = {
            'teacher': [
                { icon: 'fa-home', text: '首页', page: 'teacher.html' },
                { icon: 'fa-users', text: '学生管理', page: 'teacher.html#students' },
                { icon: 'fa-chart-bar', text: '数据分析', page: 'teacher.html#analytics' },
                { icon: 'fa-book', text: '单词库', page: 'word-analyzer.html' },
                { icon: 'fa-cog', text: '设置', page: 'teacher.html#settings' }
            ],
            'parent': [
                { icon: 'fa-home', text: '首页概览', page: 'parent.html' },
                { icon: 'fa-calendar-alt', text: '学习日历', page: 'parent.html#calendar' },
                { icon: 'fa-chart-line', text: '学习报告', page: 'parent.html#reports' },
                { icon: 'fa-child', text: '孩子管理', page: 'parent.html#children' },
                { icon: 'fa-cog', text: '账户设置', page: 'parent.html#settings' }
            ],
            'student': [
                { icon: 'fa-home', text: '学习中心', page: 'student.html' },
                { icon: 'fa-gamepad', text: '游戏学习', page: 'student.html#games' },
                { icon: 'fa-trophy', text: '成就', page: 'student.html#achievements' },
                { icon: 'fa-chart-line', text: '进度', page: 'student.html#progress' },
                { icon: 'fa-cog', text: '设置', page: 'student.html#settings' }
            ]
        };
        
        let html = '<div class="sidebar-menu">';
        menus[role].forEach(item => {
            const active = window.location.pathname.includes(item.page) ? 'active' : '';
            html += `
                <a class="menu-item ${active}" href="${item.page}">
                    <i class="fas ${item.icon}"></i>
                    <span>${item.text}</span>
                </a>
            `;
        });
        html += '</div>';
        
        return html;
    }
};

// 数据共享管理
const DataManager = {
    // 获取学生学习数据
    async getStudentData(studentId) {
        // 这里可以连接Supabase获取真实数据
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    id: studentId,
                    name: '张三',
                    progress: 75,
                    todayStats: {
                        learned: true,
                        duration: 45,
                        words: 25,
                        score: 88
                    }
                });
            }, 300);
        });
    },
    
    // 更新学习记录
    async updateLearningRecord(record) {
        // 保存到localStorage作为示例
        const records = JSON.parse(localStorage.getItem('learningRecords') || '[]');
        records.push({
            ...record,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('learningRecords', JSON.stringify(records));
        return true;
    }
};

// 加载动画管理
const LoadingManager = {
    show(elementId, message = '加载中...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    },
    
    hide(elementId) {
        const element = document.getElementById(elementId);
        if (element && element.querySelector('.loading-container')) {
            element.innerHTML = '';
        }
    },
    
    showFullscreen() {
        const overlay = document.createElement('div');
        overlay.id = 'fullscreen-loading';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        `;
        
        overlay.innerHTML = `
            <div class="spinner" style="width: 50px; height: 50px;"></div>
            <p style="margin-top: 20px; color: #666;">加载中...</p>
        `;
        
        document.body.appendChild(overlay);
    },
    
    hideFullscreen() {
        const overlay = document.getElementById('fullscreen-loading');
        if (overlay) {
            overlay.remove();
        }
    }
};

// 导出到全局
window.Navigation = Navigation;
window.DataManager = DataManager;
window.LoadingManager = LoadingManager;
