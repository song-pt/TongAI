
###TongAI is a full-stack AI platform. It integrates large models for multi-disciplinary (math/language/English) tutoring and provides a complete backend management system. It also offers convenient key distribution, usage management, and automatic circuit breaker functionality. I'm just a student, and I welcome any questions you may have to help me improve! Thank you!

##If you need to switch models, please go to line 22 of the constants.ts file.

# Deploying Tong AI

## 1. Environment Variables
When deploying to Vercel, you must set the following environment variables in **Settings -> Environment Variables**:

| Key | Value |
|---|---|
| `VITE_SILICONFLOW_API_KEY` | **OpenAI-compatible API Key** (Supports SiliconFlow, DeepSeek, or any compatible platform) |
| `VITE_SILICONFLOW_BASE_URL` | **OpenAI-compatible Base URL** (e.g., https://api.siliconflow.cn/v1) |
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

---
### TongAI 是一个AI全栈平台。它集成了大模型进行多学科（数/语/英）的辅导，也提供了一套完整的后台管理系统。同时提供了便捷的密钥分发，用量管理，自动熔断功能。我只是一个学生，有任何问题我都希望大家能积极提出，帮助我做的更好！谢谢！

## 如果需要切换模型，请前往constants.ts文件的第22行

# 部署 TongAI

## 1. 环境变量配置 (Environment Variables)
在 Vercel 部署项目时，请务必在 **Settings -> Environment Variables** 中添加以下变量：

| Key | Value |
|---|---|
| `VITE_SILICONFLOW_API_KEY` | **OpenAI 兼容格式的 API 密钥** (支持硅基流动、DeepSeek 或任意兼容 OpenAI 接口的平台) |
| `VITE_SILICONFLOW_BASE_URL` | **OpenAI 兼容格式的 Base URL** (例如: https://api.siliconflow.cn/v1) |
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

完成以上步骤后，您的系统即可完美运行！
