// ========== 数据库配置（必须放在最前面）==========
const SUPABASE_URL = 'https://lctdyhtydcqhloibogyj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjdGR5aHR5ZGNxaGxvaWJvZ3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTM1NTksImV4cCI6MjA4NDM4OTU1OX0.enKrwAeSpQ1QHIUZbU-2rTdDI-ALLXkq3YCdvvQO3lM';

// 立即检查文件是否加载
console.log('🎯 script.js 开始加载...');

// 检查Supabase是否已加载
if (typeof supabase === 'undefined') {
    console.error('❌ Supabase未加载！请检查index.html中的加载顺序');
}

// 创建Supabase客户端
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== 全局状态 ==========
const appState = {
    currentUser: null,
    isTeacher: false,
    userId: null,
    userWords: [],
    trainingWords: [],
    currentWordIndex: 0,
    isCardFlipped: false,
    teacherId: 'kathy151',
    selectedGroupId: null,
    selectedWords: [],
    dailyTrainingProgress: 0,
    lastTrainingDate: null
};

// ========== 连接状态 ==========
const connectionState = {
    isOnline: navigator.onLine,
    retryCount: 0,
    maxRetries: 3,
    retryDelay: 2000,
    isLoading: false,
    lastError: null,
    isOfflineMode: false
};

// ========== 打卡系统 ==========
const clockInSystem = {
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    todayClockedIn: false,
    selectedTaskMode: 0, // 0=标准模式, 1=复习模式, 2=额外新词模式
    isReviewDay: false,
    dailyTask: null,
    reviewPlans: []
};

// ========== 工具函数 ==========
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

function showLoading(message = '正在加载', details = '') {
    connectionState.isLoading = true;
    const loadingEl = document.getElementById('global-loading');
    if (loadingEl) {
        loadingEl.style.display = 'flex';
        document.getElementById('loading-message').textContent = message;
        document.getElementById('loading-details').textContent = details;
    }
}

