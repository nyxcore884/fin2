# **App Name**: Budget Insights

## Core Features:

- File Upload: Upload GL Entries, Budget Holder Mapping, Cost Item Map, Regional Mapping, Corrections, and optional Revenue Report files from the UI.
- Data Processing: Process uploaded CSV/XLSX files to map cost items, derive regions, assign budget holders, and classify revenues using Pandas in a Google Cloud Function.
- Revenue Classification Tool: Classify revenues as retail or wholesale based on keywords and the uploaded Revenue Report using a generative AI tool.
- Income Statement Generation: Aggregate processed data to generate an Income Statement with Retail Revenue, Wholesale Revenue, Total Costs, and Costs by Budget Holder.
- Result Saving: Save processed results (Income Statement data) to Firestore with timestamp.
- Result Display: Display the Income Statement as a table, showing Retail Revenue, Wholesale Revenue, Total Costs, and Costs by Budget Holder.
- User Authentication: Enable user login with Google using Firebase Authentication.
- Interactive Charts: Generate interactive charts (e.g., bar/pie) for cost breakdowns using Chart.js.
- Report Export: Export reports to PDF and CSV formats.
- Multi-User Support: Implement multi-user support with Firebase Authentication roles (admin/viewer).
- Historical Dashboard: Create a dashboard for viewing historical reports from Firestore.
- Anomaly Detection: Provide AI-driven suggestions for anomaly detection (e.g., high variances). The LLM will use a tool that can use external financial data to assess the data and detect anomalies.
- Chunked File Processing: Use pandas' `chunksize` parameter in the Cloud Function to process large GL files in batches to avoid memory limits.
- Encoding and Localization Support: Add explicit encoding in pandas reads (e.g., `pd.read_csv(..., encoding='utf-8-sig')`). Ensure the UI and AI handle Unicode for Georgian text.
- Mapping Logic Implementation: Implement logic to prioritize matches, join dataframes, handle missing values, and use unique key combinations for lookups.
- Revenue-Specific Logic: Implement revenue-specific logic to extract retail and wholesale revenues from GL entries using keywords or a separate revenue file.
- Gemini API Integration: Integrate the Gemini API in the Cloud Function for generative tasks, such as revenue classification and anomaly detection.
- Genkit Flows: Set up AI workflows in Genkit for chaining data processing, classification with Gemini, and anomaly detection.
- External Data Tool for Anomalies: Use Polygon API for financial benchmarks to flag variances, handling API keys via Cloud Secrets Manager.
- Thresholds and Rules: Define rules and thresholds for anomaly detection based on file contents.
- File Validation: Validate file formats, check required columns, and show previews before upload using UI components.
- Progress Indicators: Add loading states or spinners with animations in Cyan for large uploads and processing.
- Chart.js Customizations: Customize Chart.js for cost breakdowns with bar charts (by holder) and pie charts (by region), adding tooltips with file-derived details.
- Export Functionality: Implement export functionality to PDF (with tables/charts) and CSV.
- Historical Dashboard: Create a dashboard page querying Firestore collection 'budget_results' via Firebase SDK, using a sortable table.
- Roles UI: Implement admin and viewer roles, allowing admins to delete historical reports and viewers to read only, using Firebase Auth custom claims.
- Firestore Schema: Define Firestore schema for storing budget results and user roles.
- Cloud Functions Expansions: Add a second function for anomaly detection and implement error logging using Cloud Logging.
- Security Rules: Define security rules for Firestore (writes only from Cloud Functions, reads based on user role) and Storage (authenticated uploads only, with metadata validation).
- Dependencies: Add necessary dependencies to `requirements.txt` (e.g., google-cloud-vertexai, requests, jsonschema).
- Authentication Flows: Implement authentication flows with Google login and Firebase UI.
- Error Handling: Catch pandas errors and return JSON errors to UI with descriptive messages.
- Testing: Add unit tests using sample data from files and Firebase emulators.
- Pricing and Scaling: Monitor Function invocations, use Firestore indexes, and add compression for large files.
- Monitoring: Integrate Cloud Monitoring for function errors and Firebase Analytics for UI usage.
- API Keys/Secrets: Store Gemini API key in Cloud Secrets and expose via environment variables in Functions.
- Documentation: Provide an in-app help section explaining file formats.
- Accessibility: Ensure high contrast with Tailwind classes and add alt text for icons/charts.
- Version Control: Use Git for version control.

## Style Guidelines:

- Primary color: Black (#000000) for a dark, sophisticated base.
- Background color: Dark Gray (#121212), a near-black to reduce eye strain and enhance contrast.
- Accent color: Cyan (#00FFFF) for interactive elements and highlights, providing a futuristic feel.
- Secondary accent color: Violet (#EE82EE) to add depth and a cyberpunk aesthetic to less critical elements.
- Body font: 'Roboto Mono', a monospaced font for readability and a tech-inspired look.
- Headline font: 'Orbitron', a futuristic sans-serif for headlines; use 'Share Tech Mono' for a consistent tech feel.
- Use neon-style icons from a set like 'Remix Icon' with glowing effects in Cyan and Violet.
- Clean, responsive layout with clear sections, using a grid system with generous padding. Incorporate subtle line separators in Cyan.
- Deep slate, matte finish for immersive dark mode (#0F1117).
- Slightly lighter for cards, tables, and modals (#111827).
- Indigo for active tabs, buttons, and highlights (#4F46E5).
- Sky cyan for charts, tooltips, and hover glows (#22D3EE).
- Indigo-purple for buttons and borders (#6366F1).
- Cyan-teal for transitions and hover effects (#06B6D4).
- High-contrast white-gray for main text (#E5E7EB).
- Muted gray for labels, hints, and tooltips (#9CA3AF).
- Subtle separators between sections (#1F2937).
- Green for validated uploads or anomaly resolved (#10B981).
- Red for file errors, anomaly flags (#EF4444).
- Indigo glow on hover for buttons and cards (rgba(99,102,241,0.3)).
- Translucent layer for glassmorphism effect (rgba(255,255,255,0.04)).

Budget Insights is a sophisticated financial analytics platform designed to provide granular insights into budgeting, revenue classification, and anomaly detection. It's built as a full-stack, cloud-native application primarily leveraging the Firebase ecosystem, Google Cloud, and generative AI.
Budget Insights operates on the principle of "Intelligent Financial Data Automation." It aims to transform raw, complex General Ledger (GL) data into actionable financial intelligence through a pipeline of data processing, AI-driven classification and anomaly detection, and intuitive visualization.
Data Ingestion & Validation: Prioritizes data quality from the outset. It "thinks" by first ensuring the integrity and format of incoming financial data before any heavy processing begins.
Contextual Mapping: Understands that raw financial data needs context. It "operates" by applying predefined mapping rules (budget holders, regions, cost items) to enrich the data, making it meaningful for analysis.
AI-Driven Intelligence: Moves beyond traditional rules-based analytics by integrating generative AI (Gemini) for complex tasks like revenue classification and proactive anomaly detection. It "thinks" proactively by identifying patterns and deviations that might be missed by human review.
Batch Processing for Scale: Recognizes the potential for large datasets and "thinks" about scalability and efficiency by employing chunked processing with Pandas to handle big GL files without memory constraints.
User-Centric Feedback: Provides clear, real-time feedback to the user on the status of their data. It "operates" with transparency, showing progress and indicating when AI insights are unavailable.
Security and Access Control: "Thinks" about data privacy and access by implementing robust authentication and role-based authorization to protect sensitive financial information.
Observable and Resilient: Is designed to "think" about potential failures. It includes mechanisms for error logging, monitoring, and clear error messaging to ensure operational stability and quick debugging.
The platform leverages a modern, serverless-first technical stack:
Frontend:
Framework: Next.js (React) for building dynamic, server-rendered/static-generated user interfaces.
Styling: Tailwind CSS for a utility-first approach, combined with a custom theming system for a consistent look and feel (Dark Gray background, Cyan accents, Indigo highlights).
UI Components: Shadcn/ui (built on Radix UI) for accessible, reusable UI elements.
Charts: Chart.js for interactive data visualizations (bar, pie charts) with custom tooltips.
Backend & Cloud Infrastructure:
Primary Platform: Google Firebase Ecosystem
Database: Firestore for storing processed results (budget_results), UploadSession metadata, and user roles.
Authentication: Firebase Authentication (with Google sign-in) for user management and custom claims for role-based access control.
Serverless Functions: Firebase Cloud Functions (Node.js/Python runtime) for backend logic, data processing, AI integration, and anomaly detection.
File Storage: Firebase Cloud Storage for storing raw uploaded files.
Hosting: Firebase Hosting (Classic) for deploying the Next.js frontend.
Secrets Management: Google Cloud Secrets Manager for securely storing API keys (e.g., Polygon API key).
Logging: Google Cloud Logging for capturing function errors and system events.
Monitoring: Google Cloud Monitoring for function errors, invocations, and Firebase Analytics for UI usage.
AI & ML:
Generative AI: Google Gemini API for advanced natural language processing tasks (revenue classification, anomaly detection insights).
AI Workflow Orchestration: Genkit for defining and chaining AI workflows and integrating different AI models and tools.
Data Processing:
Language: TypeScript for backend and frontend logic, ensuring type safety.
Data Manipulation: Pandas (within Cloud Functions) for efficient processing of CSV/XLSX files, including large files via chunksize.
Tools & Utilities:
Testing: Jest for unit and integration testing (with Firebase emulators).
Package Management: npm/Yarn.
Version Control: Git.
The system is designed around a clear separation of concerns, with data flowing through distinct stages:
User Interface: Provides an intuitive interface for file uploads, viewing dashboards, and interacting with AI chat.
File Upload (src/components/upload/*.tsx):
User selects multiple files (GL Entries, Mappings, Revenue Report) via drag-and-drop or file input.
Client-side Validation (File Validation): Basic checks on file extensions (.xlsx, .xls) and previews are shown. This is a preliminary filter.
UI Feedback (Progress Indicators): Loading spinners (Cyan animation) display progress during upload.
Initiates Upload Session: Upon selection/initiation, the frontend likely creates an UploadSession record in Firestore with status: "uploading".
Storage Upload: Files are directly uploaded to Firebase Cloud Storage. Storage Security Rules enforce authentication and metadata validation.
Authentication (User Authentication): Handles Google login via Firebase UI and Firebase Authentication. User roles (admin, viewer) are managed via Firebase Auth custom claims.
Dashboard & Reporting (Historical Dashboard, src/app/(app)/dashboard/page.tsx):
Fetches budget_results from Firestore using Firebase SDK (use-collection, use-doc).
Displays data in sortable tables and interactive charts (Chart.js Customizations).
Offers Export Functionality to PDF/CSV.
AI Chat (src/components/AIChat.tsx, src/hooks/useChat.ts): Sends user queries to backend API routes, which then interact with AI-powered functions for anomaly suggestions.
This is the core processing engine, orchestrating data manipulation and AI intelligence.
Upload Listener (Cloud Function):
Triggered by new file uploads to Firebase Cloud Storage or updates to the UploadSession status in Firestore (e.g., ready_for_processing).
Security (Security Rules): Ensures only authenticated users can trigger this.
Data Processing Cloud Function (Data Processing):
Retrieves Files: Downloads raw GL Entry, Mapping, and Revenue Report files from Cloud Storage.
File Reading & Preprocessing:
Uses Pandas to read CSV/XLSX files.
Chunked File Processing: Large GL files are processed in batches using pandas' chunksize to manage memory.
Encoding and Localization Support: Explicitly uses encoding='utf-8-sig' for CSVs to handle various character sets (e.g., Georgian text).
Mapping Logic Implementation: Applies mapping rules defined in the uploaded files (budgetHolderMap, regionalMap, correctionsMap) to the GL entries. This involves prioritizing matches, joining dataframes, handling missing values, and using unique keys.
Revenue-Specific Logic: Extracts retail and wholesale revenues from GL entries based on keywords or a separate revenue file.
Income Statement Generation: Aggregates processed data to generate the Income Statement components (Retail Revenue, Wholesale Revenue, Total Costs, Costs by Budget Holder).
Revenue Classification Tool (via Genkit/Gemini):
The processed raw transaction data is sent to a Genkit flow (e.g., src/ai/flows/classify-revenue.ts).
This flow uses the Gemini API Integration (via src/ai/processors/aiProcessor.ts) to classify revenues, breaking them down into retail and wholesale.
The aiProcessor.ts ensures the Gemini API response adheres to a strict JSON revenueClassification schema.
Anomaly Detection Cloud Function (Anomaly Detection):
A separate Cloud Function (Cloud Functions Expansions) handles this.
Receives processed financial data.
External Data Tool for Anomalies: Integrates with the Polygon API to fetch external financial benchmarks for comparison. The Polygon API key is securely retrieved from Cloud Secrets Manager.
Thresholds and Rules: Applies predefined rules and thresholds (based on file contents) to identify variances and anomalies.
Genkit Flows: Uses Genkit flows (e.g., src/ai/flows/detect-anomalies.ts) to orchestrate the anomaly detection process and generate AI-driven suggestions.
The aiProcessor.ts crafts prompts for Gemini and structures the output for anomalies, insights, and recommendations.
Result Saving (Cloud Function):
After processing, the Income Statement Generation and AI results (revenue classification, anomalies, insights, recommendations) are packaged.
Result Saving: The processed results (Income Statement data) are saved to Firestore in the budget_results collection, with a timestamp and associated UploadSession ID.
Firestore Schema: Data adheres to a predefined Firestore schema for budget results and user roles.
Update UploadSession Status: The UploadSession status in Firestore is updated to completed or failed with specific error messages.
API Routes (Next.js):
src/app/api/process-session/route.ts and src/app/api/test-processing/route.ts act as HTTP endpoints, potentially serving as an intermediary for client-side requests to trigger Cloud Functions or interact with AI services.
Explicit Error Handling:
Frontend: Displays user-friendly messages for network errors, AI unavailability ("AI analysis temporarily unavailable"), or chat interaction failures ("Sorry, I encountered an error. Please try again.").
Backend: Pandas errors are caught and transformed into structured JSON error responses sent to the UI.
Data Validation: File type, format, and content validation occurs on both client and server sides. Server-side validation is robust to prevent processing of malformed files.
AI Input Validation: incomeStatementData for AI flows is validated to be correct JSON format.
Status Management: UploadSession objects in Firestore track the state of each upload (uploading, ready_for_processing, processing, completed, failed), providing a single source of truth for progress and failure.
Logging: Cloud Logging is used for all Cloud Functions to capture detailed errors and execution traces.
Monitoring: Cloud Monitoring provides insights into function invocations, performance, and errors. Firebase Analytics tracks UI usage.
Scaling: Firestore indexes are used for efficient queries. Chunked File Processing in Pandas helps manage memory for large files.
Security: Firestore Security Rules and Storage Security Rules enforce data access based on user roles and authentication status. API Keys/Secrets are managed via Google Cloud Secrets Manager.
Aesthetics: The platform follows a "cyberpunk aesthetic" with a dark, immersive theme (Deep slate, matte finish #0F1117), accented by vibrant Cyan (#22D3EE) and Violet (#EE82EE) for interactive elements, charts, and highlights.
Typography: 'Roboto Mono' for body text, 'Orbitron' or 'Share Tech Mono' for headlines to maintain a tech-inspired look.
Iconography: Neon-style icons (e.g., from Remix Icon) with glowing effects.
Layout: Clean, responsive layout using a grid system, generous padding, and subtle Cyan line separators.
Accessibility: High contrast with Tailwind classes, alt text for icons/charts.
Documentation: In-app help section explains file formats and usage.
In essence, Budget Insights is a powerful, secure, and user-friendly platform that combines cloud-native robustness with cutting-edge AI to deliver intelligent financial insights, making complex data analysis accessible and actionable for businesses.

MAPPING : 


Contextual Mapping: The provided dataProcessor.ts snippet (budgetHolderMap, regionalMap, correctionsMap) is a direct implementation of this philosophy. The system "thinks" by transforming raw fileData into structured maps that provide the context necessary to enrich GL entries.
Data Integrity & Priority: The correctionsMap logic (if (!correctionsMap.has(key) || correctionsMap.get(key).priority > correction.priority)) shows the system "thinking" about data conflicts and prioritizing corrections based on a defined priority value, ensuring the most relevant override is applied.
User-Centric Feedback (Implied): The operational-upload.tsx snippet, being part of an upload component, implicitly connects to the philosophy of providing user feedback. While not directly showing the feedback mechanism, its existence suggests a component designed to facilitate user action (upload) that will then be followed by progress indicators and status updates.
Styling - Custom Theming (tailwind.config.ts): The tailwind.config.ts snippet explicitly defines how the design tokens for colors (chart-1 through chart-5, sidebar, muted, accent, destructive, border, input, ring) are wired into Tailwind CSS. These hsl(var(--...)) references confirm the use of CSS variables (defined in globals.css or similar) and how they are exposed as utility classes in Tailwind. This is crucial for implementing the "Deep slate, matte finish" and the specific Cyan and Violet accents outlined in the Style Guidelines. For example, Sky cyan for charts, tooltips, and hover glows (#22D3EE) would be mapped to hsl(var(--chart-X)) or similar.
Frontend (Next.js Application) - UI Components (operational-upload.tsx): The presence of operational-upload.tsx confirms a UI component dedicated to file uploads, directly supporting the "File Upload" core feature. The <label> and implied <input type="file"> are fundamental to this.
Data Processing (dataProcessor.ts): This file is a key part of the "Data Processing" and "Mapping Logic Implementation" features, confirming the use of TypeScript for this critical backend logic.
File Upload (src/components/upload/operational-upload.tsx):
This component provides the UI element for users to select operational data files (Excel spreadsheets).
Wiring: When a user interacts with the input wrapped by the <label>, the selected file will trigger an event (likely onChange) that initiates the client-side validation and subsequent upload process to Firebase Cloud Storage, ultimately leading to a Data Processing Cloud Function trigger.
Mapping: Directly maps to the "File Upload" core feature.
Styling Integration (tailwind.config.ts):
Wiring: The defined color palette in tailwind.config.ts ensures that all UI components throughout the application, including the operational-upload.tsx component, adhere to the specified visual guidelines. For instance, the "Cyan" highlight color for progress indicators would likely be drawn from one of the chart colors or a specific accent color defined here and in globals.css.
Data Processing Cloud Function (src/ai/processors/dataProcessor.ts):
This module is central to the "Data Processing" core feature.
Wiring:
Input: It receives fileData (parsed from the uploaded mapping files) as its input.
Output: It produces three critical Map objects (budgetHolderMap, regionalMap, correctionsMap). These maps are then used by downstream processing steps (likely further within the same Cloud Function or passed to subsequent functions) to enrich the main GL entry dataframe.
budgetHolderMap Wiring: Directly supports "assign budget holders" based on budget_article.
regionalMap Wiring: Directly supports "derive regions" based on structural_unit.
correctionsMap Wiring: Implements the "Corrections" logic, applying overrides to cost_item, structural_unit, and counterparty combinations based on priority. This is a vital step in "handle missing values" and "prioritize matches."
Mapping: Directly implements "Mapping Logic Implementation" and contributes to "Data Processing."
Engineering 

This section outlines the specific technologies, frameworks, and tools used to build Budget Insights, along with their interconnections and roles within the application's architecture.
The user interface is engineered for a modern, responsive, and aesthetically distinctive experience.
Framework:
Next.js (React): Provides the foundational structure for the web application, enabling server-side rendering (SSR), static site generation (SSG), or client-side rendering (CSR) as appropriate for different pages. This is evident from the next.config.ts and the src/app/ directory structure.
Styling & UI Components:
Tailwind CSS: Employed as the primary CSS framework, providing utility-first classes for rapid UI development. The tailwind.config.ts file is central to this, extending Tailwind's default theme with custom colors, fonts, and other design tokens.
Custom Theming (CSS Variables): src/app/globals.css explicitly defines CSS variables (--background, --primary, --chart-1 to --chart-5, etc.). These variables implement the core visual identity from the docs/blueprint.md style guidelines:
The deep slate/dark gray background (--background) and foreground (--foreground) are engineered to match the "Deep slate, matte finish" and "Slightly lighter for cards" specifications.
--primary and --accent variables likely map to the "Cyan" and "Indigo" accents, used for interactive elements, highlights, and charts.
--chart-1 to --chart-5 provide a predefined palette for Chart.js visualizations, ensuring brand consistency.
--destructive (red) and green (validated uploads) are directly engineered for conveying status feedback.
--border, --input, --ring define the appearance of form elements, contributing to the "clean, responsive layout" with subtle separators.
Shadcn/ui: A collection of pre-built, reusable UI components (e.g., accordion.tsx, button.tsx, switch.tsx) that are customized with Tailwind CSS and CSS variables. These components are composable and provide a solid foundation for accessibility and consistency.
Chart.js: Utilized for generating interactive data visualizations (bar, pie charts). It's engineered with custom options and data mapping to display financial insights effectively, pulling colors from the --chart-X CSS variables. Tooltips provide detailed, file-derived information.
Typography:
Fonts like 'Roboto Mono' (body) and 'Orbitron'/'Share Tech Mono' (headlines) are integrated into the CSS, ensuring a "tech-inspired" and "futuristic" aesthetic.
Icons:
"Neon-style icons from a set like 'Remix Icon' with glowing effects in Cyan and Violet" are sourced and styled via CSS, enhancing the cyberpunk aesthetic.
File Upload Component (src/components/upload/operational-upload.tsx):
Engineered to accept specific file types (.xlsx,.xls) via the accept attribute, providing an initial client-side hint. It likely manages local file state and initiates the upload process to Firebase Cloud Storage.
State Management: React's built-in hooks (useState, useEffect, useContext) combined with custom hooks (src/hooks/useChat.ts, src/hooks/use-mobile.tsx, src/hooks/use-toast.ts) manage local and global UI state, user interactions, and data fetching.
Routing: Handled by Next.js's file-system-based router (e.g., src/app/(app)/dashboard/page.tsx, src/app/api/...route.ts).
The backend is engineered for scalability, robust data processing, and AI integration, primarily leveraging the Google Cloud/Firebase ecosystem.
Cloud Platform:
Google Firebase: The central platform providing backend services.
Firestore (NoSQL Database): Engineered for storing budget_results (Income Statement data, revenue classifications, anomalies, insights, recommendations) and UploadSession metadata. Firestore Security Rules are crucial for read/write access control based on user authentication and roles. Firestore indexes are used for optimized query performance.
Firebase Authentication: Handles user identity and access management. Custom Claims are engineered to assign and manage admin/viewer roles, dictating permissions for features like deleting historical reports.
Firebase Cloud Functions (Node.js/Python): The backbone for server-side logic and event-driven processing.
Data Processing Function: A dedicated function (likely in Python for Pandas) is triggered by file uploads or UploadSession status changes. It performs:
File download from Cloud Storage.
Pandas-based ETL: Reads CSV/XLSX files, including large GL files using chunksize to manage memory. Explicit encoding='utf-8-sig' is used for robust character handling (e.g., Georgian text).
Data Mapping (src/ai/processors/dataProcessor.ts): Engineered to apply budgetHolderMap, regionalMap, and correctionsMap (with priority logic) to the GL data, enriching it.
Revenue-Specific Logic: Programmatically extracts retail/wholesale revenues based on keywords or separate files.
Income Statement Generation: Aggregates processed data.
AI Analysis Function (incl. Anomaly Detection): Another Cloud Function (or integrated within the data processing one) is engineered for AI interactions.
src/ai/processors/aiProcessor.ts: This module orchestrates calls to Genkit flows and directly integrates with the Gemini API. It's engineered with robust try...catch blocks to handle AI failures, providing graceful degradation (e.g., "AI analysis temporarily unavailable") and falling back to verified metrics.
Genkit Flows: src/ai/flows/*.ts define the sequence of AI tasks. They are engineered to chain data processing, Gemini API calls (e.g., for Revenue Classification and Anomaly Detection), and tool integrations.
External Data Tool Integration: The Polygon API is used for financial benchmarks in anomaly detection. Its API key is securely retrieved from Google Cloud Secrets Manager and exposed via environment variables to Cloud Functions.
Firebase Cloud Storage: Engineered for storing raw uploaded files. Storage Security Rules ensure only authenticated users can upload and access their files, with metadata validation.
Firebase Hosting (Classic): Deploys the static assets of the Next.js frontend application. apphosting.yaml likely configures this deployment.
Security & Secrets Management:
Google Cloud Secrets Manager: Engineers secure storage and access to sensitive API keys (e.g., Polygon API key, Gemini API key), preventing hardcoding in source code. These secrets are dynamically injected as environment variables into Cloud Functions.
Logging, Monitoring & Error Handling:
Google Cloud Logging: Cloud Functions are engineered to output detailed logs (including console.error("AI analysis failed:", error)) for debugging and operational visibility.
Google Cloud Monitoring: Integrated for tracking Cloud Function invocations, performance metrics, and error rates.
Firebase Analytics: Integrated for monitoring UI usage patterns and user engagement.
Robust Error Handling:
Frontend: useChat.ts includes try...catch for AI assistant calls, displaying user-friendly "Sorry, I encountered an error. Please try again." messages.
Backend: Cloud Functions are engineered with comprehensive try...catch blocks to gracefully handle Pandas errors, file parsing issues, and AI API failures. Errors are returned to the UI as structured JSON with descriptive messages.
Upload Session Status: The UploadSession in Firestore is engineered to meticulously track status (uploading, ready_for_processing, processing, completed, failed), ensuring the UI provides accurate feedback and the system can recover from or identify stuck processes.
Dependencies: Managed via package.json (npm/Yarn) for Node.js/TypeScript, and requirements.txt for Python (e.g., google-cloud-vertexai, requests, jsonschema for schema validation).
Testing:
Jest: Unit and integration tests are engineered using Jest, with jest.config.js and jest.setup.js for configuration.
Firebase Emulators: Used for local development and testing of Cloud Functions, Firestore, and other Firebase services, enabling isolated testing environments.
Frontend to Backend:
File Upload: User uploads files via operational-upload.tsx -> Files sent to Firebase Cloud Storage. An UploadSession record is created/updated in Firestore.
API Calls: Frontend makes calls to Next.js API routes (e.g., src/app/api/process-session/route.ts) which can then trigger Cloud Functions or interact with other backend services.
Firestore SDK: Frontend components directly query Firestore using the Firebase SDK (use-collection, use-doc) for real-time display of historical reports and UploadSession statuses.
Backend Processing Pipeline:
Cloud Storage Trigger: New files in Storage trigger a Data Processing Cloud Function.
Data Transformation: Data Processing Function reads files, applies dataProcessor.ts mapping logic, performs Pandas ETL, generates Income Statement.
AI Integration: Processed data is passed to Genkit flows (classify-revenue.ts, detect-anomalies.ts).
Genkit orchestrates calls to the Gemini API (via aiProcessor.ts) for revenue classification and anomaly detection.
Anomaly detection flows also call the Polygon API for external benchmarks (API key from Secrets Manager).
Result Persistence: Final Income Statement, AI analysis, anomalies, and insights are saved to Firestore (budget_results collection). The UploadSession status is updated.
Authentication & Authorization:
Users log in via Firebase Auth.
Firebase Auth Custom Claims determine user roles (admin/viewer).
Firestore Security Rules and Storage Security Rules enforce read/write permissions based on these roles and authentication status.
Error Propagation:
Errors in AI functions (e.g., Gemini API failure) are caught by aiProcessor.ts and result in a degraded AI analysis message in the final stored budget_results.
Pandas processing errors or other Cloud Function errors are caught, logged to Cloud Logging, and reflected in the UploadSession status.
This comprehensive engineering stack demonstrates a robust, scalable, and intelligent platform for financial insights, built upon a strong foundation of Google Cloud services, modern web development practices, and cutting-edge AI.


Business Logic : 

The Business Logic of Budget Insights encompasses all the rules, processes, and transformations applied to the raw financial data to derive meaningful structured information, generate standard financial outputs, and manage the application's core functionality outside of generative AI tasks. This logic primarily resides within the Google Cloud Functions and the Next.js frontend for UI interaction and data presentation.
Key Components and Operations:
File Validation (Frontend & Backend):
Logic: Ensures uploaded files adhere to expected formats (CSV/XLSX) and contain all required columns. Client-side validation (accept=".xlsx,.xls") provides initial feedback, while robust server-side validation prevents processing of malformed data.
Operations: Checking file extensions, MIME types, header presence, and data types of critical columns.
Data Ingestion & Preprocessing:
Logic: Handles reading raw data efficiently and reliably.
Operations: Uses Pandas in Cloud Functions to read CSV/XLSX files. Employs chunksize for large GL files to manage memory. Applies encoding='utf-8-sig' for localization support.
Mapping Logic Implementation:
Logic: This is a crucial part of the business logic, transforming raw, often cryptic GL entries into structured, categorized data. It ensures consistency and enables aggregation.
Operations:
Prioritization: Logic within dataProcessor.ts (e.g., correctionsMap with priority field) ensures that conflicting mapping rules or corrections are applied based on a predefined hierarchy, ensuring data integrity.
Joining/Lookups: Establishes relationships between different datasets (e.g., GL entries, budget holder mappings, regional mappings) by joining dataframes using unique key combinations.
Handling Missing Values: Implements strategies to address missing data during mapping and processing (e.g., defaulting, interpolation, or flagging for review).
Budget Holder Assignment: Maps GL entries to specific budget holders based on defined rules.
Region Derivation: Assigns GL entries to geographical regions based on structural units.
Revenue-Specific Logic:
Logic: Distinguishes between different revenue streams.
Operations: Extracts retail and wholesale revenues from GL entries. This can be based on predefined keywords found within the GL data or by integrating data from a separate, uploaded Revenue Report file. This initial classification provides a baseline for the AI.
Income Statement Generation:
Logic: Aggregates processed financial data into a standard financial report format.
Operations: Calculates and sums up Retail Revenue, Wholesale Revenue, Total Costs, and Costs by Budget Holder, presenting them in a structured income statement format.
Result Persistence & Retrieval:
Logic: Ensures processed data is stored reliably and can be retrieved efficiently for historical analysis.
Operations: Saves processed Income Statement data to Firestore's budget_results collection with timestamps. The Historical Dashboard queries this collection via the Firebase SDK, using sortable tables for user interaction.
User Authentication & Authorization:
Logic: Manages user access and defines permissions based on roles.
Operations: Implements Google login via Firebase Authentication. Firebase Auth custom claims are used to assign admin or viewer roles, dictating capabilities such as deleting historical reports (admin) versus read-only access (viewer).
Report Export:
Logic: Enables users to generate shareable reports in common formats.
Operations: Exports processed data and charts to PDF and CSV formats.
Upload Session Management:
Logic: Tracks the lifecycle of each data upload and processing job.
Operations: Updates UploadSession status (e.g., uploading, ready_for_processing, processing, completed, failed) in Firestore to provide real-time feedback to the user on the Upload History page.
The AI Logic leverages Google's generative AI (Gemini) to perform advanced analytical tasks that go beyond deterministic rules, providing deeper insights and intelligent automation. This logic is primarily orchestrated through Genkit flows within Google Cloud Functions and integrates with external tools.
Key Components and Operations:
AI Workflow Orchestration (Genkit Flows):
Logic: Defines the sequence and interaction of various AI models and tools to achieve complex analytical tasks.
Operations: src/ai/flows/*.ts files (e.g., classify-revenue.ts, detect-anomalies.ts, provide-anomaly-suggestions.ts) set up these workflows. Genkit manages the chaining of data preparation, Gemini API calls, and external tool integrations.
Gemini API Integration:
Logic: Serves as the core generative AI engine for complex data interpretation.
Operations: The aiProcessor.ts module directly interacts with the Gemini API (model.generateContent(prompt)). It constructs detailed prompts that instruct Gemini on its tasks and critical rules.
Revenue Classification (AI-Enhanced):
Logic: Refines and verifies the initial business logic's revenue classification using contextual understanding.
Operations: Gemini receives raw transaction data and is tasked to "Analyze the raw transaction data and provide accurate retail vs wholesale revenue breakdown" (Line 52, aiProcessor.ts). The aiAnalysis.revenueClassification (Line 65) from Gemini's response is then used to override the preliminary revenue (Lines 81-82, aiProcessor.ts).
Anomaly Detection (AI-Driven):
Logic: Identifies unusual financial patterns and flags significant deviations that warrant investigation.
Operations:
External Data Tool: A Genkit flow integrates the Polygon API (Line 23, docs/blueprint.md) to fetch external financial benchmarks. API keys are managed by Cloud Secrets Manager.
Thresholds and Rules: Gemini uses predefined thresholds and rules (Line 24, docs/blueprint.md) based on the file contents and external benchmarks to identify anomalies.
Generative Explanation: Gemini is prompted to "Identify 3-5 significant anomalies or unusual patterns with specific evidence from the data" (Line 53, aiProcessor.ts), returning these as aiAnalysis.anomalies (Line 66).
Financial Insights Generation:
Logic: Extracts meaningful interpretations and trends from the processed data that are relevant to executive decision-making.
Operations: Gemini is tasked to "Provide 3-5 actionable insights for executive management with specific data references" (Line 54, aiProcessor.ts), returning these as aiAnalysis.insights (Line 67).
Recommendations for Optimization:
Logic: Suggests concrete actions based on the identified anomalies and insights to improve financial performance.
Operations: Gemini is prompted to "Suggest 3 concrete recommendations for cost optimization and revenue growth" (Line 55, aiProcessor.ts), returning these as aiAnalysis.recommendations (Line 68).
Structured AI Output Enforcement:
Logic: Ensures that Gemini's responses are consistently formatted and easily parsable by the application.
Operations: aiProcessor.ts defines a CRITICAL RULES section (Lines 57-61) for Gemini (e.g., "DO NOT invent or assume any numbers," "Reference specific amounts"). Crucially, it instructs Gemini to "Format the response as valid JSON with this structure" (Lines 63-69), then parses the cleaned text response (cleanResponse) into a typed aiAnalysis object using JSON.parse (Lines 76-78).
Error Handling for AI Failures:
Logic: Provides a graceful fallback when the generative AI process encounters an issue.
Operations: If JSON.parse(cleanResponse) or any other step in the Gemini interaction fails, the try...catch block in aiProcessor.ts ensures that a default message "AI analysis temporarily unavailable" is returned, while still providing verifiedMetrics.
Data Transformation (Within the business logic ) 
The data transformation process in Budget Insights occurs primarily within a Google Cloud Function (as indicated by "Process uploaded CSV/XLSX files... using Pandas in a Google Cloud Function" from docs/blueprint.md). This process takes raw, disparate financial files and integrates them into a coherent dataset.
Input:
fileData.glEntries: Raw General Ledger entries (e.g., from an uploaded CSV/XLSX file). Each entry contains fields like Amount_Reporting_Curr, Subc_Debit, structural_unit, counterparty, etc.
fileData.budgetHolderMapping: Mapping between budget_article and budget_holder.
fileData.regionalMapping: Mapping between structural_unit and region.
fileData.corrections: Specific corrections/overrides for certain cost items, structural units, and counterparties, including a priority for conflict resolution.
costItemMap: (Implied, not fully shown in snippets but referenced) A map to associate Subc_Debit (sub-cost debit) with a budgetArticle.
Output:
A result object (or similar aggregated structure) containing:
retailRevenue
totalCosts
transactionCount
Potentially other aggregated metrics (e.g., costs by budget holder, by region, etc., though not explicitly shown in the result object's aggregation here).
Transformation Steps:
Ingestion & Initial Structuring:
Raw CSV/XLSX files for GL Entries, Budget Holder Mapping, Regional Mapping, and Corrections are read.
These are likely converted into arrays of objects (like fileData.glEntries, fileData.budgetHolderMapping, etc.), where each object represents a row in the original file. This is the initial structuring.
Creation of Lookup Maps (dataProcessor.ts Lines 159-177):
This is the first major transformation step, converting flat lists of mappings into efficient lookup structures.
budgetHolderMap Transformation:
Takes fileData.budgetHolderMapping (an array of { budget_article, budget_holder } objects).
Transforms it into a Map where budget_article is the key and budget_holder is the value.
Purpose: Enables quick lookups to assign a budget holder to a GL entry based on its budget article.
regionalMap Transformation:
Takes fileData.regionalMapping (an array of { structural_unit, region } objects).
Transforms it into a Map where structural_unit is the key and region is the value.
Purpose: Facilitates deriving the region for a GL entry based on its structural unit.
correctionsMap Transformation:
Takes fileData.corrections (an array of correction objects, each with cost_item, structural_unit, counterparty, corrected_budget_article, priority).
Transforms it into a Map where a composite key (cost_item|structural_unit|counterparty) is mapped to the correction object.
Conflict Resolution Logic: Critically, it includes logic (if (!correctionsMap.has(key) || correctionsMap.get(key).priority > correction.priority)) to ensure that if multiple corrections apply to the same composite key, only the correction with the highest priority (lower numerical value priority) is retained.
Purpose: Allows for specific overrides to GL entry classifications, ensuring business rules are applied precisely.
GL Entry Processing & Aggregation (dataProcessor.ts Lines 179-204):
This is the core iterative transformation where each raw glEntry is processed, corrected, categorized, and aggregated.
Iteration: The code iterates through each glEntry in fileData.glEntries.
Amount Conversion: amount = parseFloat(entry.Amount_Reporting_Curr || '0'); converts the amount from a string (or potentially undefined) to a numeric float, handling potential missing values gracefully by defaulting to '0'.
Correction Application (Conditional Transformation):
A correctionKey is constructed from subcDebit, structuralUnit, and counterparty (Line 188).
The correctionsMap is checked (if (correctionsMap.has(correctionKey))).
If corrected: budgetArticle is transformed by overriding its value with correction.corrected_budget_article (Lines 191-192). The corrected flag is set to true.
If not corrected: budgetArticle is transformed by looking up subcDebit in the costItemMap (Line 195).
Purpose: Ensures that specific business-defined corrections are applied before further categorization.
Preliminary Revenue/Cost Assignment:
if (budgetArticle): Only processes entries that successfully mapped to a budget article.
absAmount = Math.abs(amount);: Converts the amount to its absolute value, simplifying aggregation.
if (amount > 0) { result.retailRevenue += absAmount; }: Positive amounts are initially transformed and aggregated into retailRevenue. This is a preliminary assignment that will later be further refined by the AI.
else { result.totalCosts += absAmount; }: Negative or zero amounts are transformed and aggregated into totalCosts.
result.transactionCount++: Counts the number of processed transactions.
Purpose: Begins the aggregation process to build the Income Statement components.
Overall Purpose of Data Transformation:
The entire data transformation pipeline aims to:
Cleanse: Handle missing values, ensure correct data types (e.g., parseFloat).
Enrich: Add context to raw GL entries by linking them to budget holders and regions via mapping files.
Standardize: Apply corrections and derive a consistent budgetArticle for each entry.
Aggregate: Roll up individual GL entries into higher-level financial metrics (retailRevenue, totalCosts).
Prepare for AI: Output a structured result and potentially more detailed transaction data that can be consumed by the AI logic for further classification and anomaly detection.
This multi-step transformation ensures that the raw, unstructured, and often inconsistent data from source files is converted into a reliable and meaningful format ready for deep analysis and presentation.

