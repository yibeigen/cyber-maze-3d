<!-- CyberMaze 3D · 活墙 官方开源项目文档 -->
<div align="center">

  <img src="docs/img/logo.jpg" alt="CyberMaze 3D Logo" width="180" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.12);" />

  # CyberMaze 3D · 活墙
  ### 动态流形 3D 解谜 · 图论不变量守护 · 会呼吸变形的赛博迷宫
  **从第一步到全息王座。墙会呼吸，路线由你重写。**

  <p>
    <!-- 作者 -->
    <a href="https://yibeigen.pages.dev/"><img src="https://img.shields.io/badge/Author-艺杯羹-d97706?style=flat-square" alt="Author"></a>
    <!-- 在线试玩 -->
    <a href="https://yibeigen.github.io/cyber-maze-3d/"><img src="https://img.shields.io/badge/Play-在线试玩-38bdf8?style=flat-square&logo=googlechrome&logoColor=white" alt="Play Online"></a>
    <!-- 单元测试 -->
    <img src="https://img.shields.io/badge/Tests-50%20passed-22c55e?style=flat-square" alt="Tests">
    <!-- 技术栈 -->
    <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black" alt="React 18">
    <img src="https://img.shields.io/badge/Three.js-R3F-000000?style=flat-square&logo=threedotjs&logoColor=white" alt="Three.js">
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <!-- 开源协议 -->
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-red.svg?style=flat-square" alt="License"></a>
  </p>

  <p><b>「突破传统迷宫的静止边界，体验动力学拓扑重组与三维光影盛宴。」</b><br>
  无需安装、无需注册，打开浏览器即可即刻启航畅玩。</p>

  | 🎮 在线秒玩入口 | 💻 源码开源仓库 | 💬 交流与获取更多工具 |
  | :---: | :---: | :---: |
  | [**点击即玩 (GitHub Pages)**](https://yibeigen.github.io/cyber-maze-3d/) | [**GitHub / cyber-maze-3d**](https://github.com/yibeigen/cyber-maze-3d) | 关注公众号【**艺杯羹**】回复「**迷宫**」 |

</div>

<br>

---

## 📸 精彩画面速览 (视觉与核心系统)

不用长篇大论，看图一眼看懂《CyberMaze 3D · 活墙》的惊艳体验：

### 1. 沉浸式全息主界面 · 自由定制
现代化高透光全息毛玻璃 UI，背景即是正在实时呼吸运动的 3D 迷宫。支持在主界面直接快捷切换主题，点击“自由定制”可自选迷宫尺寸（小/中/大）、开关动态重构与专属种子。

| 首页全景（高透光全息明境） | 自由定制弹窗（支持种子与尺寸配置） |
| :---: | :---: |
| <img src="docs/img/01-home-cover.png" alt="首页全景" width="560" /> | <img src="docs/img/02-custom-modal.png" alt="自由定制弹窗" width="420" /> |

---

### 2. 实机游戏场景 · 活墙呼吸动效 (会变形的迷宫)
走进迷宫，机械墙体伴随着倒计时动态升降！基于**图论生成树基础回路边置换原理**，无论墙体如何重组，**数学上 100% 保证终点必有解，绝无死锁**。

| 全息明境（高亮纯净白昼展台） | 活墙呼吸动效（墙体动态升降与发光轨迹） |
| :---: | :---: |
| <img src="docs/img/03-gameplay-light.png" alt="全息明境实机玩法" width="500" /> | <img src="docs/img/04-kinetic-walls.png" alt="活墙呼吸动效" width="500" /> |

---

### 3. 多套视觉主题 · 赛博深空与极光紫电
除了默认清爽通透的“全息明境”，游戏还配备了极具电竞质感的暗色科幻主题。绚丽的霓虹光带与暗黑深空，带来强烈的赛博朋克沉浸感。

<div align="center">
  <img src="docs/img/06-gameplay-aurora.png" alt="极光紫电深色实机" width="850" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.18);" />
  <p><sub>▲ 极光紫电主题：紫晶立柱、霓虹能量导光带与暗夜光影</sub></p>
</div>

---

### 4. 通关战报 · 2D 拓扑投影与真实轨迹重播
通关后不仅提供时间、步数和星级评级，更将你的**真实行进轨迹**与 **A* 最优解路线**进行 2D 拓扑投影对比，支持一键轨迹重播回放与保存高清战报！

| 全息明境 · 通关战报面板 | 极光紫电 · 霓虹战报面板 |
| :---: | :---: |
| <img src="docs/img/05-result-report-light.png" alt="全息明境战报" width="460" /> | <img src="docs/img/07-result-report-aurora.png" alt="极光紫电战报" width="460" /> |

---