function hideLoading() {
    connectionState.isLoading = false;
    const loadingEl = document.getElementById('global-loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

function showMessage(elementId, message, type = 'info', duration = 0) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    el.textContent = message;
    el.className = `message-box message-${type}`;
    el.style.display = 'block';
    
    // 自动隐藏
    if (duration > 0) {
        setTimeout(() => {
            el.style.display = 'none';
        }, duration);
    }
}

function showAlert(message, type = 'info', duration = 3000) {
    try {
        // 创建弹窗元素
        const alertBox = document.createElement('div');
        alertBox.className = `message-box message-${type}`;
        alertBox.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            max-width: 500px;
            animation: slideDown 0.3s ease-out;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        `;
        alertBox.textContent = message;
        
        // 添加关闭按钮
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            right: 10px;
            top: 10px;
            cursor: pointer;
            font-size: 20px;
            color: inherit;
            opacity: 0.7;
        `;
        closeBtn.onclick = () => alertBox.remove();
        
        alertBox.appendChild(closeBtn);
        document.body.appendChild(alertBox);
        
        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                if (alertBox.parentNode) {
                    alertBox.style.opacity = '0';
                    alertBox.style.transition = 'opacity 0.3s';
                    setTimeout(() => {
                        if (alertBox.parentNode) {
                            alertBox.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
        
        return alertBox;
    } catch (error) {
        console.error('显示弹窗错误:', error);
        alert(message); // 降级处理
    }
}

function getFontSizeClass(text) {
    const length = text.length;
    if (length <= 10) return 'font-size-xl';
    if (length <= 15) return 'font-size-lg';
    if (length <= 20) return 'font-size-md';
    if (length <= 25) return 'font-size-sm';
    return 'font-size-xs';
}

// ========== 打卡系统核心函数 ==========
async function loadClockInStatus() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: todayRecord, error } = await dbClient
            .from('clock_in_records')
            .select('*')
            .eq('student_id', appState.currentUser)
            .eq('clock_in_date', today)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('加载打卡状态错误:', error);
            return;
        }
        
        clockInSystem.todayClockedIn = !!todayRecord?.is_clock_in;
        updateClockInUI();
        await loadConsecutiveDays();
    } catch (error) {
        console.error('加载打卡状态错误:', error);
    }
}

function updateClockInUI() {
    const clockInStatus = document.getElementById('clock-in-status');
    if (!clockInStatus) return;
    
    if (clockInSystem.todayClockedIn) {
        clockInStatus.innerHTML = '✅ 今日已打卡';
        clockInStatus.style.background = '#4CAF50';
    } else {
        clockInStatus.innerHTML = '📅 今日未打卡';
        clockInStatus.style.background = '#FF9800';
    }
    
    const consecutiveDaysEl = document.getElementById('consecutive-days');
    if (consecutiveDaysEl) {
        consecutiveDaysEl.textContent = clockInSystem.currentStreak;
    }
}

// ========== 数据库连接测试 ==========
async function testDatabase() {
    showMessage('login-message', '正在测试数据库连接...', 'warning');
    try {
        const { error } = await dbClient
            .from('users')
            .select('*')
            .limit(1);
        
        if (error) {
            throw error;
        }
        
        showMessage('login-message', '✅ 数据库连接成功！', 'success');
        
        setTimeout(() => {
            showMessage('login-message', '请输入用户名开始学习', 'info');
        }, 3000);
        
    } catch (error) {
        showMessage('login-message', `❌ 连接失败：${error.message}`, 'error');
    }
}

// ========== 登录/注册系统 ==========
async function handleLogin() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();
    
    if (!username) {
        showMessage('login-message', '请输入用户名', 'error');
        return;
    }
    
    showMessage('login-message', '正在登录...', 'warning');
    
    try {
        const isTeacher = username.toLowerCase() === 'kathy151';
        
        const { data: existingUser, error: checkError } = await dbClient
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
            showMessage('login-message', `检查用户失败: ${checkError.message}`, 'error');
            return;
        }
        
        if (!existingUser) {
            const { data: newUser, error: insertError } = await dbClient
                .from('users')
                .insert([{
                    username: username,
                    is_teacher: isTeacher,
                    last_login: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (insertError) {
                showMessage('login-message', `注册失败: ${insertError.message}`, 'error');
                return;
            }
            
            showMessage('login-message', `✅ 欢迎新用户 ${username}！`, 'success');
        } else {
            await dbClient
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('username', username);
            
            showMessage('login-message', `✅ 欢迎回来 ${username}！`, 'success');
        }
        
        appState.currentUser = username;
        appState.isTeacher = isTeacher;
        appState.userId = username;
        
        localStorage.setItem('kathy_current_user', username);
        localStorage.setItem('kathy_user_role', isTeacher ? 'teacher' : 'student');
        
        setTimeout(() => {
            showMessage('login-message', '', 'info');
            if (isTeacher) {
                showTeacherDashboard();
            } else {
                showStudentDashboard();
            }
        }, 1000);
        
    } catch (error) {
        console.error('登录错误:', error);
        showMessage('login-message', `登录失败: ${error.message}`, 'error');
    }
}

// ========== 教师功能 ==========
async function showTeacherDashboard() {
    showScreen('teacher-screen');
    await loadTeacherDashboard();
}

async function loadTeacherDashboard() {
    try {
        let wordsCount = 0;
        let studentsCount = 0;
        let masteredCount = 0;
        
        try {
            const { data: wordsData } = await dbClient
                .from('words')
                .select('*')
                .eq('teacher_id', appState.teacherId);
            wordsCount = wordsData?.length || 0;
        } catch (e) {
            console.log('获取单词总数错误:', e);
        }
        
        try {
            const { data: studentsData } = await dbClient
                .from('users')
                .select('*')
                .eq('is_teacher', false);
            studentsCount = studentsData?.length || 0;
        } catch (e) {
            console.log('获取学生总数错误:', e);
        }
        
        try {
            const { data: masteredData } = await dbClient
                .from('study_records')
                .select('*')
                .eq('status', 'mastered');
            masteredCount = masteredData?.length || 0;
        } catch (e) {
            console.log('获取已掌握单词数错误:', e);
        }
        
        let activeStudents = 0;
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { data: activeData } = await dbClient
                .from('study_records')
                .select('student_id')
                .gte('last_reviewed', sevenDaysAgo.toISOString());
            
            if (activeData) {
                const uniqueStudents = new Set(activeData.map(r => r.student_id));
                activeStudents = uniqueStudents.size;
            }
        } catch (e) {
            console.log('获取活跃学生错误:', e);
        }
        
        document.getElementById('total-words').textContent = wordsCount;
        document.getElementById('total-students').textContent = studentsCount;
        document.getElementById('mastered-words').textContent = masteredCount;
        document.getElementById('active-students').textContent = activeStudents;
        
        const content = document.getElementById('teacher-content');
        content.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h3 style="color: #333; margin-bottom: 20px;">✨ 快速操作</h3>
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 20px 0;">
                    <button class="btn" style="padding: 12px 24px;" onclick="showUploadWordsPage()">
                        <span>📤 快速上传</span>
                    </button>
                    <button class="btn btn-blue" style="padding: 12px 24px;" onclick="quickStats()">
                        <span>📈 今日数据</span>
                    </button>
                    <button class="btn" style="padding: 12px 24px;" onclick="showStudentActivity()">
                        <span>👀 学生活跃</span>
                    </button>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-top: 30px;">
                    <h4 style="color: #333; margin-bottom: 15px;">💡 系统提示</h4>
                    <p style="color: #666; margin: 5px 0;">• 已上传 ${wordsCount} 个单词</p>
                    <p style="color: #666; margin: 5px 0;">• 共有 ${studentsCount} 名学生</p>
                    <p style="color: #666; margin: 5px 0;">• 最近7天 ${activeStudents} 名活跃学生</p>
                    <p style="color: #666; margin: 5px 0;">• 学生共掌握 ${masteredCount} 个单词</p>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('加载教师面板错误:', error);
        document.getElementById('teacher-content').innerHTML = 
            '<p style="color: red; text-align: center;">加载失败，请刷新重试</p>';
    }
}

// ========== 教师页面功能 ==========
function showUploadWordsPage() {
    showScreen('teacher-upload-screen');
    loadUploadWordsPage();
}

async function loadUploadWordsPage() {
    const content = document.getElementById('teacher-upload-content');
    content.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <h3 style="color: #333; margin-bottom: 20px; text-align: center;">📝 上传单词</h3>
            
            <div style="background: #E3F2FD; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #1565C0;">
                    📁 选择分组
                </label>
                <div id="group-select-container">
                    <p>正在加载分组...</p>
                </div>
            </div>
            
            <div style="background: #E8F5E9; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
                <h4 style="color: #2E7D32; margin-bottom: 15px;">📋 上传说明</h4>
                <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 8px 0; color: #666;">• 每行一个单词，格式：<strong>英文 中文</strong></p>
                    <p style="margin: 8px 0; color: #666;">• 示例：<code>hello 你好</code></p>
                    <p style="margin: 8px 0; color: #666;">• 支持短语：<code>"good morning" 早上好</code></p>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <textarea id="words-input" 
                          style="width: 100%; height: 300px; font-family: monospace; font-size: 16px; padding: 15px; border: 2px solid #ddd; border-radius: 10px;"
                          placeholder="输入单词列表，每行一个：&#10;apple 苹果&#10;banana 香蕉&#10;&quot;good morning&quot; 早上好&#10;computer 电脑"></textarea>
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
                <button class="btn btn-blue" onclick="previewUploadWordsStable()" style="margin: 5px;">
                    👁️ 预览
                </button>
                <button class="btn" onclick="submitUploadWordsStable()" style="margin: 5px;">
                    📤 上传
                </button>
                <button class="btn" onclick="loadExampleWordsStable()" style="margin: 5px;">
                    📚 示例
                </button>
                <button class="btn btn-red" onclick="clearUploadForm()" style="margin: 5px;">
                    🗑️ 清空
                </button>
            </div>
            
            <div id="upload-preview-stable" style="display: none;"></div>
            <div id="upload-result-stable"></div>
        </div>
    `;
    
    setTimeout(loadGroupSelectorStable, 100);
}

// ========== 学生功能 ==========
async function showStudentDashboard() {
    showScreen('student-screen');
    await loadStudentDashboardSimple();
}

async function loadStudentDashboardSimple() {
    try {
        document.getElementById('student-name').textContent = appState.currentUser;
        await loadClockInStatus();
        
        // 同步单词
        await syncGroupWordsToStudent(appState.currentUser);
        
        const { data: records, error } = await dbClient
            .from('study_records')
            .select('*')
            .eq('student_id', appState.currentUser);
        
        if (error) {
            console.error('获取学习记录错误:', error);
            appState.userWords = [];
        } else {
            appState.userWords = records || [];
        }
        
        const total = appState.userWords.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayRecords = records?.filter(r => 
            r.last_reviewed && new Date(r.last_reviewed) >= today
        ) || [];
        
        const target = 10;
        const todayProgress = Math.min(todayRecords.length, target);
        const progressPercent = (todayProgress / target) * 100;
        
        const todayStatus = document.getElementById('today-status');
        todayStatus.innerHTML = `
            <div class="stats-card">
                <h3 style="color: #333; margin-bottom: 15px;">📅 今日学习情况</h3>
                <div class="card-grid">
                    <div class="stat-card" onclick="showTodayWords()" style="cursor: pointer;">
                        <div class="number" style="color: #2196F3; text-decoration: underline;">${todayRecords.length}</div>
                        <div class="label">今日已学</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="number">${Math.max(0, target - todayRecords.length)}</div>
                        <div class="label">建议学习</div>
                    </div>
                    
                    <div class="stat-card" onclick="showTodayMasteredWords()" style="cursor: pointer;">
                        <div class="number" style="color: #4CAF50; text-decoration: underline;">${todayRecords.filter(r => r.status === 'mastered').length}</div>
                        <div class="label">今日掌握</div>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #666;">今日进度</span>
                        <span style="color: #4CAF50; font-weight: bold;">${todayProgress}/${target}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('加载学生面板错误:', error);
        showAlert('加载失败，请重试', 'error');
    }
}

