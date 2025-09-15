# 得鱼团契网站

## 介绍
这是一个为得鱼团契建设的简单主页和管理员后台，基于马太福音 4:19。主页显示邀请信息和RSVP功能，后台允许管理员登录和管理其他管理员及查看出席名单。

## 安装
1. 确保Node.js已安装。
2. 在项目目录运行：
   ```
   npm install
   ```
3. 启动服务器：
   ```
   node server.js
   ```
4. 访问 http://localhost:3000

## 使用
- 主页：访问 / 查看邀请，点击【确认出席】提交姓名（存储在 rsvps.json）。
- 管理员后台：访问 /admin，登录用户名 `admin` 密码 `01121000099`。创建新管理员，查看RSVP名单。

## API 端点
- GET /api/rsvps - 获取出席名单
- POST /api/rsvps - 添加RSVP (body: {name: "姓名"})
- POST /api/admin/login - 登录 (body: {username, password})
- POST /api/admin/create - 创建管理员 (body: {username, password}) - 需要登录
- GET /api/admin/status - 检查登录状态

## 数据存储
- data/rsvps.json: 出席名单数组 [{name, timestamp}]
- data/admins.json: 管理员数组 [{username, hashedPassword}]

## 安全
- 密码使用 bcrypt 哈希存储。
- 使用 express-session 管理登录状态。
- 生产环境请使用 HTTPS，添加速率限制和输入验证。
- 超级管理员: admin / 01121000099

## 部署
可部署到 Vercel、Heroku 或 Render。设置环境变量用于 session secret。

## 限制
- 简单文件-based DB，适合小规模使用。
- 无删除RSVP或高级功能。