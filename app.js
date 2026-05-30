// ═══════════════════════════════════════════
//  UNIVEN LINK — Complete Working App
//  Firebase: Auth + Realtime Database
// ═══════════════════════════════════════════

// ── FIREBASE CONFIG ──────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyBSMvHpZ0_VkqWjJ94UMa6vqEhFiqrsIWM",
    authDomain: "rare-5f47e.firebaseapp.com",
    databaseURL: "https://rare-5f47e-default-rtdb.firebaseio.com",
    projectId: "rare-5f47e",
    storageBucket: "rare-5f47e.appspot.com",
    messagingSenderId: "811727087812",
    appId: "1:811727087812:web:d362e68abf6c26acf24191"
};

// ── GLOBAL VARIABLES ──────────────────────────
let app, auth, database;
let currentUser = null;
let currentUserData = null;
let currentPage = 'home';
let currentFilter = 'latest';
let postIdentity = 'real';
let currentPostId = null;
let allPosts = [];
let feedListener = null;
let qaListener = null;
let newsListener = null;

// ── INITIALIZE FIREBASE ───────────────────────
function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded');
            return false;
        }
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        database = firebase.database();
        console.log('✅ Firebase initialized');
        return true;
    } catch(e) {
        console.error('❌ Firebase init failed:', e);
        return false;
    }
}

const firebaseReady = initFirebase();

// ──────────────────────────────────────────────
//  AUTHENTICATION FUNCTIONS
// ──────────────────────────────────────────────

function switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.add('hidden'));
    if (event && event.target) event.target.classList.add('active');
    const targetForm = document.getElementById(tab + '-form');
    if (targetForm) targetForm.classList.remove('hidden');
    hideAuthError();
}

async function loginUser() {
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
        showAuthError('Please enter email and password.');
        return;
    }
    if (!auth) {
        showAuthError('Firebase not ready. Please refresh.');
        return;
    }
    
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        await loadUserData(cred.user);
        enterApp(cred.user);
    } catch(e) {
        showAuthError(getAuthError(e.code));
    }
}

async function registerUser() {
    const name = document.getElementById('reg-name')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const role = document.getElementById('reg-role')?.value;
    const password = document.getElementById('reg-password')?.value;

    if (!name || !email || !password) {
        showAuthError('Please fill all fields.');
        return;
    }
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters.');
        return;
    }
    if (!auth || !database) {
        showAuthError('Firebase not ready. Please refresh.');
        return;
    }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const userData = {
            displayName: name,
            email: email,
            role: role,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        await database.ref('users/' + cred.user.uid).set(userData);
        currentUserData = userData;
        enterApp(cred.user);
    } catch(e) {
        showAuthError(getAuthError(e.code));
    }
}

function loginGuest() {
    currentUser = {
        uid: 'guest_' + Math.random().toString(36).substr(2, 8),
        displayName: 'Guest User',
        email: 'guest@univen.ac.za'
    };
    currentUserData = {
        displayName: 'Guest User',
        role: 'student',
        email: 'guest@univen.ac.za'
    };
    enterApp(currentUser);
}

function getAuthError(code) {
    const errors = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/network-request-failed': 'Network error. Check your connection.'
    };
    return errors[code] || 'Sign in failed. Please try again.';
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 3000);
    }
}

function hideAuthError() {
    const el = document.getElementById('auth-error');
    if (el) el.classList.add('hidden');
}

async function loadUserData(user) {
    if (!database || !user) return;
    try {
        const snapshot = await database.ref('users/' + user.uid).once('value');
        if (snapshot.exists()) {
            currentUserData = snapshot.val();
        }
    } catch(e) {
        console.warn('Could not load user data', e);
    }
}

async function signOutUser() {
    if (auth) await auth.signOut();
    if (feedListener) database?.ref('posts').off('value', feedListener);
    if (qaListener) database?.ref('posts').off('value', qaListener);
    if (newsListener) database?.ref('posts').off('value', newsListener);
    currentUser = null;
    currentUserData = null;
    allPosts = [];
    const appScreen = document.getElementById('app-screen');
    const authScreen = document.getElementById('auth-screen');
    if (appScreen) appScreen.classList.remove('active');
    if (authScreen) authScreen.classList.add('active');
}