async function manualSyncWords() {
    try {
        showAlert('正在同步单词...', 'info');
        const syncedCount = await syncGroupWordsToStudent(appState.currentUser);
        
        if (syncedCount > 0) {
            showAlert(`同步完成！成功同步 ${syncedCount} 个新单词`, 'success');
        } else {
            showAlert('您已经同步了所有分组单词', 'info');
        }
        
        await loadStudentDashboardSimple();
    } catch (error) {
        console.error('手动同步错误:', error);
        showAlert('同步失败: ' + error.message, 'error');
    }
}

async function syncGroupWordsToStudent(studentId) {
    try {
        console.log(`开始为 ${studentId} 同步分组单词...`);
        
        const { data: studentGroups, error: groupsError } = await dbClient
            .from('group_students')
            .select('group_id')
            .eq('student_id', studentId);
        
        if (groupsError) {
            console.error('获取学生分组错误:', groupsError);
            return 0;
        }
        
        if (!studentGroups || studentGroups.length === 0) {
            console.log(`学生 ${studentId} 没有加入任何分组`);
            showAlert('您还没有被分配到任何分组，请联系老师', 'warning');
            return 0;
        }
        
        const groupIds = studentGroups.map(g => g.group_id);
        
        const { data: groupWords, error: wordsError } = await dbClient
            .from('words')
            .select('*')
            .in('group_id', groupIds)
            .eq('teacher_id', appState.teacherId);
        
        if (wordsError) {
            console.error('获取分组单词错误:', wordsError);
            return 0;
        }
        
        if (!groupWords || groupWords.length === 0) {
            console.log(`学生 ${studentId} 的分组中没有单词`);
            showAlert('您所在的分组中还没有单词，请联系老师上传单词', 'info');
            return 0;
        }
        
        const { data: existingRecords } = await dbClient
            .from('study_records')
            .select('word_id')
            .eq('student_id', studentId);
        
        const existingWordIds = new Set(existingRecords?.map(r => r.word_id) || []);
        
        const newRecords = groupWords
            .filter(word => !existingWordIds.has(word.id))
            .map(word => ({
                student_id: studentId,
                word_id: word.id,
                english: word.english,
                chinese: word.chinese,
                status: 'new',
                review_count: 0,
                group_id: word.group_id,
                added_date: new Date().toISOString()
            }));
        
        console.log(`需要同步 ${newRecords.length} 个新单词`);
        
        if (newRecords.length > 0) {
            const batchSize = 50;
            for (let i = 0; i < newRecords.length; i += batchSize) {
                const batch = newRecords.slice(i, i + batchSize);
                await dbClient
                    .from('study_records')
                    .insert(batch);
            }
            
            showAlert(`✅ 已为您同步 ${newRecords.length} 个新单词`, 'success');
            return newRecords.length;
        } else {
            showAlert('📚 您已同步所有分组单词', 'info');
            return 0;
        }
        
    } catch (error) {
        console.error('同步分组单词错误:', error);
        showAlert(`同步失败：${error.message}`, 'error');
        return 0;
    }
}

