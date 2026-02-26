// background.js - Service Worker for keyboard shortcuts
// Chrome/Firefox compatible

// 使用 browser 命名空间（Firefox 标准，Chrome 也支持）
const chromeOrBrowser = typeof browser !== 'undefined' ? browser : chrome;

// 插件启用状态
let isPopupEnabled = true;

// 侧边栏状态
let isSidePanelOpen = false;

// 检测浏览器类型和 API 可用性
const isFirefox = typeof browser !== 'undefined';
const hasSidePanel = !!chromeOrBrowser.sidePanel;

console.log('📚 Browser:', isFirefox ? 'Firefox' : 'Chrome');
console.log('📚 SidePanel API:', hasSidePanel ? 'Supported' : 'Not supported');

// 安装时初始化
chromeOrBrowser.runtime.onInstalled.addListener(() => {
  // 从存储中读取启用状态
  chromeOrBrowser.storage.sync.get(['popupEnabled'], (result) => {
    isPopupEnabled = result.popupEnabled !== false; // 默认启用
  });

  console.log('📚 English Dictionary 插件已安装');
});

// 处理快捷键命令
chromeOrBrowser.commands.onCommand.addListener((command) => {
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
    if (hasSidePanel) {
      // Chrome: 使用 Side Panel API
      await chromeOrBrowser.sidePanel.open();
      isSidePanelOpen = true;
    } else {
      // Firefox: 打开 options 页面作为替代
      await chromeOrBrowser.runtime.openOptionsPage();
    }

    // 通知当前标签页
    const [tab] = await chromeOrBrowser.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chromeOrBrowser.tabs.sendMessage(tab.id, {
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
  await chromeOrBrowser.storage.sync.set({ popupEnabled: isPopupEnabled });

  // 通知所有标签页
  const tabs = await chromeOrBrowser.tabs.query({});
  tabs.forEach(tab => {
    chromeOrBrowser.tabs.sendMessage(tab.id, {
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

  // 尝试使用 notifications API
  if (chromeOrBrowser.notifications) {
    chromeOrBrowser.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: title,
      message: message
    });
  }
}

// 监听侧边栏关闭事件
chromeOrBrowser.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    port.onDisconnect.addListener(() => {
      isSidePanelOpen = false;
    });
  }
});

// 监听来自 content script 的消息
chromeOrBrowser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getPopupState') {
    sendResponse({ enabled: isPopupEnabled });
  } else if (request.type === 'getSidePanelState') {
    sendResponse({ open: isSidePanelOpen });
  } else if (request.type === 'openOptionsPage') {
    // Firefox: 打开选项页面的备用方法
    chromeOrBrowser.runtime.openOptionsPage().catch(console.error);
  }
  return true; // 保持消息通道开放
});

console.log('📚 Background service worker 已加载');