// ──────────────────────────────────────────────
//  APP ENTRY & NAVIGATION
// ──────────────────────────────────────────────

function enterApp(user) {
    currentUser = user;
    const appScreen = document.getElementById('app-screen');
    const authScreen = document.getElementById('auth-screen');
    if (appScreen) appScreen.classList.add('active');
    if (authScreen) authScreen.classList.remove('active');
    
    updateHeaderAvatar();
    updateProfilePage();
    loadAllFeed();
    loadQAFeed();
    loadNewsFeed();

    if (auth) {
        auth.onAuthStateChanged(u => {
            if (!u && currentUser) signOutUser();
        });
    }
}

function updateHeaderAvatar() {
    const name = currentUserData?.displayName || currentUser?.displayName || 'U';
    const initials = getInitials(name);
    const headerInitials = document.getElementById('header-avatar-initials');
    const composerName = document.getElementById('composer-name-preview');
    const composerAvatar = document.getElementById('composer-avatar-preview');
    
    if (headerInitials) headerInitials.textContent = initials;
    if (composerName) composerName.textContent = name;
    if (composerAvatar) composerAvatar.textContent = initials;
}

function updateProfilePage() {
    const name = currentUserData?.displayName || currentUser?.displayName || 'Unknown';
    const role = currentUserData?.role || 'student';
    const email = currentUserData?.email || currentUser?.email || '';
    
    const profileName = document.getElementById('profile-name');
    const profileRole = document.getElementById('profile-role');
    const profileEmail = document.getElementById('profile-email');
    const profileInitials = document.getElementById('profile-avatar-initials');
    
    if (profileName) profileName.textContent = name;
    if (profileRole) profileRole.textContent = role;
    if (profileEmail) profileEmail.textContent = email;
    if (profileInitials) profileInitials.textContent = getInitials(name);
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function goToPage(page, btn) {
    const pages = document.querySelectorAll('.page');
    const navItems = document.querySelectorAll('.nav-item');
    
    pages.forEach(p => p.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    
    const targetPage = document.getElementById('page-' + page);
    if (targetPage) targetPage.classList.add('active');
    if (btn) btn.classList.add('active');
    
    currentPage = page;
    
    const feedFilters = document.getElementById('feed-filters');
    const fab = document.getElementById('fab');
    
    if (feedFilters) feedFilters.style.display = (page === 'home') ? 'flex' : 'none';
    if (fab) fab.style.display = (page === 'profile') ? 'none' : 'flex';
    
    if (page === 'profile') loadProfilePosts();
    if (page === 'qa') loadQAFeed();
    if (page === 'news') loadNewsFeed();
}

function goToProfile() {
    const pages = document.querySelectorAll('.page');
    const navItems = document.querySelectorAll('.nav-item');
    
    pages.forEach(p => p.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    
    const profilePage = document.getElementById('page-profile');
    if (profilePage) profilePage.classList.add('active');
    
    currentPage = 'profile';
    const fab = document.getElementById('fab');
    if (fab) fab.style.display = 'none';
    loadProfilePosts();
}

// ──────────────────────────────────────────────
//  FEED LOADING FUNCTIONS
// ──────────────────────────────────────────────

function loadAllFeed() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-posts"><div class="spinner"></div><p>Loading feed...</p></div>';
    
    if (!database) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Database not connected</h3><p>Please refresh the page.</p></div>';
        return;
    }
    
    const postsRef = database.ref('posts');
    if (feedListener) postsRef.off('value', feedListener);
    
    feedListener = postsRef.on('value', (snapshot) => {
        const postsData = snapshot.val();
        allPosts = [];
        
        if (postsData) {
            Object.keys(postsData).forEach(key => {
                const post = postsData[key];
                post.id = key;
                // Ensure poll data structure is valid
                if (post.poll) {
                    if (!post.poll.options) post.poll.options = [];
                    if (!post.poll.votedBy) post.poll.votedBy = {};
                }
                allPosts.push(post);
            });
        }
        
        applyFilterAndRender();
        updateStatPost();
    }, (error) => {
        console.error('Error loading posts:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error loading posts</h3><p>Please refresh.</p></div>';
    });
}

function applyFilterAndRender() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    
    let displayPosts = [...allPosts];
    
    if (currentFilter === 'latest') {
        displayPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (currentFilter === 'smart') {
        displayPosts.sort((a, b) => {
            const engagementA = (a.likesCount || 0) + (a.commentsCount || 0);
            const engagementB = (b.likesCount || 0) + (b.commentsCount || 0);
            return engagementB - engagementA;
        });
    } else if (currentFilter === 'following') {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><h3>Following Feed</h3><p>Follow users to see their posts here.</p></div>`;
        return;
    }
    
    if (displayPosts.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>No posts yet</h3><button onclick="openComposer()" style="margin-top:15px;padding:10px 20px;background:#0B1F3A;color:white;border:none;border-radius:8px;cursor:pointer;">Create Post</button></div>`;
    } else {
        renderPosts(displayPosts, container);
    }
}

function loadQAFeed() {
    const container = document.getElementById('qa-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-posts"><div class="spinner"></div><p>Loading Q&A...</p></div>';
    
    if (!database) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Database not connected</h3></div>';
        return;
    }
    
    const postsRef = database.ref('posts');
    if (qaListener) postsRef.off('value', qaListener);
    
    qaListener = postsRef.on('value', (snapshot) => {
        const postsData = snapshot.val();
        const qaPosts = [];
        
        if (postsData) {
            Object.keys(postsData).forEach(key => {
                const post = postsData[key];
                if (post.category === 'question') {
                    post.id = key;
                    qaPosts.push(post);
                }
            });
        }
        
        qaPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        if (qaPosts.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">❓</div><h3>No questions yet</h3><button onclick="openComposerAndSetQuestion()" style="margin-top:15px;padding:10px 20px;background:#0B1F3A;color:white;border:none;border-radius:8px;cursor:pointer;">Ask a Question</button></div>`;
        } else {
            renderPosts(qaPosts, container, false);
        }
    });
}

function loadNewsFeed() {
    const container = document.getElementById('news-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-posts"><div class="spinner"></div><p>Loading news...</p></div>';
    
    if (!database) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Database not connected</h3></div>';
        return;
    }
    
    const postsRef = database.ref('posts');
    if (newsListener) postsRef.off('value', newsListener);
    
    newsListener = postsRef.on('value', (snapshot) => {
        const postsData = snapshot.val();
        const newsPosts = [];
        
        if (postsData) {
            Object.keys(postsData).forEach(key => {
                const post = postsData[key];
                if (post.category === 'announcement' || post.category === 'event') {
                    post.id = key;
                    newsPosts.push(post);
                }
            });
        }
        
        newsPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        if (newsPosts.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">📰</div><h3>No announcements yet</h3></div>`;
        } else {
            renderPosts(newsPosts, container, false);
        }
    });
}

function loadProfilePosts() {
    const container = document.getElementById('profile-posts');
    if (!container) return;
    
    const myPosts = allPosts.filter(p => p.uid === currentUser?.uid);
    
    if (myPosts.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">✏️</div><h3>No posts yet</h3></div>`;
    } else {
        renderPosts(myPosts, container, false);
    }
    
    const statPosts = document.getElementById('stat-posts');
    if (statPosts) statPosts.textContent = myPosts.length;
}

function setFilter(filter, btn) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    currentFilter = filter;
    applyFilterAndRender();
    
    const messages = { latest: 'Showing latest posts', smart: 'Showing top posts', following: 'Following feed' };
    showToast(messages[filter] || filter);
}

// ──────────────────────────────────────────────
//  POST RENDERING
// ──────────────────────────────────────────────

function renderPosts(posts, container, animate = true) {
    if (!container) return;
    container.innerHTML = '';
    
    posts.forEach((post, i) => {
        const card = createPostCard(post, animate ? i : 0);
        container.appendChild(card);
    });
}

function createPostCard(post, index = 0) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.style.animationDelay = `${index * 40}ms`;

    const likeCount = post.likesCount || 0;
    const commentCount = post.commentsCount || 0;
    const isOfficial = post.role === 'faculty' || post.role === 'staff';
    const time = formatTime(post.createdAt);
    const isLiked = currentUser && post.likes && post.likes[currentUser.uid];
    const isSaved = currentUser && post.saves && post.saves[currentUser.uid];

    // Avatar
    let avatarContent = '';
    let avatarClass = 'post-avatar';
    if (post.anonymous) {
        avatarContent = '👤';
        avatarClass += ' anon';
    } else {
        avatarContent = getInitials(post.displayName || 'U');
        if (isOfficial) avatarClass += ' official';
    }

    // Category badge
    const catLabels = { general: '💬', question: '❓', announcement: '📢', event: '📅', resource: '📚' };
    const catLabel = catLabels[post.category] || '💬';
    const catBadge = `<span class="post-category-badge cat-${post.category || 'general'}">${catLabel}</span>`;

    // Hashtags
    const hashtagsHtml = (post.hashtags || []).map(h => `<span class="hashtag">${escapeHtml(h)}</span>`).join('');

    // Poll HTML - Fixed version with better error handling
    let pollHtml = '';
    if (post.poll && post.poll.options && Array.isArray(post.poll.options) && post.poll.options.length > 0) {
        try {
            const total = post.poll.options.reduce((sum, o) => sum + (o.votes || 0), 0) || 1;
            const hasVoted = currentUser && post.poll.votedBy && post.poll.votedBy[currentUser.uid] !== undefined;
            
            pollHtml = `<div class="poll-container" data-post-id="${post.id}">`;
            post.poll.options.forEach((opt, idx) => {
                const voteCount = opt.votes || 0;
                const pct = Math.round((voteCount / total) * 100);
                const isSelected = hasVoted && post.poll.votedBy[currentUser.uid] === idx;
                
                pollHtml += `
                    <div class="poll-option ${isSelected ? 'selected' : ''}" data-option-index="${idx}" onclick="event.stopPropagation();votePoll('${post.id}', ${idx})">
                        <div class="poll-bar" style="width: ${pct}%"></div>
                        <span class="poll-label">${escapeHtml(opt.label)}</span>
                        <span class="poll-pct">${pct}% (${voteCount})</span>
                    </div>
                `;
            });
            pollHtml += `<p class="poll-footer">${hasVoted ? '✓ You voted' : 'Tap to vote'} · ${total} total vote${total !== 1 ? 's' : ''}</p></div>`;
        } catch(e) {
            console.error('Poll render error:', e);
            pollHtml = '<div class="poll-container"><p style="color:red;font-size:12px">⚠️ Poll error</p></div>';
        }
    }

    // Answer button for questions
    const answerButton = (post.category === 'question') ? 
        `<button class="action-btn" onclick="event.stopPropagation();openAnswerModal('${post.id}')" style="color:var(--green)">📝 Answer</button>` : '';

    card.innerHTML = `
        <div class="post-header">
            <div class="${avatarClass}">${avatarContent}</div>
            <div class="post-meta">
                <div class="post-name">
                    ${post.anonymous ? (post.handle || '@anonymous') : escapeHtml(post.displayName || 'Unknown')}
                    ${isOfficial && !post.anonymous ? '<span class="verified-badge">✓</span>' : ''}
                </div>
                <div class="post-time">${time}</div>
            </div>
            ${catBadge}
        </div>
        <div class="post-text">${escapeHtml(post.text || '')}</div>
        ${pollHtml}
        ${hashtagsHtml ? `<div class="post-hashtags">${hashtagsHtml}</div>` : ''}
        <div class="post-actions">
            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation();toggleLike('${post.id}',this)">
                ${isLiked ? '️' : '<i class="fa-solid fa-thumbs-up"></i>'} ${likeCount || ''}
            </button>
            <button class="action-btn" onclick="event.stopPropagation();openPostModal('${post.id}')">
                <i class="far fa-comment" aria-hidden="true"></i> ${commentCount || ''}
            </button>
            ${answerButton}
            <button class="action-btn ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation();toggleSave('${post.id}',this)">
                🔖
            </button>
        </div>
    `;

    card.addEventListener('click', () => openPostModal(post.id));
    return card;
}

