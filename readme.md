# Chrome Dev Tools - Chrome 扩展工具集

面向 Web 开发者的 Chrome 浏览器扩展工具集，基于 Manifest V3，解决开发中常见的 URL 重定向和 CORS 跨域问题。

## 包含扩展

### 1. Redirect (`redirect/`)

URL 重定向扩展，使用 Chrome declarativeNetRequest API 实现请求拦截与重定向。

- 支持**前缀匹配**和**正则表达式**两种模式
- 可视化规则管理界面，支持增删改查
- 动态图标状态显示（绿色启用 / 灰色禁用）
- 配置持久化存储

### 2. CORS Proxy (`cors/`)

CORS 跨域代理扩展，通过多层代理机制绕过浏览器跨域限制。

- 基于 fetch/XHR 代理实现 CORS 绕过
- 每条规则可独立控制 CORS 开关
- 代理流程：`页面请求 → proxy.js 拦截 → inject.js 转发 → background.js 代理 → 目标服务器`
- 动态图标状态显示

## 安装方法

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择对应的扩展文件夹（`redirect/` 或 `cors/`）

## 项目结构

```
chrome_dev/
├── redirect/                # URL 重定向扩展
│   ├── manifest.json
│   ├── README.md
│   ├── icons/               # 图标文件
│   ├── pages/
│   │   ├── popup.html/js    # 弹窗界面
│   │   └── options.html/js  # 规则配置页面
│   └── scripts/
│       └── background.js    # Service Worker
│
├── cors/                    # CORS 跨域代理扩展
│   ├── manifest.json
│   ├── README.md
│   ├── icons/               # 图标文件
│   ├── pages/
│   │   ├── popup.html/js    # 弹窗界面
│   └── scripts/
│       ├── background.js    # Service Worker
│       ├── inject.js        # Content Script
│       └── proxy.js         # 页面代理脚本
│
└── docs/                    # 文档与密钥
```

## 技术栈

- Chrome Extension Manifest V3
- declarativeNetRequest API
- Content Script + Page Script
- Chrome Storage API

## 注意事项

- 仅用于**开发调试**目的
- 使用完毕后请关闭总开关
- 避免在敏感网站（网银、支付）启用
- 生产环境跨域问题应通过服务端配置解决

## License

MIT License