function dailyClockIn() {
    if (clockInSystem.todayClockedIn) {
        showAlert('今天已经打过卡了！', 'info');
        return;
    }
    
    showAlert('正在生成今日任务...', 'info');
    showDailyTaskPage();
}

function showDailyTaskPage() {
    showScreen('daily-task-screen');
    loadDailyTaskPage();
}

function loadDailyTaskPage() {
    const consecutiveTaskDaysEl = document.getElementById('consecutive-task-days');
    if (consecutiveTaskDaysEl) {
        consecutiveTaskDaysEl.textContent = clockInSystem.currentStreak;
    }
    
    const reviewDayNotice = document.getElementById('review-day-notice');
    if (reviewDayNotice) {
        reviewDayNotice.style.display = clockInSystem.isReviewDay ? 'block' : 'none';
    }
    
    clockInSystem.selectedTaskMode = 0;
    selectTaskMode(0);
    generateTaskPreview();
}

function selectTaskMode(mode) {
    clockInSystem.selectedTaskMode = mode;
    
    ['mode-standard', 'mode-review', 'mode-extra'].forEach((id, index) => {
        const btn = document.getElementById(id);
        if (btn) {
            if (index === mode) {
                btn.style.border = '3px solid #4CAF50';
                btn.style.background = '#E8F5E9';
            } else {
                btn.style.border = '2px solid #ddd';
                btn.style.background = '';
            }
        }
    });
    
    generateTaskPreview();
}

