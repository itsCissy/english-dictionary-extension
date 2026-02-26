// firestore-sync.js - Firebase 云端同步模块
// 依赖：firebase SDK (在 HTML 中加载) 和 firebase-config.js

class FirestoreSync {
  constructor() {
    this.db = null;
    this.auth = null;
    this.userId = null;
    this.isInitialized = false;
    this.syncInProgress = false;
    this.listeners = [];
  }

  // 初始化 Firebase
  async init() {
    if (this.isInitialized) return;

    try {
      // 检查 Firebase SDK 是否已加载
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded');
      }

      // 检查配置是否存在
      if (typeof firebaseConfig === 'undefined') {
        throw new Error('Firebase config not found');
      }

      // 初始化 Firebase（如果还没有初始化）
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      this.auth = firebase.auth();
      this.db = firebase.firestore();

      // 监听登录状态
      this.auth.onAuthStateChanged((user) => {
        this.userId = user ? user.uid : null;
        this.notifyListeners('authStateChanged', user);
      });

      this.isInitialized = true;
      console.log('🔥 Firebase initialized');
    } catch (error) {
      console.error('Firebase init failed:', error);
      throw error;
    }
  }

  // 注册
  async register(email, password) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      await this.createUserProfile(userCredential.user);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: this.translateError(error.code) };
    }
  }

  // 登录
  async login(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: this.translateError(error.code) };
    }
  }

  // 登出
  async logout() {
    try {
      await this.auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取当前用户
  getCurrentUser() {
    return this.auth ? this.auth.currentUser : null;
  }

  // 创建用户资料
  async createUserProfile(user) {
    const userRef = this.db.collection('users').doc(user.uid);
    await userRef.set({
      profile: {
        email: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastSyncAt: firebase.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });
  }

  // 上传单词到云端
  async uploadWords(words) {
    if (!this.userId) throw new Error('Not logged in');

    const batch = this.db.batch();
    const wordsRef = this.db.collection('users').doc(this.userId).collection('words');

    Object.entries(words).forEach(([word, data]) => {
      const docRef = wordsRef.doc(word);
      batch.set(docRef, {
        ...data,
        syncedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();

    // 更新最后同步时间
    await this.updateLastSyncTime();

    console.log(`📤 Uploaded ${Object.keys(words).length} words`);
  }

  // 从云端下载单词
  async downloadWords() {
    if (!this.userId) throw new Error('Not logged in');

    const snapshot = await this.db
      .collection('users')
      .doc(this.userId)
      .collection('words')
      .get();

    const words = {};
    snapshot.forEach(doc => {
      words[doc.id] = doc.data();
    });

    console.log(`📥 Downloaded ${Object.keys(words).length} words`);
    return words;
  }

  // 同步单词（双向合并）
  async syncWords(localWords) {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      // 获取云端数据
      const cloudWords = await this.downloadWords();

      // 合并策略：本地优先，保留最新的保存时间
      const mergedWords = { ...cloudWords };

      Object.entries(localWords).forEach(([word, localData]) => {
        if (!mergedWords[word]) {
          // 云端没有，直接添加
          mergedWords[word] = localData;
        } else {
          // 云端有，比较保存时间
          const localTime = new Date(localData.savedAt || 0);
          const cloudTime = new Date(mergedWords[word].savedAt || 0);
          if (localTime > cloudTime) {
            mergedWords[word] = localData;
          }
        }
      });

      // 上传合并后的数据
      await this.uploadWords(mergedWords);

      // 更新最后同步时间
      await this.updateLastSyncTime();

      this.notifyListeners('syncComplete', mergedWords);
      return mergedWords;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // 更新最后同步时间
  async updateLastSyncTime() {
    if (!this.userId) return;

    await this.db.collection('users').doc(this.userId).set({
      profile: {
        lastSyncAt: firebase.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });
  }

  // 监听云端数据变化（实时同步）
  onWordsChanged(callback) {
    if (!this.userId) return;

    return this.db
      .collection('users')
      .doc(this.userId)
      .collection('words')
      .onSnapshot((snapshot) => {
        const words = {};
        snapshot.forEach(doc => {
          words[doc.id] = doc.data();
        });
        callback(words);
      });
  }

  // 添加事件监听器
  addListener(callback) {
    this.listeners.push(callback);
  }

  // 移除事件监听器
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  // 通知所有监听器
  notifyListeners(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }

  // 翻译错误信息
  translateError(code) {
    const errorMap = {
      'auth/email-already-in-use': '该邮箱已被注册',
      'auth/invalid-email': '邮箱格式不正确',
      'auth/weak-password': '密码强度不够（至少6位）',
      'auth/user-not-found': '用户不存在',
      'auth/wrong-password': '密码错误',
      'auth/too-many-requests': '请求过于频繁，请稍后再试',
      'auth/network-request-failed': '网络连接失败，请检查网络',
      'permission-denied': '没有权限访问数据',
      'unavailable': '服务暂时不可用'
    };
    return errorMap[code] || code;
  }

  // 检查是否已登录
  isLoggedIn() {
    return !!this.getUserId();
  }

  // 获取用户 ID
  getUserId() {
    return this.userId;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirestoreSync;
}