// ──────────────────────────────────────────────
//  POST INTERACTIONS
// ──────────────────────────────────────────────

async function toggleLike(postId, btn) {
    if (!currentUser) { showToast('Sign in to like'); return; }
    if (!database) { showToast('Database error'); return; }
    
    const postRef = database.ref('posts/' + postId);
    try {
        const snapshot = await postRef.once('value');
        const post = snapshot.val();
        if (!post) return;
        
        const likes = post.likes || {};
        const isLiked = likes[currentUser.uid];
        
        if (isLiked) {
            delete likes[currentUser.uid];
        } else {
            likes[currentUser.uid] = true;
        }
        
        const newCount = Object.keys(likes).length;
        await postRef.update({ likes: likes, likesCount: newCount });
        
        btn.innerHTML = `${!isLiked ? '❤️' : '🤍'} ${newCount || ''}`;
        btn.classList.toggle('liked', !isLiked);
    } catch(e) {
        console.error('Like error:', e);
        showToast('Error liking post');
    }
}

async function toggleSave(postId, btn) {
    if (!currentUser) { showToast('Sign in to save'); return; }
    if (!database) return;
    
    const postRef = database.ref('posts/' + postId);
    try {
        const snapshot = await postRef.once('value');
        const post = snapshot.val();
        if (!post) return;
        
        const saves = post.saves || {};
        const isSaved = saves[currentUser.uid];
        
        if (isSaved) {
            delete saves[currentUser.uid];
        } else {
            saves[currentUser.uid] = true;
        }
        
        await postRef.update({ saves: saves });
        btn.classList.toggle('saved', !isSaved);
        showToast(isSaved ? 'Unsaved' : 'Saved!');
    } catch(e) {
        console.error('Save error:', e);
    }
}

