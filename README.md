# 经典怀旧游戏 - FC/NES 模拟器

🎮 一个基于 Web 技术的经典 FC/NES 游戏模拟器，支持手机触屏操作。

## ✨ 特性

- 🎮 **经典游戏合集** - 包含超级玛丽、魂斗罗、忍者龙剑传等 20+ 款经典游戏
- 📱 **触屏优化** - 王者荣耀风格的虚拟摇杆和按钮
- 🖥️ **横屏全屏** - 完美适配手机横屏操作
- 🎨 **精美 UI** - 现代化界面设计，流畅动画效果
- 📴 **离线支持** - PWA 技术，支持离线游玩
- 📦 **APK 打包** - 可打包为 Android APK

## 📸 截图

### 游戏选择

![游戏选择界面](screenshots/select.png)

### 游戏画面（横屏手柄）

![游戏画面](screenshots/game.png)

> 画面居中稳定显示；左侧方向键，右侧 A/B + 选择/开始；右上角为麦克风与扬声器。

## 🎮 操作说明

- **左侧摇杆**: 控制方向（上下左右）
- **A 按钮**: 游戏中的 A 键（通常为跳跃）
- **B 按钮**: 游戏中的 B 键（通常为攻击）
- **选择**: 游戏选择键
- **开始**: 游戏开始/暂停键

## 🚀 快速开始

### 本地运行

1. 克隆项目
```bash
git clone https://github.com/your-username/classic-fc-games.git
cd classic-fc-games
```

2. 启动本地服务器
```bash
# 使用 Python
python -m http.server 8080

# 或使用 Node.js
npx serve app
```

3. 打开浏览器访问 `http://localhost:8080`

### 打包 APK

#### 方法一: 使用 Cordova (推荐)

1. 安装依赖
```bash
npm install -g cordova
```

2. 运行构建脚本
```powershell
.\build-apk.ps1
```

3. 或手动构建
```bash
cordova create fc-mobile com.classicfc.games "经典怀旧游戏"
cp -r app/* fc-mobile/www/
cd fc-mobile
cordova platform add android
cordova build android
```

#### 方法二: 使用 Android Studio

1. 安装 Android Studio
2. 创建新项目，选择 "Empty Activity"
3. 将 `app` 文件夹内容复制到 `app/src/main/assets/`
4. 配置 WebView 加载本地 HTML
5. 构建 APK

#### 方法三: PWA 安装 (无需构建)

1. 将项目部署到支持 HTTPS 的服务器
2. 在 Chrome 中打开网址
3. 点击地址栏右侧的安装图标
4. 应用将添加到主屏幕

## 📁 项目结构

```
classic-fc-games/
├── app/                    # Web 应用主目录
│   ├── index.html         # 主页面
│   ├── manifest.json      # PWA 配置
│   ├── sw.js              # Service Worker
│   ├── config.xml         # Cordova 配置
│   ├── css/
│   │   └── mobile.css     # 移动端样式
│   ├── js/
│   │   ├── nes.js         # NES 模拟器核心
│   │   ├── cpu.js         # CPU 模拟
│   │   ├── ppu.js         # 图形处理
│   │   ├── papu.js        # 音频处理
│   │   ├── keyboard.js    # 键盘控制
│   │   ├── mobile-touch.js # 触摸控制
│   │   └── mobile-app.js  # 应用逻辑
│   └── roms/              # 游戏 ROM 文件
│       ├── Super Mario Bros.nes
│       ├── hun.nes        # 魂斗罗
│       └── ...
├── build-apk.ps1          # APK 构建脚本
├── README.md              # 项目说明
└── LICENSE                # 开源协议
```

## 🎯 支持的游戏

| 游戏名称 | 文件名 |
|---------|--------|
| 超级玛丽 | Super Mario Bros.nes |
| 魂斗罗 | hun.nes |
| 忍者龙剑传 | Kage.nes |
| 赤色要塞 | emc.nes |
| 双截龙2 | Double Dragon2.nes |
| 沙罗曼蛇 | Life Force.nes |
| 坦克大战 | tanke.nes |
| 冒险岛 | maoxiandao.nes |
| 更多... | ... |

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript
- **模拟器**: JSNES (JavaScript NES Emulator)
- **UI**: 自定义虚拟摇杆系统
- **打包**: Apache Cordova / PWA
- **图标**: SVG Icons

## 📝 开发说明

### 添加新游戏

1. 将 `.nes` ROM 文件放入 `app/roms/` 目录
2. 在 `app/js/mobile-app.js` 的 `GAMES` 数组中添加游戏信息:
```javascript
{ name: '游戏名称', file: 'rom文件名.nes', icon: '🎮' }
```

### 自定义样式

编辑 `app/css/mobile.css` 文件来自定义 UI 样式。

### 按键映射

默认按键映射:
- A: K 键
- B: J 键
- 方向: WASD
- 选择: Ctrl
- 开始: Enter

## 📄 许可证

本项目基于 GPL-3.0 许可证开源 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [JSNES](https://github.com/bfirsh/jsnes) - JavaScript NES 模拟器
- 开源 Homebrew：RoboRun-NES、Falling、NES Waveforms 等作者
- 所有经典游戏的原开发者

## 📮 联系方式

- GitHub: [@your-username](https://github.com/your-username)
- Issues: [提交问题](https://github.com/your-username/classic-fc-games/issues)

---

⭐ 如果这个项目对您有帮助，请给个 Star 支持一下！
