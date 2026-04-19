
###First of all, I want to make it clear that this project is mostly written by GoogleAiStudio, and I am only responsible for fixing bugs.

### TongAI is a full-stack AI platform. It integrates large models for multi-disciplinary tutoring and provides a complete backend management system. It also offers convenient key distribution, usage management, and automatic circuit breaker functionality. I'm just a student, and I welcome any questions you may have to help me improve! Thank you!

## If you need to switch models, please go to line 22 of the constants.ts file,or modify it in the admin menu

# Deploying Tong AI

## 1. Environment Variables
When deploying to Vercel, you must set the following environment variables in **Settings -> Environment Variables**:

| Key | Value |
|---|---|
| `AI_API_KEY` | **Server-side API Key** (Recommended: OpenRouter). Hidden from client, handles IP bypass and streaming. |
| `AI_BASE_URL` | **Server-side Base URL** (e.g., https://api.openrouter.ai/api/v1). Used by proxy for global accessibility. |
| `VITE_SILICONFLOW_API_KEY` | **Legacy Frontend API Key** (Optional if `AI_API_KEY` is set) |
| `VITE_SILICONFLOW_BASE_URL` | **Legacy Frontend Base URL** (e.g., https://api.siliconflow.cn/v1) |
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Project API Key |
| `VITE_ADMIN_PASSWORD` | Admin Password |

## 2. Database Setup (Crucial)
1. Go to your Supabase Project.
2. Navigate to **SQL Editor**.
3. Click **New Query**.
4. Open the file `supabase_schema.txt` from this project.
5. Copy all the content and paste it into the SQL Editor.
6. Click **Run**.

Once this is done, your system is fully operational!

## 3. Vercel Deployment Note
This project is pre-configured for Vercel. Added `api/chat.ts` and `vercel.json` to handle backend proxying automatically on Vercel's edge.

---
##首先声明，这个项目大多都是 AI 写的，我基本只负责改 BUG

### TongAI 是一个AI全栈平台。它集成了大模型进行多学科的辅导，也提供了一套完整的后台管理系统。同时提供了便捷的密钥分发，用量管理，自动熔断功能。我只是一个学生，有任何问题我都希望大家能积极提出，帮助我做的更好！谢谢！

## 如果需要切换模型，请前往constants.ts文件的第22行或者在管理员面板中修改

# 部署 TongAI

## 1. 环境变量配置 (Environment Variables)
在 Vercel 部署项目时，请务必在 **Settings -> Environment Variables** 中添加以下变量：

| Key | Value |
|---|---|
| `AI_API_KEY` | **后端代理专用 API 密钥** (推荐填入 OpenRouter 密钥)。这是最关键的变量，用于隐藏用户 IP 并实现流式输出。 |
| `AI_BASE_URL` | **后端代理 Base URL** (例如: https://api.openrouter.ai/api/v1)。用于解决国内无法直连 AI 服务器的问题。 |
| `VITE_SILICONFLOW_API_KEY` | **前端直连 API 密钥** (旧版保留，若设置了上面的 AI_API_KEY 则可选) |
| `VITE_SILICONFLOW_BASE_URL` | **前端直连 Base URL** (例如: https://api.siliconflow.cn/v1) |
| `VITE_SUPABASE_URL` | 您的 Supabase 项目 URL 地址 |
| `VITE_SUPABASE_ANON_KEY` | 您的 Supabase 项目 API Key |
| `VITE_ADMIN_PASSWORD` | 管理员密码 |

## 2. 数据库配置 (至关重要)
为了让登录、历史记录和管理功能正常工作，您必须初始化数据库：

1. 登录您的 **Supabase** 项目后台。
2. 进入左侧菜单的 **SQL Editor** (SQL 编辑器)。
3. 点击 **New Query** (新建查询)。
4. 打开本项目中的 `supabase_schema.txt` 文件。
5. 将文件中的所有内容复制并粘贴到 Supabase 的编辑器中。
6. 点击 **Run** (运行) 按钮。

操作完毕后即可运行
