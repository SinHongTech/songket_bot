# Songket (សង្កេត) — Enterprise Telegram Security Platform & Mini App

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![React 18](https://img.shields.io/badge/React-18.x-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-2CA5E0.svg?logo=telegram&logoColor=white)](https://core.telegram.org/bots)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis-00E599.svg?logo=redis&logoColor=white)](https://upstash.com)

> **Brand Signature:** 🤖 **Songket Security Team | ក្រុមការងារសង្កេត**  
> An intelligent, bilingual (Khmer & English) security engine engineered to safeguard Telegram groups, communities, and private chats from malicious URLs, phishing traps, malware payloads, and QR-based exploits.

---

## 📑 Table of Contents

1. [Platform Overview](#-platform-overview)
2. [Architecture & Data Pipeline](#-architecture--data-pipeline)
3. [Key Security Features](#-key-security-features)
4. [Role-Based Access & Privacy](#-role-based-access--privacy)
5. [Telegram Mini App Dashboard](#-telegram-mini-app-dashboard)
6. [Commands & Interactive Capabilities](#-commands--interactive-capabilities)
7. [Deployment & Infrastructure](#-deployment--infrastructure)
8. [Configuration Reference](#-configuration-reference)
9. [Subscription & Commercial Plans](#-subscription--commercial-plans)
10. [Project Directory Structure](#-project-directory-structure)

---

## 🛡️ Platform Overview

**Songket** delivers end-to-end security automation for Telegram ecosystems. By uniting real-time message stream analysis with multi-engine threat intelligence, Songket neutralizes malicious content before users interact with it, while providing community managers with an enterprise-grade administration console via a native Telegram Mini App.

```
                    ┌──────────────────────────────────────────────┐
                    │          Incoming Telegram Message           │
                    │      (Text, Link, File, Photo, Sticker)      │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │      Multi-Layer Pre-Filter & Heuristics     │
                    │   • Redis Fast Verdict Cache                 │
                    │   • Homoglyph & Telegram Phish Engine        │
                    │   • URLhaus & Google Safe Browsing           │
                    │   • QR Code Image Matrix Extraction          │
                    └──────────────────────┬───────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
                 [ Clean / Safe ]                     [ Unknown / Risk ]
                        │                                     │
                        ▼                                     ▼
                ┌──────────────┐                     ┌─────────────────┐
                │ Allow Stream │                     │ VirusTotal Dual │
                │ (Zero Delay) │                     │   Engine Scan   │
                └──────────────┘                     └────────┬────────┘
                                                              │
                                     ┌────────────────────────┴────────────────────────┐
                                     │                                                 │
                             [ Clean / Safe ]                                  [ Threat Detected ]
                                     │                                                 │
                                     ▼                                                 ▼
                             ┌──────────────┐                     ┌────────────────────────────────────────┐
                             │ Allow Stream │                     │ 1. Instant Message Deletion            │
                             └──────────────┘                     │ 2. Post Bilingual Warning Alert        │
                                                                  │ 3. Attach 1-Click Admin Actions:       │
                                                                  │    [🔨 Ban] [🔇 Mute 24h] [🛡️ Whitelist]│
                                                                  │ 4. Issue Strike & Log Threat Event     │
                                                                  └────────────────────────────────────────┘
```

---

## 🚀 Key Security Features

### 1. Multi-Engine Scanning Pipeline
* **VirusTotal API v3**: Dual-band URL and binary hash scanning with intelligent response caching (1h for URLs, 24h for files).
* **Homoglyph & Phishing Heuristic Engine**: Real-time detection of Cyrillic lookalikes (`tеlegram.org`), hyphenated credential harvesters (`telegram-login-*`, `t.me-verify-*`), and deceptive airdrop traps.
* **URLhaus & Google Safe Browsing Pre-Filters**: Sub-second pre-filtering against known malware feeds to conserve API quotas and accelerate verdicts.
* **Redirect Chain Unwrapper**: Follows shorteners (`bit.ly`, `tinyurl.com`, `t.me`) to inspect the final destination domain.

### 2. QR Code Image Scanner
* Automatically extracts and analyzes QR codes embedded inside **photos, compressed images, and stickers**.
* Neutralizes evasive "scan to login" / "scan for giveaway" scams before unsuspecting users scan with external devices.

### 3. 1-Click Inline Group Admin Moderation
* Threat alert notifications automatically embed 1-click admin action buttons:
  * `[ 🔨 Ban Spammer ]` — Instantly bans the threat sender from the group.
  * `[ 🔇 Mute 24h ]` — Restricts sending rights for 24 hours while allowing review.
  * `[ 🛡️ Whitelist Domain ]` — Whitelists the domain for the group, bypassing future blocks.
* All callback actions enforce strict Telegram administrator privilege verification.

### 4. Inline Bot Mode (`@songket_beyda_bot <link>`)
* Users can query Songket directly in any chat by typing `@songket_beyda_bot <url>`.
* Returns an interactive safety verdict card with risk levels, detection stats, and verification timestamps before sending links to groups.

### 5. Graduated Strike & Trust System
* **Dynamic Strikes**: Escalating automatic punishments for repeat offenders (3 strikes = 1h mute, 5 strikes = 8h mute, 10 strikes = 24h mute).
* **Trust Badges**: Per-user reputation indicators (`🟢 Verified`, `🟡 New Member`, `🔴 Flagged`) calculated from account age, join recency, and strike history.
* **New-Member Gate**: Optional verification gate holding new joiners in read-only mode until manual or captcha verification.

---

## 🔐 Role-Based Access & Privacy

Songket enforces strict privacy boundaries across its administrative APIs and UI:

| Role | User Identification | Group Identification | Moderation Scope |
|---|---|---|---|
| **Super Admin** | Full Username + Numeric User ID (`@username (ID: 123456789)`) | Group Title + Numeric Group ID (`Security Chat (-1001928374)`) | Global platform configuration, plan management, global domain whitelist |
| **Group Admin** | Username only (`@username`, numeric ID masked) | Group Title only (`Security Chat`, numeric ID masked) | Assigned group settings, local strike resets, group whitelist |

---

## 📊 Telegram Mini App Dashboard

The Songket Mini App provides a modern, responsive React interface accessible directly through Telegram's WebApp container:

* **Real-Time Threat Monitor**: Shows live security events, offending sender profiles, threat engines, and timestamped actions. Defaults to a clean **1-day view** with dynamic date filtering.
* **CSV Audit Export**: 1-click export of threat logs and scan history for enterprise compliance and incident reporting.
* **Trusted Domain Whitelist Manager**: Add, remove, and audit whitelisted corporate and community domains.
* **TOTP 2FA Protection**: Hardware-token & Google Authenticator TOTP protection guarding high-privilege configuration tabs.
* **Bilingual UI**: Full support for both **English** and **Khmer (ភាសាខ្មែរ)** across all dashboard modules.

---

## 🕹️ Commands & Interactive Capabilities

| Interaction | Scope | Description |
|---|---|---|
| **Menu Button** | Private Chat | Launches the Songket Mini App dashboard. |
| `/whois` *(reply or @user)* | Group | Inspects target member's trust badge, strike history, and join metadata. |
| `@songket_beyda_bot <url>` | Inline (Any Chat) | Instantly queries and shares a verified safety certificate for a link. |
| **1-Click Action Buttons** | Group Alerts | Inline buttons attached to threat alerts (`Ban`, `Mute`, `Whitelist`). |

---

## 🏗️ Deployment & Infrastructure

### Recommended Production Architecture

```
┌────────────────────────────────────────────────────────┐
│               Railway Container Service                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Python Bot Worker (bot/main.py)                 │  │
│  │  - Long-polling Telegram Bot API                 │  │
│  │  - Multithreaded message scanning pipeline       │  │
│  │  - Internal telegram-bot-api server (optional)   │  │
│  └─────────────────────────┬────────────────────────┘  │
└────────────────────────────┼───────────────────────────┘
                             │ Read / Write State
                             ▼
┌────────────────────────────────────────────────────────┐
│            Upstash Serverless Redis Cluster            │
│  - Threat logs & scan verdict cache                    │
│  - Strike counts, whitelist rules, TOTP secrets        │
└────────────────────────────▲───────────────────────────┘
                             │ Read / Write Data
┌────────────────────────────┼───────────────────────────┐
│               Vercel Serverless Platform               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React 18 Mini App (miniapp/)                    │  │
│  │  Vercel Python Serverless API (api/dashboard.py) │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuration Reference

The platform is configured via environment variables. For production deployments:

* **Railway Worker (`bot/`)**: Requires core Bot Token, Redis connection, VirusTotal API key, and admin IDs.
* **Vercel Mini App (`miniapp/` + `api/`)**: Requires Bot Token (for HMAC initData authentication), Redis connection, and Admin IDs.

> [!NOTE]
> Specific required environment variable keys and API values are detailed in the deployment instructions and should be configured directly in your Railway and Vercel project settings dashboards.

---

## 💎 Subscription & Commercial Plans

Songket operates on a flexible quota tier structure:

| Plan | Target Audience | Scans / Month | Max Groups | Log Retention |
|---|---|---|---|---|
| **Personal Free** | Individual DM Scans | 3 / day | — | — |
| **Personal Pro** | Power Users | 200 | — | — |
| **Group Starter** | Small Communities | 400 | 2 | 7 Days |
| **Group Pro** | Active Communities | 1,000 | 5 | 30 Days |
| **Group Premium** | Enterprise / High-Volume | 2,000 | 10 | 90 Days |

### Upgrades & Inquiries
To upgrade subscription tiers, request custom quotas, or activate enterprise group licenses, contact our team directly on Telegram:
👉 **[@Sin_Hong](https://t.me/Sin_Hong)**

---

## 📁 Project Directory Structure

```
NGEP-Project/
├── bot/                         # Core Python Bot Daemon (24/7 Polling Worker)
│   ├── main.py                  # Daemon entry point & polling loop
│   ├── config.py                # Environment configuration loader
│   ├── handlers.py              # Message routing, QR scans, inline queries, admin actions
│   ├── scanner.py               # VirusTotal, URLhaus, Safe Browsing, Phish heuristics
│   ├── qr_scanner.py            # Computer vision & QR extraction module
│   ├── telegram_api.py          # Telegram Bot API wrapper (inline queries, moderation)
│   ├── redis_client.py          # Upstash Redis state manager (threat events, whitelist)
│   ├── file_handler.py          # File inspection and validation pipeline
│   ├── reports.py               # Daily analytics and report aggregation
│   └── utils.py                 # URL extraction, link unwrapping, trust engine
├── api/                         # Vercel Serverless Backend
│   ├── dashboard.py             # Dashboard API endpoint (threats, whitelist, PIN auth)
│   └── common.py                # Shared Redis & auth utilities for serverless functions
├── miniapp/                     # Telegram Mini App Frontend
│   ├── src/                     # React 18 + TypeScript application
│   │   ├── admin/               # Admin dashboard views (Threats, History, Manage, TOTP)
│   │   │   ├── components/      # ThreatsView, HistoryView, ManageView, HomeView
│   │   │   ├── api.ts           # REST API client
│   │   │   └── types.ts         # TypeScript data definitions
│   │   ├── components/          # Shared UI widgets (Header, Navigation, Modals)
│   │   └── App.tsx              # Main application router
│   ├── dist/                    # Compiled production assets
│   ├── package.json             # Frontend dependencies
│   └── vite.config.ts           # Vite build configuration
├── telegram-bot-api/            # Self-hosted Telegram Bot API server setup
├── Dockerfile                   # Single combined / service container definition
├── docker-compose.yml           # Local multi-container development environment
├── vercel.json                  # Vercel deployment routing configuration
└── README.md                    # Platform documentation
```

---

## 📄 License & Intellectual Property

Proprietary — © **Songket Security Team**. All rights reserved.  
Unauthorized distribution, copying, or reverse engineering of proprietary heuristic engines is strictly prohibited.
