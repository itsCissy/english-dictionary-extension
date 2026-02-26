// firebase-config.js - Firebase 配置文件
//
// ⚠️ 重要：使用前请创建自己的 Firebase 项目
//
// 创建步骤：
// 1. 访问 https://console.firebase.google.com/
// 2. 创建新项目 "English Dictionary"
// 3. 启用 Authentication：
//    - 选择 "Email/Password" 登录方式
// 4. 创建 Firestore 数据库：
//    - 选择 "production mode" 或 "test mode"
//    - 设置安全规则（见下方）
// 5. 获取配置：
//    - 项目设置 → 网页应用 → 注册应用 → 复制配置
// 6. 替换下面的 firebaseConfig 对象

// Firebase 配置（English Dictionary 项目）
const firebaseConfig = {
  apiKey: "AIzaSyCRetZg-6oj5HAXzmZ5_ZMZTnHDs7p8PSo",
  authDomain: "english-dictionary-aff74.firebaseapp.com",
  projectId: "english-dictionary-aff74",
  storageBucket: "english-dictionary-aff74.firebasestorage.app",
  messagingSenderId: "306068538646",
  appId: "1:306068538646:web:6d729471605a9bdb7cfc37",
  measurementId: "G-88GT7462MJ"
};

// ⚠️ 开发模式：如果未配置 Firebase，使用本地存储
const USE_FIREBASE = firebaseConfig.apiKey !== "YOUR_API_KEY";

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig, USE_FIREBASE };
}
