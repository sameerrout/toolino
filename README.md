# Toolino — High-Performance File Conversion & Utility Platform

Toolino is a privacy-conscious, high-performance web platform for everyday document transformation, formatting, presentation conversion, and utilities.

It features an adaptive hybrid processing architecture: lightweight tools run client-side directly inside modern web browsers, while complex document conversions run through memory-efficient, sandboxed backend workers with dynamic resource management.

---

## 🏛️ System Architecture

```text
USER / BROWSER
      │
      ▼
NEXT.JS 15 (App Router + React 19)
      │
      ▼
UNIFIED EXECUTION ROUTER (executeTool)
 ├── CLIENT EXECUTOR  ──────► In-Browser WebAssembly & Canvas (QR, Image-to-PDF, Rotate, etc.)
 └── SERVER JOB EXECUTOR ───► POST /api/jobs (PDF-to-PPTX)
                                   │
                                   ▼
                            RESOURCE MANAGER
                            (Dynamic Memory, CPU & Concurrency profiling)
                                   │
                                   ▼
                            PYTHON WORKERS
                            (PyMuPDF, python-pptx)
                                   │
                                   ▼
                            ISOLATED EPHEMERAL STORAGE
                            (backend/storage/jobs/<jobId>/)
                                   │
                                   ▼
                            OUTPUT VALIDATION & PURGE
```

---

## 🚀 Key Architectural Highlights

1. **Strict 1:1 PDF-to-PowerPoint Guarantee**:
   Every single PDF page is rendered to a high-resolution slide with preserved aspect ratio, centering, and no blank slides (`len(slides) == len(pdf_pages)`).
2. **Memory-Safe Large File Processing**:
   Processes multi-page documents chunk-by-chunk and page-by-page. Intermediate bitmaps and temporary files are explicitly wiped from memory and disk immediately after each page is converted.
3. **Unified Job API & Crash Isolation**:
   Background jobs execute in child processes. Failures are contained with user-friendly error codes (`FILE_TOO_LARGE`, `OCR_UNAVAILABLE`, `CONVERSION_FAILED`, `VALIDATION_FAILED`) without exposing server stack traces.
4. **Complete Technical SEO Architecture**:
   Dynamic `robots.txt`, dynamic `sitemap.xml`, vanity URL rewrites (`/pdf-to-powerpoint`, `/qr-code-generator`), Schema.org JSON-LD (`WebApplication`, `BreadcrumbList`, `FAQPage`), and dedicated category hubs (`/pdf-tools`, `/document-tools`, `/image-tools`, `/utility-tools`, `/qr-tools`).

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15.5, React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Client Libraries**: `pdf-lib`, `pdfjs-dist`, `pptxgenjs`, `docx`, `mammoth`, `jszip`, `qrcode`.
- **Backend Runtime**: Node.js 22+ & Python 3.8+ (PyMuPDF, pdf2docx, python-docx, python-pptx, psutil, pywin32).

---

## ⚙️ Prerequisites & Setup

### 1. Node.js Environment
Requires Node.js 18+ (tested on Node.js 22):
```bash
npm install
```

### 2. Python Environment
Install core conversion worker dependencies:
```bash
pip install -r backend/requirements.txt
```

### 3. Optional Native Engines
- **Microsoft Office (Windows)**: If Microsoft Word and PowerPoint are installed, Toolino will automatically leverage native COM automation for high document fidelity.
- **LibreOffice (Cross-Platform)**: Install LibreOffice and ensure `soffice` is in PATH or configure `LIBREOFFICE_PATH` in `.env`.
- **Tesseract OCR (Optional for Scanned Documents)**:
  - Windows: [Tesseract at UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)
  - Linux: `sudo apt-get install tesseract-ocr`

---

## 💻 Development & Testing Commands

### Development Server
```bash
npm run dev
# Starts Next.js development server on http://localhost:3000
```

### Type Checking & Build
```bash
npm run type-check   # Strict TypeScript compiler verification
npm run build        # Production Next.js build
```

### Test Suites
```bash
npm test                             # 17-tool platform suite & auth security tests
python tests/test_core_converters.py # Python converter worker verification (PDF, DOCX, PPTX)
python tests/benchmark_converters.py # Performance and peak memory benchmark suite
```

---

## 📋 Environment Configuration (.env)

| Variable | Default | Purpose |
| :--- | :---: | :--- |
| `PORT` | `3000` | Application server port |
| `NEXT_PUBLIC_SITE_URL` | `https://toolnova.com` | Canonical base URL for SEO and sitemap |
| `TOOLINO_PYTHON_BIN` | `python` | Python executable name or path |
| `TOOLINO_JOB_RETENTION_HOURS` | `1` | Hours before temporary job directories are purged |
| `TOOLINO_MAX_WORKERS` | `0` (auto) | Maximum parallel worker processes |
| `TOOLINO_SAFETY_RESERVE_MB` | `512` | Server RAM headroom reserved from workers |
| `LIBREOFFICE_PATH` | (auto-detect) | Path to `soffice` executable |
| `TOOLINO_OCR_PATH` | (auto-detect) | Path to `tesseract` executable |

---

## 🛡️ Security & Privacy Architecture

- **Sanitized Filenames**: Paths are scrubbed of traversal characters (`../`, `\`, null bytes).
- **Magic-Byte Verification**: Headers verified independently for PDF (`%PDF-`), DOCX (`PK\x03\x04`), and PPTX.
- **Automated Ephemeral Purge**: All scratch directories in `backend/storage/jobs/<jobId>/` are scrubbed on job completion, failure, cancellation, or TTL expiration.
- **Factual Disclosures**: Clear and accurate transparency regarding client-side versus server-processed operations.