// FIXED VOTE FUNCTION - Complete rewrite with better debugging
// FIXED VOTE FUNCTION - No dot notation issues
async function votePoll(postId, optionIndex) {
    console.log('Vote function called for post:', postId, 'option:', optionIndex);
    
    if (!currentUser) {
        showToast('Please sign in to vote');
        return;
    }
    
    if (!database) {
        showToast('Database not connected');
        return;
    }
    
    showToast('Voting...');
    
    const postRef = database.ref('posts/' + postId);
    
    try {
        // Get the current post data
        const snapshot = await postRef.once('value');
        const post = snapshot.val();
        
        if (!post) {
            showToast('Post not found');
            return;
        }
        
        // Check if post has a poll
        if (!post.poll) {
            showToast('This post has no poll');
            return;
        }
        
        // Check if poll has options
        if (!post.poll.options || !Array.isArray(post.poll.options) || post.poll.options.length === 0) {
            showToast('Poll has no options');
            return;
        }
        
        // Check if option exists
        if (!post.poll.options[optionIndex]) {
            showToast('Invalid option');
            return;
        }
        
        // Check if user already voted
        const votedBy = post.poll.votedBy || {};
        if (votedBy[currentUser.uid] !== undefined) {
            showToast('You already voted on this poll');
            return;
        }
        
        // Prepare the updated data - create new arrays/objects
        const updatedOptions = [];
        for (let i = 0; i < post.poll.options.length; i++) {
            updatedOptions.push({
                label: post.poll.options[i].label,
                votes: post.poll.options[i].votes || 0
            });
        }
        updatedOptions[optionIndex].votes = updatedOptions[optionIndex].votes + 1;
        
        const updatedVotedBy = {};
        Object.keys(votedBy).forEach(key => {
            updatedVotedBy[key] = votedBy[key];
        });
        updatedVotedBy[currentUser.uid] = optionIndex;
        
        // Update using separate updates instead of nested path
        await postRef.child('poll/options').set(updatedOptions);
        await postRef.child('poll/votedBy').set(updatedVotedBy);
        
        console.log('Vote saved successfully');
        showToast('Vote recorded! ✅');
        
        // Refresh the feed to show updated results
        loadAllFeed();
        if (currentPage === 'qa') loadQAFeed();
        if (currentPage === 'news') loadNewsFeed();
        
    } catch (e) {
        console.error('Vote error details:', e);
        showToast('Error voting: ' + (e.message || 'Unknown error'));
    }
}

