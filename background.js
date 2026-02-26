// background.js - Service Worker for keyboard shortcuts

// 插件启用状态
let isPopupEnabled = true;

// 侧边栏状态
let isSidePanelOpen = false;

// 安装时初始化
chrome.runtime.onInstalled.addListener(() => {
  // 从存储中读取启用状态
  chrome.storage.sync.get(['popupEnabled'], (result) => {
    isPopupEnabled = result.popupEnabled !== false; // 默认启用
  });

  console.log('📚 English Dictionary 插件已安装');
});

// 处理快捷键命令
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'open-sidepanel':
      handleOpenSidePanel();
      break;
    case 'toggle-popup':
      handleTogglePopup();
      break;
  }
});

// 打开/关闭侧边栏
async function handleOpenSidePanel() {
  try {
    // 打开侧边栏
    await chrome.sidePanel.open();
    isSidePanelOpen = true;

    // 通知当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'sidePanelToggled',
        open: true
      }).catch(() => {
        // 忽略错误（content script 可能未加载）
      });
    }
  } catch (error) {
    console.error('打开侧边栏失败:', error);
  }
}

// 切换 popup 启用/禁用状态
async function handleTogglePopup() {
  isPopupEnabled = !isPopupEnabled;

  // 保存到存储
  await chrome.storage.sync.set({ popupEnabled: isPopupEnabled });

  // 通知所有标签页
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'popupToggle',
      enabled: isPopupEnabled
    }).catch(() => {
      // 忽略错误（content script 可能未加载）
    });
  });

  // 显示通知
  showNotification(isPopupEnabled);
}

// 显示状态通知
function showNotification(enabled) {
  const title = 'English Dictionary';
  const message = enabled ? '🟢 划词查词已启用' : '🔴 划词查词已禁用';

  // 尝试使用 chrome.notifications API
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png', // 可选：添加图标文件
      title: title,
      message: message
    });
  }
}

// 监听侧边栏关闭事件
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    port.onDisconnect.addListener(() => {
      isSidePanelOpen = false;
    });
  }
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getPopupState') {
    sendResponse({ enabled: isPopupEnabled });
  } else if (request.type === 'getSidePanelState') {
    sendResponse({ open: isSidePanelOpen });
  }
  return true; // 保持消息通道开放
});

console.log('📚 Background service worker 已加载');
