# Duplicate Profile Detector

## Overview
The Duplicate Profile Detector is a healthcare data management solution designed to identify, review, and merge duplicate patient profiles in medical databases. It leverages AI-powered logic and manual review workflows to ensure data integrity and reduce errors caused by duplicate records.

## Features
- **Automated Duplicate Detection:** Uses advanced algorithms to scan patient records and flag potential duplicates.
- **Manual Review & Merge:** Provides an intuitive UI for users to manually review and merge duplicate profiles.
- **Reasoning & Audit Trail:** Displays reasoning for detected duplicates and maintains a log of merge actions for compliance.
- **Data Export:** Allows exporting cleaned patient data for further analysis or integration.
- **Security:** Implements authentication and role-based access to protect sensitive patient information.

## User Roles
- **Receptionist:**
  - Add new patient profiles
  - Edit existing profiles
  - Search for duplicate patient profiles by first and last name
- **Admin:**
  - Import patient data from CSV files
  - Run the duplicate detection algorithm
  - View the list of detected duplicate profiles
  - Manually merge duplicate profiles
  - Auto-merge duplicates using AI (LLM provides similarity reasoning and highlights conflicts for human intervention)

## Technologies Used
- **Backend:** Python (FastAPI)
- **Frontend:** React + TypeScript
- **Database:** SQLite
- **AI Logic:** Custom Python modules for data deduplication

## Usage
1. **Ingest Data:** Import patient records into the system.
2. **Detect Duplicates:** Run automated detection or manually search for duplicates.
3. **Review & Merge:** Use the UI to review flagged groups and merge profiles as needed.
4. **Export Data:** Download the cleaned dataset for use in other systems.

## Folder Structure
- `app/` - Backend API and services
- `frontend_ui/` - Frontend application
- `data_gen/` - Data generation scripts and sample datasets

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+

### Backend Setup
1. Install backend dependencies:
   ```bash
   pip install -r app/requirements.txt
   ```
2. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Install frontend dependencies:
   ```bash
   cd frontend_ui
   npm install
   ```
2. Start the frontend development server:
   ```bash
   npm run dev
   ```

### Accessing the Application
- Open your browser and navigate to the frontend URL (usually http://localhost:5173).
- Log in as either Receptionist (username: reception@demo.local, password: receptionpass) or Admin (username: admin@demo.local, password: adminpass) to access role-specific features.