// ========== 训练功能 ==========
function startTrainingSession() {
    showScreen('training-screen');
    showTrainingScreenSimple();
}

function showTrainingScreenSimple() {
    if (appState.currentWordIndex >= appState.trainingWords.length) {
        finishTraining();
        return;
    }
    
    const word = appState.trainingWords[appState.currentWordIndex];
    const total = appState.trainingWords.length;
    const current = appState.currentWordIndex + 1;
    
    document.getElementById('training-progress').textContent = `${current}/${total}`;
    
    const englishFontSize = getFontSizeClass(word.english);
    const chineseFontSize = getFontSizeClass(word.chinese);
    
    const content = document.getElementById('training-content');
    content.innerHTML = `
        <div style="text-align: center;">
            <div class="word-card ${appState.isCardFlipped ? 'flipped' : ''}" onclick="flipTrainingCard()">
                <div class="word-card-content ${appState.isCardFlipped ? chineseFontSize : englishFontSize}">
                    ${appState.isCardFlipped ? `
                        <div style="color: #2E7D32; word-break: break-word;">
                            ${word.chinese}
                        </div>
                    ` : `
                        <div style="color: #333; word-break: break-word;">
                            ${word.english}
                        </div>
                    `}
                </div>
            </div>
            
            <div style="margin-top: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                <button class="btn" onclick="markTrainingWord('mastered')" 
                        style="padding: 15px; background: #4CAF50;">
                    <div style="font-size: 20px; margin-bottom: 5px;">✅</div>
                    <div>已掌握</div>
                </button>
                
                <button class="btn btn-blue" onclick="markTrainingWord('learning')" 
                        style="padding: 15px; background: #2196F3;">
                    <div style="font-size: 20px; margin-bottom: 5px;">🔄</div>
                    <div>熟悉</div>
                </button>
                
                <button class="btn" onclick="markTrainingWord('new')" 
                        style="padding: 15px; background: #FF9800;">
                    <div style="font-size: 20px; margin-bottom: 5px;">📝</div>
                    <div>没印象</div>
                </button>
            </div>
        </div>
    `;
}

function flipTrainingCard() {
    const word = appState.trainingWords[appState.currentWordIndex];
    const card = document.querySelector('.word-card');
    const content = card.querySelector('.word-card-content');
    
    if (appState.isCardFlipped) {
        card.classList.remove('flipped');
        content.className = 'word-card-content ' + getFontSizeClass(word.english);
        content.innerHTML = `
            <div style="color: #333; word-break: break-word;">
                ${word.english}
            </div>
        `;
    } else {
        card.classList.add('flipped');
        content.className = 'word-card-content ' + getFontSizeClass(word.chinese);
        content.innerHTML = `
            <div style="color: #2E7D32; word-break: break-word;">
                ${word.chinese}
            </div>
        `;
    }
    
    appState.isCardFlipped = !appState.isCardFlipped;
}