### 5. 算法实验室 · 3D 图论与路径规划可视化教学
内置强大的算法实验室，支持**逐帧单步/自动播放**迷宫从零生成的打墙雕刻过程，以及 AI 寻路的动态波阵面展开，是计算机图形学与算法可视化的硬核教具！

| 迷宫生成可视化 (DFS 深度优先 / Prim 算法) | 路径规划寻路可视化 (BFS / DFS / A* 启发式搜索) |
| :---: | :---: |
| <img src="docs/img/08-algorithm-lab-generate.png" alt="算法实验室：迷宫生成" width="500" /> | <img src="docs/img/09-algorithm-lab-solve.png" alt="算法实验室：寻路规划" width="500" /> |

---

## 🎮 操控指南 (键位一览)

| 键位 / 手势 | 功能说明 |
| :---: | :--- |
| **W / A / S / D** 或 **方向键** | 控制全息机甲在迷宫通道中前后左右平移穿梭 |
| **空格键 (Space)** | 切换 / 按住进入高空全景俯瞰视角，纵览整体路线 |
| **G 键** | 主动触发一次动力学边缘置换，重构附近墙体开路 |
| **F 键** | 触发全息扫描脉冲，显示当前位置到终点的最优路线 |
| **Q / E 键** | 以 90° 为步长平滑旋转三维相机视口 |
| **V 键 / H 键** | 切换跟随时角 / 切换全屏电影级纯净观赏模式 |
| **Esc / P 键** | 打开暂停设置菜单（调节画质、音效、视觉主题） |
| **手机端操作** | 触屏滑动一步一格，底部悬浮控制坞提供一键旋转、俯瞰与辅助技能 |

---

## ⚡ 极速本地运行

本项目采用纯净现代化前端技术栈（Vite 6 + React 18 + Three.js + TypeScript），环境开箱即跑：

```bash
# 1. 克隆代码仓库
git clone https://github.com/yibeigen/cyber-maze-3d.git
cd cyber-maze-3d

# 2. 安装依赖
npm install

# 3. 启动本地开发服务
npm run dev
```

启动完成后，打开浏览器访问 `http://localhost:5173/` 即可立即体验。
运行全套单元测试：`npm run test`。

---

## 👨‍💻 关于作者与开发生态

**博主：艺杯羹**  
*独立开发者 · 效率工具与知识蒸馏系统创作者*

- **个人主页**：[yibeigen.pages.dev](https://yibeigen.pages.dev/)
- **CSDN 博客**：[博主 CSDN 主页](https://blog.csdn.net/qq_46987323?spm=1000.2115.3001.5343)
- **新浪微博**：[@艺杯羹](https://www.weibo.com/u/7583841270)
- **联系与交流**：微信 `peace-83` | QQ `3057454077`（*欢迎技术交流、Bug 反馈、功能建议或商业合作*）

### 🛠️ 作者精选开源工具项目：
- [**BlogDistiller · 博萃**](https://doc.305758.xyz/)（[GitHub 开源仓库](https://github.com/yibeigen/wechat-article-exporter)）：全网博文批量下载与知识蒸馏神器，支持微信公众号、知乎、微博、CSDN 等 9 大平台全量去噪与多格式导出。
  - *获取方式*：关注微信公众号【**艺杯羹**】，后台回复「**文章**」即可免费领取专属激活口令与桌面客户端。
- [**智能跟随提词器**](https://pip.305758.xyz/)（[GitHub 开源仓库](https://github.com/yibeigen/PipTeleprompter)）：纯前端高性能智能提词器，融合 AI 语音跟读滚动与画中画 (PiP) 桌面置顶悬浮。
  - *获取方式*：**无需回复，打开网址即可直接免费使用**！

<br>

<div align="center">
  <table align="center" style="border: none; margin: 12px auto;">
    <tr>
      <td align="center" style="border: none; padding: 0 20px;">
        <img src="docs/img/wechat_qr.png" alt="微信公众号【艺杯羹】" width="220" style="border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 14px rgba(0,0,0,0.08);" />
        <br />
        <sub><b>微信公众号【艺杯羹】</b></sub>
        <br />
        <sub>扫码关注 · 回复「<b>迷宫</b>」进交流群 · 回复「<b>文章</b>」领博萃</sub>
      </td>
      <td align="center" style="border: none; padding: 0 20px;">
        <img src="docs/img/reward_qr.png" alt="赞赏支持作者" width="220" style="border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 14px rgba(0,0,0,0.08);" />
        <br />
        <sub><b>赞赏支持 (Reward)</b></sub>
        <br />
        <sub>开源不易 · 如果喜欢本作欢迎请作者喝杯咖啡 ☕</sub>
      </td>
    </tr>
  </table>
</div>

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 协议完全开源，欢迎学习、交流与二次开发。商业使用或企业集成请保留原作者署名。