// Test function to create a sample poll
async function createSamplePoll() {
    if (!currentUser) {
        showToast('Please sign in first');
        return;
    }
    
    if (!database) {
        showToast('Database error');
        return;
    }
    
    const samplePoll = {
        uid: currentUser.uid,
        displayName: currentUserData?.displayName || 'System',
        role: currentUserData?.role || 'student',
        anonymous: false,
        category: 'general',
        text: '📊 Sample Poll: What do you think about the new campus Wi-Fi?',
        hashtags: ['#CampusPoll', '#UNIVEN'],
        likes: {},
        likesCount: 0,
        saves: {},
        commentsCount: 0,
        poll: {
            options: [
                { label: 'Excellent! 🚀', votes: 0 },
                { label: 'Good enough 👍', votes: 0 },
                { label: 'Needs improvement 😕', votes: 0 },
                { label: 'Terrible 👎', votes: 0 }
            ],
            votedBy: {}
        },
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        await database.ref('posts').push(samplePoll);
        showToast('Sample poll created! Vote on it now! 🎉');
        loadAllFeed();
    } catch(e) {
        console.error('Error creating sample poll:', e);
        showToast('Error creating poll');
    }
}

// Add this to console: createSamplePoll()

function openAnswerModal(postId) {
    openPostModal(postId);
    setTimeout(() => {
        const input = document.getElementById('comment-input');
        if (input) {
            input.focus();
            showToast('Type your answer below 💡');
        }
    }, 500);
}

