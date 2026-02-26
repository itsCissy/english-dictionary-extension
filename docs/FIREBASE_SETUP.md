# Firebase 云端同步 - 设置指南

## 第一步：创建 Firebase 项目

### 1. 访问 Firebase 控制台
打开 https://console.firebase.google.com/

### 2. 创建新项目
- 点击 "添加项目"
- 项目名称：`English Dictionary` 或你喜欢的名字
- **不**启用 Google Analytics（可选，更简单）
- 点击 "创建项目"

### 3. 启用 Authentication（身份验证）
- 在左侧菜单选择 "Authentication"
- 点击 "开始使用"
- 选择 "登录方法" 标签
- 启用 "电子邮件/密码" 登录方式
- 点击 "保存"

### 4. 创建 Firestore 数据库
- 在左侧菜单选择 "Firestore Database"
- 点击 "创建数据库"
- 选择位置（建议：nam5 (us-central) 或 asia-southeast1）
- 选择 "**测试模式**"（开发阶段，30天后需设置安全规则）
- 点击 "启用"

### 5. 设置数据库安全规则
在 Firestore → 规则 标签，设置以下规则：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用户数据规则：只有用户本人可以读写
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 6. 获取配置信息
- 点击项目概览 → ⚙️ 设置 → 项目设置
- 滚动到 "您的应用" 部分
- 点击网页图标 `</>`
- 应用昵称：`English Dictionary Extension`
- **不**勾选 "Firebase Hosting"
- 点击 "注册应用"
- 复制 `firebaseConfig` 对象内容

### 7. 更新配置文件
将复制的配置粘贴到 `firebase-config.js` 文件中，替换 `YOUR_*` 占位符。

---

## 数据结构

### Firestore 数据模型

```
Firestore 数据库
└── users/
    └── {userId}/                    # 用户的唯一 ID
        ├── profile/                 # 用户资料
        │   ├── email: "user@example.com"
        │   ├── createdAt: "2026-02-26T..."
        │   └── lastSyncAt: "2026-02-26T..."
        │
        └── words/                   # 用户的单词
            ├── {wordId}/            # 单词 ID（通常是单词本身）
            │   ├── word: "hello"
            │   ├── phonetic: "/həˈləʊ/"
            │   ├── meanings: [...]
            │   ├── savedAt: "2026-02-26T..."
            │   ├── viewCount: 5
            │   ├── mastered: false
            │   └── tags: ["daily", "work"]
            │
            └── {wordId}/
                └── ...
```

---

## 使用说明

### 首次使用
1. 打开插件侧边栏
2. 点击 "登录 / 注册" 按钮
3. 输入邮箱和密码
4. 系统自动创建账户并开始同步

### 多设备同步
1. 在另一台电脑上安装插件
2. 使用相同的邮箱密码登录
3. 数据自动从云端同步

### 数据备份
- 所有数据存储在 Firebase 云端
- 即使卸载插件，重新登录后数据恢复
- 可在 Firebase 控制台查看和导出数据

---

## 费用说明

Firebase 免费额度（Spark 计划）：

| 项目 | 免费额度 |
|------|----------|
| 文档存储 | 1GB |
| 每日读取 | 50K 次 |
| 每日写入 | 20K 次 |
| 每日删除 | 20K 次 |

**估算：** 每保存 1 个单词 = 1 次写入
- 保存 1000 个单词 = 1000 次写入 = 远低于限制
- 正常使用**完全免费**

---

## 故障排除

### Q: 登录后看不到数据？
A: 检查浏览器控制台是否有错误，确认 Firebase 配置正确。

### Q: 同步冲突怎么办？
A: 系统使用 "最后写入优先" 策略，后保存的数据会覆盖之前的数据。

### Q: 可以导出数据吗？
A: 可以！在侧边栏使用 "导出" 功能，或者直接在 Firebase 控制台导出。