async function markTrainingWord(status) {
    const word = appState.trainingWords[appState.currentWordIndex];
    
    try {
        await dbClient
            .from('study_records')
            .update({
                status: status,
                review_count: (word.review_count || 0) + 1,
                last_reviewed: new Date().toISOString()
            })
            .eq('student_id', appState.currentUser)
            .eq('word_id', word.word_id || word.id);
        
        word.status = status;
        word.review_count = (word.review_count || 0) + 1;
        word.last_reviewed = new Date().toISOString();
        
        const statusText = {
            'mastered': '✅ 已掌握',
            'learning': '🔄 熟悉',
            'new': '📝 没印象'
        }[status];
        
        showAlert(`${statusText}: ${word.english}`, 'success');
        
        setTimeout(() => {
            appState.currentWordIndex++;
            appState.isCardFlipped = false;
            
            if (appState.currentWordIndex < appState.trainingWords.length) {
                showTrainingScreenSimple();
            } else {
                finishTraining();
            }
        }, 800);
        
    } catch (error) {
        console.error('更新单词状态错误:', error);
        showAlert('保存失败，请检查网络', 'error');
    }
}

function finishTraining() {
    const total = appState.trainingWords.length;
    const mastered = appState.trainingWords.filter(w => w.status === 'mastered').length;
    const learning = appState.trainingWords.filter(w => w.status === 'learning').length;
    const progress = total > 0 ? Math.round((mastered / total) * 100) : 0;
    
    const content = document.getElementById('training-content');
    content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 3em; margin-bottom: 20px;">🎉</div>
            <h3 style="color: #333; margin-bottom: 15px;">训练完成！</h3>
            <div class="stats-card" style="max-width: 400px; margin: 0 auto;">
                <div class="card-grid">
                    <div class="stat-card">
                        <div class="number">${total}</div>
                        <div class="label">训练单词</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${mastered}</div>
                        <div class="label">已掌握</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${learning}</div>
                        <div class="label">熟悉</div>
                    </div>
                </div>
            </div>
            <div style="margin-top: 30px;">
                <button class="btn" onclick="showStudentDashboard()" style="margin: 10px;">
                    返回主页
                </button>
            </div>
        </div>
    `;
}

function cancelTraining() {
    if (confirm('确定要结束训练吗？')) {
        showStudentDashboard();
    }
}

// ========== 其他基础函数 ==========
function showClockInStats() {
    showScreen('clockin-stats-screen');
}

function showReviewPlan() {
    showScreen('review-plan-screen');
}

function showMyWordListPage() {
    showScreen('student-wordlist-screen');
}

function showTrainingOptions() {
    showScreen('training-options-screen');
}

function startReviewTraining() {
    if (appState.userWords.length === 0) {
        showAlert('还没有单词可以学习', 'error');
        return;
    }
    
    const weakWords = appState.userWords.filter(w => w.status === 'new' || w.status === 'learning');
    
    if (weakWords.length === 0) {
        showAlert('🎉 太棒了！没有需要复习的弱项单词！', 'success');
        return;
    }
    
    weakWords.sort(() => Math.random() - 0.5);
    appState.trainingWords = weakWords.slice(0, 10);
    appState.currentWordIndex = 0;
    appState.isCardFlipped = false;
    
    startTrainingSession();
}

function showAllStudentsPage() {
    showScreen('teacher-students-screen');
}

function showGroupManagementPage() {
    showScreen('teacher-groups-screen');
}

function showLearningProgressPage() {
    showScreen('teacher-progress-screen');
}

function showWordManagementPage() {
    showScreen('teacher-words-screen');
}

function showShareSystemPage() {
    showScreen('teacher-share-screen');
}

// ========== 退出登录 ==========
function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        appState.currentUser = null;
        appState.isTeacher = false;
        appState.userId = null;
        appState.userWords = [];
        appState.trainingWords = [];
        
        localStorage.removeItem('kathy_current_user');
        localStorage.removeItem('kathy_user_role');
        
        showScreen('login-screen');
        document.getElementById('username').value = '';
        showMessage('login-message', '已退出登录', 'info');
    }
}

// ========== 页面初始化 ==========
window.onload = function() {
    console.log('🚀 Kathy单词训练系统启动');
    
    // 显示连接状态
    showMessage('login-message', '正在连接系统...', 'info');
    
    // 检查是否有已登录用户
    const savedUser = localStorage.getItem('kathy_current_user');
    if (savedUser) {
        document.getElementById('username').value = savedUser;
        const userRole = localStorage.getItem('kathy_user_role');
        appState.currentUser = savedUser;
        appState.isTeacher = (userRole === 'teacher');
        
        showMessage('login-message', `发现已登录用户: ${savedUser}`, 'info');
    }
    
    // 测试数据库连接
    setTimeout(() => {
        testDatabase();
    }, 1000);
};