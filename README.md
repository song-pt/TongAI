
# TongAI Solver Deployment Guide

## 1. Environment Variables
When deploying to Vercel, you must set the following environment variables in **Settings -> Environment Variables**:

| Variable Name | Description |
|---|---|
| `VITE_SILICONFLOW_API_KEY` | **OpenAI-compatible API Key** (Supports SiliconFlow, DeepSeek, or any compatible platform) |
| `VITE_SILICONFLOW_BASE_URL` | **OpenAI-compatible Base URL** (e.g., https://api.siliconflow.cn/v1) |
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Project Anon Key |
| `VITE_ADMIN_PASSWORD` | Fallback Admin Password (Used if DB check fails) |

## 2. Database Setup (Crucial)
1. Go to your Supabase Project.
2. Navigate to **SQL Editor**.
3. Click **New Query**.
4. Open the file `supabase_schema.txt` from this project.
5. Copy all the content and paste it into the SQL Editor.
6. Click **Run**.

Once this is done, your system is fully operational!

---

# TongAI 智能解题助手部署指南 (中文版)

## 1. 环境变量配置 (Environment Variables)
在 Vercel 部署项目时，请务必在 **Settings -> Environment Variables** 中添加以下变量：

| 变量名称 | 描述 |
|---|---|
| `VITE_SILICONFLOW_API_KEY` | **OpenAI 兼容格式的 API 密钥** (支持硅基流动、DeepSeek 或任意兼容 OpenAI 接口的平台) |
| `VITE_SILICONFLOW_BASE_URL` | **OpenAI 兼容格式的 Base URL** (例如: https://api.siliconflow.cn/v1) |
| `VITE_SUPABASE_URL` | 您的 Supabase 项目 URL 地址 |
| `VITE_SUPABASE_ANON_KEY` | 您的 Supabase 项目 Anon Key (公钥) |
| `VITE_ADMIN_PASSWORD` | 备用管理员密码 (仅在数据库连接失败时作为兜底验证使用) |

## 2. 数据库配置 (至关重要)
为了让登录、历史记录和管理功能正常工作，您必须初始化数据库：

1. 登录您的 **Supabase** 项目后台。
2. 进入左侧菜单的 **SQL Editor** (SQL 编辑器)。
3. 点击 **New Query** (新建查询)。
4. 打开本项目中的 `supabase_schema.txt` 文件。
5. 将文件中的所有内容复制并粘贴到 Supabase 的编辑器中。
6. 点击 **Run** (运行) 按钮。

完成以上步骤后，您的系统即可完美运行！
