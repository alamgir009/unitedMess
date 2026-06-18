# UnitedMess — Online Mess Management System

> **Live:** [https://unitedmess.uk](https://unitedmess.uk)

> Enterprise-grade digital ecosystem purpose-built for streamlining communal dining operations in hostels, mess halls, and shared living communities. End-to-end automation of meal management, procurement tracking, intelligent billing, multi-channel payment processing, real-time communications, and administrative governance.

---

## Overview

UnitedMess is a comprehensive digital platform engineered to transform the way shared dining communities operate. It replaces fragmented manual processes with a unified, real-time system that manages the complete lifecycle of mess operations — from daily meal logging and grocery procurement to automated invoice generation, multi-channel payment collection, and stakeholder notifications.

At its core, the platform is architected with fintech-grade rigor: every financial transaction carries a full audit trail, payment verification is race-condition-safe through atomic database operations, billing is fully automated via scheduled cron jobs, and notifications are delivered across email, SMS, push, and in-app channels with idempotency guarantees. Role-based access control ensures that members, administrators, and system operators each interact with precisely the data and actions relevant to them.

The result is a zero-paperwork, transparent, and auditable ecosystem that eliminates manual calculation errors, reduces administrative overhead, and provides all stakeholders with real-time visibility into financial and operational status.

---

## Key Features

- **Member Management** — Email verification, admin approval workflow, role-based access (admin/user), profile management with avatar upload, account lockout on failed login attempts
- **Meal Tracking** — Daily meal logging (Day/Night/Both/Off), guest meal tracking, bulk operations for admins, meal polling for future planning
- **Market (Grocery) Management** — Daily purchase logging with receipt images, monthly duty schedule generation with round-robin assignment
- **Multi-Channel Payments** — Razorpay (cards/UPI/netbanking), manual UPI with QR code and UTR verification, cash payments — all with full audit trail
- **Automated Billing Engine** — Dynamic meal rate calculation, configurable fixed costs (cooking, water, gas, platform fee), cron-based monthly invoice finalization on the 11th
- **Real-Time Notifications** — In-app, Socket.IO, web push (VAPID), Firebase Cloud Messaging, email (SMTP), and SMS — with idempotent delivery and priority levels
- **PDF Invoice Generation** — Server-side (PDFKit) and client-side (jsPDF) with identical professional layouts
- **Admin Dashboard** — Member directory, unresolved bills, system settings, payment verification, aggregation-driven analytics

---

## Technology Stack

- **Frontend:** React 18, Vite 5, Redux Toolkit, Tailwind CSS, React Router, Axios, Socket.IO Client, Framer Motion, Recharts
- **Backend:** Node.js, Express 4, MongoDB + Mongoose 8, JWT + bcryptjs, Socket.IO, Razorpay SDK, Cloudinary, Firebase Admin, Nodemailer, PDFKit, Winston, node-cron
- **DevOps:** Docker, GitHub Actions CI/CD, Oracle Cloud VM, Cloudflare (CDN + DNS + DDoS protection)

---

## Benefits

### For Members
- Zero paperwork — all meal logs, market entries, and payments tracked digitally
- Real-time dashboard with meal count, market spend, and payable amount
- Pay via Razorpay, UPI, or cash
- Instant notifications for invoices, payment confirmations, and announcements
- Download or receive email with professionally formatted PDF invoices
- Self-service profile, history, and password management

### For Administrators
- Automated cron-based billing eliminates manual errors
- Approve/deny registrations, bulk status updates, search members
- Verify UPI payments, record cash, full audit trail for every transaction
- Dynamically configure guest meal charge, cooking charge, water/gas/platform fees
- Aggregation-driven analytics for informed decision-making
- Auto-generate round-robin grocery duty schedules

### For Developers
- Clean layered architecture (routes → controllers → services → models)
- Shared business logic (billing period) consumed by both frontend and backend
- Idempotent design for safe payment and notification retries
- Atomic operations preventing race conditions in payment verification
- Full payment audit trail with identity and timestamp
- Automated CI/CD pipeline with Docker support

---

*Built with Node.js, Express, React, MongoDB, and a lot of chai.*
