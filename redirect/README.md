# Redirect - Chrome 扩展

URL 重定向的 Chrome 浏览器扩展，基于 Manifest V3。

## 功能特点

- 🔀 **URL 重定向** - 支持前缀匹配和正则表达式
- 📋 **规则管理** - 可视化配置界面，支持增删改查
- 🎨 **动态图标** - 绿色启用/灰色禁用，显示规则数量
- 💾 **自动保存** - 配置持久化存储

## 安装方法

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目文件夹

## 使用方法

### 基本操作

1. 点击工具栏扩展图标打开弹窗
2. 使用总开关控制所有功能的启用/禁用
3. 点击「编辑」按钮打开规则配置页面

### 配置规则

1. 点击「+ 新建」添加规则
2. 选择匹配模式：**前缀** 或 **正则**
3. 填写规则名称、源地址、目标地址
4. 点击「添加」保存

### 示例

**前缀匹配：**
- 源：`https://api.example.com`
- 目标：`http://localhost:8080`
- 效果：`https://api.example.com/v1/users` → `http://localhost:8080/v1/users`

**正则匹配：**
- 源：`^https://(.+)\.example\.com/api`
- 目标：`http://localhost:8080/$1`
- 效果：`https://test.example.com/api` → `http://localhost:8080/test`

## 工作原理

使用 Chrome 的 declarativeNetRequest API 实现 URL 重定向。

## 文件结构

```
redirect/
├── manifest.json        # 扩展配置
├── README.md
├── icons/               # 图标文件
├── pages/               # 页面文件
│   ├── popup.html/js    # 弹窗界面
│   └── options.html/js  # 规则配置页面
└── scripts/             # 脚本文件
    └── background.js    # Service Worker
```

## 注意事项

⚠️ **安全提示**

- 仅用于**开发调试**目的
- 使用完毕后请关闭总开关

## 技术栈

- Chrome Extension Manifest V3
- declarativeNetRequest API
- Chrome Storage API

## License

MIT License
