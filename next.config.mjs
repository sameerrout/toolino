/**
 * Toolino - Next.js configuration
 *
 * Deployment target: Next.js Node.js server runtime for AWS deployment (ECS, App Runner, EC2, or Docker).
 * Fully supports dynamic server API routes (/api/auth/*, /api/manager/*, /api/analytics/*)
 * along with client-side privacy-first web tools.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ---- Server & Static Runtime ---------------------------------------------
  trailingSlash: true,
  images: {
    // Static and client-optimized image handling
    unoptimized: true,
    formats: ['image/webp'],
  },

  // ---- Build hygiene -------------------------------------------------------
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // LibreOffice-free, canvas-free client bundles. `canvas` is an optional
  // native dependency of pdfjs-dist that must never be resolved in the browser.
  webpack: (config, { isServer, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        os: false,
        canvas: false,
      };
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
    }
    return config;
  },

  /**
   * Legacy URL map. Kept in ONE place so that `scripts/generate-redirects.mjs`
   * can emit matching static `301` redirect stubs into `public/` for S3 +
   * CloudFront (see `deploy/cloudfront/redirects.md`). Each tool therefore has
   * exactly one canonical URL: `/tools/<tool-id>/`.
   */
  async redirects() {
    return [
      // --- legacy clean URLs -> canonical /tools/<id>/ ---
      { source: '/image-to-pdf', destination: '/tools/image-to-pdf/', permanent: true },
      { source: '/qr-code-generator', destination: '/tools/qr-code-generator/', permanent: true },
      { source: '/qr-generator', destination: '/tools/qr-code-generator/', permanent: true },
      { source: '/qr-tools', destination: '/tools/qr-code-generator/', permanent: true },
      { source: '/image-compressor', destination: '/tools/compress-image/', permanent: true },
      { source: '/compress-image', destination: '/tools/compress-image/', permanent: true },
      { source: '/image-compress', destination: '/tools/compress-image/', permanent: true },
      { source: '/image-resizer', destination: '/tools/resize-image/', permanent: true },
      { source: '/resize-image', destination: '/tools/resize-image/', permanent: true },
      { source: '/image-resize', destination: '/tools/resize-image/', permanent: true },
      { source: '/image-converter', destination: '/tools/convert-image/', permanent: true },
      { source: '/convert-image', destination: '/tools/convert-image/', permanent: true },
      { source: '/image-convert', destination: '/tools/convert-image/', permanent: true },
      { source: '/background-remover', destination: '/tools/remove-background/', permanent: true },
      { source: '/remove-bg', destination: '/tools/remove-background/', permanent: true },
      { source: '/remove-background', destination: '/tools/remove-background/', permanent: true },
      { source: '/bg-remover', destination: '/tools/remove-background/', permanent: true },
      { source: '/image-to-text', destination: '/tools/image-to-text/', permanent: true },
      { source: '/ocr', destination: '/tools/image-to-text/', permanent: true },
      { source: '/image-ocr', destination: '/tools/image-to-text/', permanent: true },
      { source: '/img-to-text', destination: '/tools/image-to-text/', permanent: true },
      { source: '/passport-photo-maker', destination: '/tools/passport-photo/', permanent: true },
      { source: '/passport-photo', destination: '/tools/passport-photo/', permanent: true },
      { source: '/passport-maker', destination: '/tools/passport-photo/', permanent: true },
      { source: '/passport-size-photo', destination: '/tools/passport-photo/', permanent: true },
      { source: '/word-counter', destination: '/tools/word-counter/', permanent: true },
      { source: '/json-formatter', destination: '/tools/json-formatter/', permanent: true },
      { source: '/age-calculator', destination: '/tools/age-calculator/', permanent: true },
      { source: '/percentage-calculator', destination: '/tools/percentage-calculator/', permanent: true },
      { source: '/emi-calculator', destination: '/tools/emi-calculator/', permanent: true },
      { source: '/discount-calculator', destination: '/tools/discount-calculator/', permanent: true },
      { source: '/gst-calculator', destination: '/tools/gst-calculator/', permanent: true },
      { source: '/pdf-compressor', destination: '/tools/compress-pdf/', permanent: true },
      { source: '/compress-pdf', destination: '/tools/compress-pdf/', permanent: true },
      { source: '/pdf-merger', destination: '/tools/merge-pdf/', permanent: true },
      { source: '/merge-pdf', destination: '/tools/merge-pdf/', permanent: true },
      { source: '/pdf-splitter', destination: '/tools/split-pdf/', permanent: true },
      { source: '/split-pdf', destination: '/tools/split-pdf/', permanent: true },
      { source: '/pdf-rotator', destination: '/tools/rotate-pdf/', permanent: true },
      { source: '/rotate-pdf', destination: '/tools/rotate-pdf/', permanent: true },
      { source: '/watermark-pdf', destination: '/tools/watermark-pdf/', permanent: true },
      { source: '/pdf-page-numbers', destination: '/tools/pdf-page-numbers/', permanent: true },
      { source: '/pdf-organizer', destination: '/tools/organize-pdf/', permanent: true },
      { source: '/organize-pdf', destination: '/tools/organize-pdf/', permanent: true },
      { source: '/pdf-to-image', destination: '/tools/pdf-to-image/', permanent: true },
      { source: '/pdf2image', destination: '/tools/pdf-to-image/', permanent: true },
      { source: '/pdf-to-img', destination: '/tools/pdf-to-image/', permanent: true },
      { source: '/protect-pdf', destination: '/tools/protect-pdf/', permanent: true },
      { source: '/pdf-protect', destination: '/tools/protect-pdf/', permanent: true },
      { source: '/document-tools', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/pdf-tools', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/image-tools', destination: '/tools/image-tools/', permanent: true },
      { source: '/utility-tools', destination: '/tools/calculators/', permanent: true },
      { source: '/file-tools', destination: '/tools/file-tools/', permanent: true },
      { source: '/text-tools', destination: '/tools/text-tools/', permanent: true },

      // --- removed tools (redirected to their category hubs) ----------------
      { source: '/edit-pdf', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/pdf-editor', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/editor-pdf', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/tools/edit-pdf', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/pin-code-lookup', destination: '/tools/text-tools/', permanent: true },
      { source: '/pincode-lookup', destination: '/tools/text-tools/', permanent: true },
      { source: '/pincode-finder', destination: '/tools/text-tools/', permanent: true },
      { source: '/india-pincode', destination: '/tools/text-tools/', permanent: true },
      { source: '/tools/pin-code-lookup', destination: '/tools/text-tools/', permanent: true },

      // PDF Summarizer was deleted (server-side NLP).
      { source: '/pdf-summarizer', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/pdf-analyser', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/pdf-analyzer', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/summarize-pdf', destination: '/tools/pdf-tools/', permanent: true },
      // PDF to PowerPoint was removed.
      { source: '/pdf-to-powerpoint', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/pdf-to-pptx', destination: '/tools/pdf-tools/', permanent: true },
      { source: '/pdf2pptx', destination: '/tools/pdf-tools/', permanent: true },

      // Legacy unused paths
      { source: '/dashboard', destination: '/', permanent: true },
      { source: '/download', destination: '/', permanent: true },
      { source: '/guides', destination: '/blog/', permanent: true },
    ];
  },
};

export default nextConfig;
