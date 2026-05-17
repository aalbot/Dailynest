# DailyNest Digital Ecosystem

A premium, high-performance enterprise portal designed for real-time collaboration, task management, and digital automation. Built with a modern architectural stack, it serves as a centralized hub for managing staff, attendance, products, and custom applications.

## 🏛 Architectural Overview

### 1. **Core Stack**
- **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (Powered by [Vite](https://vitejs.dev/))
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a custom Design System
- **Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix Primitives)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State & Realtime**: [Firebase Realtime Database](https://firebase.google.com/docs/database)

### 2. **Technical Pillars**

#### **📡 Real-time Synchronization Engine**
The system leverages Firebase's WebSocket-based listeners to ensure zero-latency updates across:
- **Attendance Tracking**: Live check-in/out timers and on-duty status indicators.
- **Notification System**: Instant broadcast alerts (DB + FCM) to all connected users.
- **Registry Management**: Real-time staff and app gallery configuration updates.

#### **🌍 Advanced Internationalization (i18n)**
A bespoke `LanguageContext` system that provides:
- **Multi-locale Support**: Seamless switching between **English**, **Arabic (RTL)**, and **Malayalam**.
- **Remote Overrides**: Translations are fetched from Firebase and merged with local `languages.json`, allowing admins to update UI text without code deployments.
- **Dynamic Configuration**: The portal automatically detects and injects new language packs from the project configuration.

#### **🔒 Secure Gateway & RBAC**
- **Role-Based Access Control**: Granular permissions for `Admin`, `Staff`, and `External Partner` roles.
- **Onboarding Pipeline**: A "Pending Verification" state that prevents unauthorized access until an administrator approves the signup request via the **Onboard** dashboard.
- **Session Management**: Secure storage-based authentication integrated with Firebase security rules.

#### **🧩 Modular App Gallery**
A dynamic engine that allows the portal to scale infinitely:
- **Custom Integrations**: Ability to add external tools via URL links or embedded custom HTML/JS.
- **Management Console**: Admins can create, edit, or remove applications directly from the UI with real-time propagation to all users.

## 💾 Data Layer & Firebase Configuration

The project utilizes a custom **DataProvider** abstraction layer located in `src/data/core/DataProvider.ts`. This architect-level interface decouples the UI from the raw Firebase SDK, providing a consistent, observable, and logged data flow.

### 1. **DataProvider Interface**
The `DataProvider` class provides the following core capabilities:

- **Automatic Path Normalization**: All storage paths are automatically prefixed with `root/` if not already present, ensuring data is correctly namespaced within the Firebase Realtime Database.
- **Reactive Observation (`observe`)**: Returns a subscription-based object that wraps Firebase's `onValue`. It includes built-in logging for connection states (CONNECTING/DISCONNECTING) and data ingress (INCOMING), making it easy to debug network synchronization.
- **Atomic Mutations (`update`, `remove`)**: async methods for updating or deleting specific nodes. These include comprehensive error handling and success logging.
- **Unique Key Generation (`generateKey`)**: A utility to pre-generate Firebase-compatible push keys or UUIDs for client-side optimistic UI updates.
- **One-time Fetches (`get`)**: A utility for non-reactive, asynchronous data retrieval.

### 2. **Database Schema Architecture**
The database is structured under a central `root` node with the following primary collections:
- `root/staff`: Registry of users and their assigned application permissions.
- `root/apps`: Dynamic registry for the App Gallery (both initial and custom apps).
- `root/nexus_hr`: Comprehensive HR data including employees and real-time attendance logs.
- `root/language_config`: Remote translations managed via the i18n system.
- `root/notifications`: Broadcast messages and system-wide alerts.

### 3. **Debuggable Data Flow**
Every data operation is logged to the browser console with distinctive tags (e.g., `[DataProvider]`), allowing developers to monitor:
- Which listeners are currently active.
- Exactly what data is entering the system from Firebase vs. being provided by local defaults.
- The status of write operations and potential permission errors.

## 📁 Firebase Storage & Asset Management

The project uses **Firebase Storage** for persistent hosting of binary assets (images, documents, etc.). The storage structure follows a strict hierarchy mirrored by the Realtime Database registry.

### 1. **Storage Structure Hierarchy**
Assets are organized under a central `root` namespace to maintain consistency with the database structure:
- `root/categories/`: Stores high-resolution icons and display pictures for product categories (e.g., `root/categories/CAT001.png`).
- `root/products/`: Stores inventory product images named after their unique 10-character product codes (e.g., `root/products/P001ABCDES.jpg`).
- `root/apps/`: Reserved for custom app icons and uploaded HTML assets/bundles.
- `root/staff/`: Dedicated space for staff profile pictures and identity documents.

### 2. **Asset Linking Strategy**
Instead of querying storage directly for UI rendering, the system follows a **"Link & Resolve"** pattern:
1. When a file is uploaded, it is stored in the hierarchical path mentioned above.
2. The generated **Public Download URL** is retrieved from Firebase Storage.
3. This URL is then stored as a string property (e.g., `pic`, `iconUrl`) within the corresponding Realtime Database node.
4. The UI simply consumes the URL from the database, ensuring that asset resolution is as fast as a standard JSON fetch.

### 3. **Automatic Cache Busting**
By naming files after their unique IDs (like product codes), the system ensures that updating an asset for a specific entity overwrites the old version, maintaining a clean storage environment and preventing "zombie" files.

### 4. **Firebase Storage Initialization**
Storage is initialized and exported as a singleton from `@/lib/firebase.ts`. The project supports both the modern **Modular SDK** and the **Legacy Compat SDK** to ensure full feature coverage:

```typescript
// Modular SDK (Preferred)
import { getStorage } from "firebase/storage";
const storage = getStorage(app);

// Legacy Compat SDK (Used for specific historical patterns)
import "firebase/compat/storage";
const compatStorage = firebase.storage();
```

The configuration is centrally managed in `src/config/index.ts` using the following parameters:
- **Bucket Identification**: `dailynest-2457b.firebasestorage.app`
- **Region**: Default multi-region or specific region as configured in the Firebase Console.

## 📂 Project Structure

- `src/components/`: Reusable primitive and composite UI components (SearchBar, Navbar, etc.).
- `src/contexts/`: Global state providers (Language, Theme, Notifications).
- `src/pages/`: Core application views (AppGallery, Staffes, Gateway, BackOffice).
- `src/config/`: Local configuration files and base translation dictionaries.
- `src/integration/`: Firebase listeners and third-party service integrations.
- `public/`: Static assets and Service Workers (PWA/Notifications).

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Run Development Server**:
   ```bash
   npm run dev
   ```
3. **Build for Production**:
   ```bash
   npm run build
   ```

---
*Built with ❤️ for the DailyNest Digital Ecosystem.*
# Dailynest