// ──────────────────────────────────────────────
//  COMPOSER FUNCTIONS
// ──────────────────────────────────────────────

function openComposer() {
    if (!currentUser) {
        showToast('Please sign in to post');
        return;
    }
    const modal = document.getElementById('composer-modal');
    if (modal) modal.classList.remove('hidden');
    const textarea = document.getElementById('post-text');
    if (textarea) textarea.focus();
}

function openComposerAndSetQuestion() {
    openComposer();
    const categorySelect = document.getElementById('post-category');
    if (categorySelect) categorySelect.value = 'question';
}

function closeComposer() {
    const modal = document.getElementById('composer-modal');
    if (modal) modal.classList.add('hidden');
    
    const textarea = document.getElementById('post-text');
    if (textarea) textarea.value = '';
    
    const charCount = document.getElementById('char-count');
    if (charCount) charCount.textContent = '0 / 500';
    
    const postBtn = document.getElementById('post-btn');
    if (postBtn) postBtn.disabled = true;
    
    const hashtagPreview = document.getElementById('hashtag-preview');
    if (hashtagPreview) hashtagPreview.innerHTML = '';
    
    const pollSection = document.getElementById('poll-section');
    if (pollSection) pollSection.classList.add('hidden');
    
    const linkSection = document.getElementById('link-section');
    if (linkSection) linkSection.classList.add('hidden');
    
    ['link-url', 'link-title', 'poll-opt1', 'poll-opt2', 'poll-opt3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    postIdentity = 'real';
    setIdentity('real');
}

function onComposerInput(textarea) {
    if (!textarea) return;
    const text = textarea.value;
    const count = text.length;
    
    const charCount = document.getElementById('char-count');
    if (charCount) charCount.textContent = `${count} / 500`;
    
    const postBtn = document.getElementById('post-btn');
    if (postBtn) postBtn.disabled = count === 0;
    
    const hashtags = text.match(/#\w+/g) || [];
    const preview = document.getElementById('hashtag-preview');
    if (preview) preview.innerHTML = hashtags.map(h => `<span class="hashtag">${escapeHtml(h)}</span>`).join('');
}

function setIdentity(type) {
    postIdentity = type;
    const idReal = document.getElementById('id-real');
    const idAnon = document.getElementById('id-anon');
    if (idReal) idReal.classList.toggle('active', type === 'real');
    if (idAnon) idAnon.classList.toggle('active', type === 'anon');
}

function insertTeamsLink() {
    const section = document.getElementById('link-section');
    if (section) section.classList.toggle('hidden');
}

function insertPoll() {
    const section = document.getElementById('poll-section');
    if (section) section.classList.toggle('hidden');
}

async function submitPost() {
    console.log('submitPost called');
    
    if (!currentUser) {
        showToast('Please sign in to post');
        console.log('No user signed in');
        return;
    }
    
    if (!database) {
        showToast('Database error - please refresh');
        console.log('No database connection');
        return;
    }
    
    const textarea = document.getElementById('post-text');
    if (!textarea) {
        console.log('Textarea not found');
        return;
    }
    
    const text = textarea.value.trim();
    if (!text) {
        showToast('Please enter some text');
        return;
    }
    
    const categorySelect = document.getElementById('post-category');
    const category = categorySelect ? categorySelect.value : 'general';
    const isAnon = postIdentity === 'anon';
    const hashtags = text.match(/#\w+/g) || [];
    
    // Get current timestamp
    const timestamp = Date.now();
    
    // Create post data object
    const postData = {
        uid: currentUser.uid,
        displayName: isAnon ? 'Anonymous' : (currentUserData?.displayName || currentUser.displayName || 'User'),
        handle: isAnon ? `@user${Math.floor(Math.random() * 900 + 100)}` : null,
        role: currentUserData?.role || 'student',
        anonymous: isAnon,
        category: category,
        text: text,
        hashtags: hashtags,
        likes: {},
        likesCount: 0,
        saves: {},
        commentsCount: 0,
        createdAt: timestamp
    };
    
    // Add poll if exists
    const pollOpt1 = document.getElementById('poll-opt1');
    const pollOpt2 = document.getElementById('poll-opt2');
    
    if (pollOpt1 && pollOpt2 && pollOpt1.value.trim() && pollOpt2.value.trim()) {
        const pollOptions = [];
        pollOptions.push({ label: pollOpt1.value.trim(), votes: 0 });
        pollOptions.push({ label: pollOpt2.value.trim(), votes: 0 });
        
        const pollOpt3 = document.getElementById('poll-opt3');
        if (pollOpt3 && pollOpt3.value.trim()) {
            pollOptions.push({ label: pollOpt3.value.trim(), votes: 0 });
        }
        
        postData.poll = {
            options: pollOptions,
            votedBy: {}
        };
        console.log('Poll added to post');
    }
    
    // Add event link if exists
    const linkUrl = document.getElementById('link-url');
    const linkTitle = document.getElementById('link-title');
    
    if (linkUrl && linkUrl.value.trim()) {
        postData.eventLink = linkUrl.value.trim();
        postData.eventTitle = (linkTitle && linkTitle.value.trim()) || 'Campus Event';
        postData.eventHost = currentUserData?.displayName || 'UNIVEN';
        postData.eventTime = new Date().toLocaleDateString();
        console.log('Event link added');
    }
    
    console.log('Submitting post:', postData);
    
    try {
        // Create a new post reference
        const newPostRef = database.ref('posts').push();
        await newPostRef.set(postData);
        
        console.log('Post saved successfully with ID:', newPostRef.key);
        showToast('Post published! 🎉');
        
        // Clear the form
        closeComposer();
        
        // Refresh all feeds
        loadAllFeed();
        loadQAFeed();
        loadNewsFeed();
        
    } catch (e) {
        console.error('Post error:', e);
        showToast('Error publishing post: ' + (e.message || 'Unknown error'));
    }
}
// ──────────────────────────────────────────────
//  POST DETAIL & COMMENTS
// ──────────────────────────────────────────────

async function openPostModal(postId) {
    currentPostId = postId;
    if (!database) return;
    
    try {
        const snapshot = await database.ref('posts/' + postId).once('value');
        const post = snapshot.val();
        if (!post) return;
        post.id = postId;
        
        const modal = document.getElementById('post-modal');
        if (modal) modal.classList.remove('hidden');
        
        const content = document.getElementById('post-detail-content');
        if (content) {
            content.innerHTML = '';
            const detailCard = createPostCard(post, 0);
            detailCard.style.cursor = 'default';
            detailCard.style.borderBottom = '1px solid var(--border)';
            content.appendChild(detailCard);
        }
        
        // Load comments
        const commentsSnapshot = await database.ref('comments/' + postId).once('value');
        const commentsData = commentsSnapshot.val();
        const commentsDiv = document.createElement('div');
        commentsDiv.className = 'comments-section';
        commentsDiv.innerHTML = '<p class="comments-label">💬 Replies</p>';
        
        if (commentsData) {
            const comments = Object.keys(commentsData).map(key => ({ id: key, ...commentsData[key] }));
            comments.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            comments.forEach(c => commentsDiv.appendChild(createCommentEl(c)));
        } else {
            commentsDiv.innerHTML += '<div class="empty-state"><p>No replies yet. Be the first!</p></div>';
        }
        
        if (content) content.appendChild(commentsDiv);
        
        const commentAvatar = document.getElementById('comment-avatar');
        if (commentAvatar) commentAvatar.textContent = getInitials(currentUserData?.displayName || 'U');
        
    } catch(e) {
        console.error('Error loading post:', e);
        showToast('Error loading post');
    }
}

function createCommentEl(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    const isOfficial = comment.role === 'faculty' || comment.role === 'staff';
    div.innerHTML = `
        <div class="comment-avatar" style="${isOfficial ? 'background:var(--green)' : ''}">
            ${comment.anonymous ? '👤' : getInitials(comment.displayName || 'U')}
        </div>
        <div class="comment-bubble">
            <div class="comment-author">${escapeHtml(comment.displayName || 'Unknown')}</div>
            <div class="comment-text">${escapeHtml(comment.text || '')}</div>
            <div class="comment-time">${formatTime(comment.createdAt)}</div>
        </div>`;
    return div;
}

async function submitComment() {
    const input = document.getElementById('comment-input');
    const text = input ? input.value.trim() : '';
    
    if (!text || !currentPostId || !currentUser) {
        if (!currentUser) showToast('Sign in to comment');
        return;
    }
    if (!database) { showToast('Database error'); return; }
    
    const comment = {
        uid: currentUser.uid,
        displayName: currentUserData?.displayName || 'User',
        role: currentUserData?.role || 'student',
        text: text,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        await database.ref('comments/' + currentPostId).push(comment);
        await database.ref('posts/' + currentPostId).transaction(post => {
            if (post) post.commentsCount = (post.commentsCount || 0) + 1;
            return post;
        });
        
        if (input) input.value = '';
        showToast('Reply posted! 💬');
        openPostModal(currentPostId);
        loadAllFeed();
    } catch(e) {
        console.error('Comment error:', e);
        showToast('Error posting comment');
    }
}

function closePostModal() {
    const modal = document.getElementById('post-modal');
    if (modal) modal.classList.add('hidden');
    currentPostId = null;
}

// ──────────────────────────────────────────────
//  SEARCH FUNCTIONS
// ──────────────────────────────────────────────

function openSearch() {
    const searchBar = document.getElementById('search-bar');
    const feedFilters = document.getElementById('feed-filters');
    if (searchBar) searchBar.classList.remove('hidden');
    if (feedFilters) feedFilters.classList.add('hidden');
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();
}

function closeSearch() {
    const searchBar = document.getElementById('search-bar');
    const feedFilters = document.getElementById('feed-filters');
    if (searchBar) searchBar.classList.add('hidden');
    if (feedFilters) feedFilters.classList.remove('hidden');
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    applyFilterAndRender();
}

function searchPosts(query) {
    if (!query) {
        applyFilterAndRender();
        return;
    }
    const q = query.toLowerCase();
    const results = allPosts.filter(p =>
        (p.text || '').toLowerCase().includes(q) ||
        (p.displayName || '').toLowerCase().includes(q) ||
        (p.hashtags || []).some(h => h.toLowerCase().includes(q))
    );
    const container = document.getElementById('posts-container');
    if (container) renderPosts(results, container);
}

// ──────────────────────────────────────────────
//  UTILITY FUNCTIONS
// ──────────────────────────────────────────────

function formatTime(timestamp) {
    if (!timestamp) return 'just now';
    const ts = typeof timestamp === 'number' ? timestamp : timestamp;
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(ts).toLocaleDateString();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer;
function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

function updateStatPost() {
    if (currentUser) {
        const count = allPosts.filter(p => p.uid === currentUser.uid).length;
        const statPosts = document.getElementById('stat-posts');
        if (statPosts) statPosts.textContent = count;
    }
}

function openGroup(id) {
    showToast(`${id} group coming soon!`);
}

function joinEvent(link) {
    window.open(link, '_blank');
}

// ──────────────────────────────────────────────
//  INITIALIZATION
// ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Expose createSamplePoll to console for testing
    window.createSamplePoll = createSamplePoll;
    
    if (auth && firebaseReady) {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await loadUserData(user);
                enterApp(user);
            }
        });
    }
});