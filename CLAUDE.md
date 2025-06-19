# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static web-based markdown viewer application that runs entirely in the browser. It requires no build process or server-side functionality.

## Commands

This is a static website with no build tools:
- **Run locally**: `python -m http.server 8000` (or any HTTP server)
- **Deploy**: Simply host the files on any static web server
- **No build/lint/test commands** - Pure HTML/CSS/JS application

## Architecture

### Legacy Architecture (script.js - now deprecated)
The original implementation was a single 900+ line script with all functionality mixed together.

### New Modular Architecture
The application has been refactored into ES6 modules with clear separation of concerns:

#### Core Modules (/modules/)
- **EventBus.js**: Central event system for decoupled communication between modules
- **FileHandler.js**: File operations, File System Access API, hot reload functionality
- **MarkdownRenderer.js**: Markdown parsing and HTML generation using marked.js
- **SessionManager.js**: LocalStorage-based session persistence
- **NotificationManager.js**: User notifications and alerts
- **DragDropHandler.js**: Drag and drop file handling
- **TOCGenerator.js**: Table of contents generation and navigation

#### Web Components (/components/)
- **drop-zone.js**: Custom element for file drop area
- **markdown-viewer.js**: Custom element for the main viewer interface

#### Main Application
- **app.js**: Application bootstrapper that coordinates all modules
- **index.html**: Simplified HTML using Web Components
- **styles.css**: Main application styling
- **print.css**: Print-specific styles for PDF export

### External Dependencies (CDN)
- **marked.js**: Markdown parsing and rendering
- **Mermaid**: Diagram rendering (flowcharts, sequence diagrams, etc.)
- **highlight.js**: Syntax highlighting for code blocks

### Key Features Implementation
1. **Hot Reload**: Uses File System Access API (Chrome/Edge only) to watch file changes
2. **Drag & Drop**: Standard HTML5 drag/drop API with fallback file picker
3. **Table of Contents**: Dynamically generated from markdown headings with scroll tracking
4. **Collapsible Sections**: Custom implementation that wraps content between headings
5. **Lightbox**: Native HTML dialog elements for images and diagrams
6. **PDF Export**: Browser print functionality with custom print styles
7. **Session Persistence**: Uses localStorage to save and restore file content across page reloads (with 24-hour expiration)

### Browser Compatibility
- Full features: Chrome/Edge (File System Access API support)
- Basic features: Firefox, Safari (no hot reload)

### Deployment
The app is deployed to GitHub Pages at https://monoharada.github.io/markdown-ohp/