#!/usr/bin/env bash
#
# ToolForForever — deploy the static export to S3 + CloudFront.
#
# Usage:
#   ./deploy/deploy.sh                    # uses values from .env.deploy
#   BUCKET=my-bucket ./deploy/deploy.sh    # or override any value inline
#
# Prerequisites (see deploy/cloudfront/README.md for the full walkthrough):
#   1. AWS CLI v2 installed and authenticated (`aws sts get-caller-identity`)
#   2. NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_ADSENSE_CLIENT and NEXT_PUBLIC_GA_ID set
#      for the build (copy .env.example to .env.local, or export them here)
#   3. The S3 bucket and CloudFront distribution already created
#
# What it does:
#   1. builds the static export into out/
#   2. uploads content-hashed assets with a 1-year immutable cache
#   3. uploads HTML with a 5-minute cache so content changes go live quickly
#   4. uploads everything else (icons, ads.txt, redirect stubs) with a moderate cache
#   5. invalidates the CloudFront cache for HTML and the metadata files
#
# It is intentionally idempotent: running it twice in a row is harmless.

set -euo pipefail

# ------------------------------------------------------------------ config

# Load .env.deploy if present (never committed; see .gitignore).
if [[ -f .env.deploy ]]; then
  # shellcheck disable=SC1091
  set -a
  source .env.deploy
  set +a
fi

BUCKET="${BUCKET:-}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
OUT_DIR="${OUT_DIR:-out}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://www.toolforforever.com}"

if [[ -z "$BUCKET" ]]; then
  echo "error: BUCKET is not set." >&2
  echo "       Set it in deploy/.env.deploy or pass BUCKET=your-bucket-name." >&2
  exit 1
fi

if [[ -z "$DISTRIBUTION_ID" ]]; then
  echo "warning: DISTRIBUTION_ID is not set; the CloudFront cache will NOT be invalidated." >&2
  echo "         HTML is uploaded with a short cache, so changes still appear within 5 minutes." >&2
fi

echo "==> ToolForForever deploy"
echo "    bucket         : $BUCKET"
echo "    distribution   : ${DISTRIBUTION_ID:-<not set>}"
echo "    region         : $AWS_REGION"
echo "    site url       : $SITE_URL"
echo

# ------------------------------------------------------------------- build

echo "==> Building the static export"
# Fail early with a clear message if the canonical URL is still the placeholder.
if [[ "$SITE_URL" == *"example.com"* ]]; then
  echo "error: NEXT_PUBLIC_SITE_URL still points at example.com. Set your real domain." >&2
  exit 1
fi

npm run build

if [[ ! -d "$OUT_DIR" ]]; then
  echo "error: $OUT_DIR was not created. Check that next.config.mjs has output: 'export'." >&2
  exit 1
fi

FILE_COUNT=$(find "$OUT_DIR" -type f | wc -l | tr -d ' ')
echo "    built $FILE_COUNT files into $OUT_DIR/"
echo

# ------------------------------------------------------------- s3 uploads
#
# Four passes, because the right Cache-Control depends entirely on the path:
#
#   /_next/static/**  content-hashed, safe to cache forever
#   *.html            must revalidate quickly or content updates never appear
#   /_next/data/**    Next.js data payloads (not produced by static export, but
#                     harmless to cover)

echo "==> Uploading immutable build assets (/_next/static, 1 year)"
aws s3 sync "$OUT_DIR/_next/static/" "s3://$BUCKET/_next/static/" \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete \
  --no-progress

echo "==> Uploading HTML (5 minute cache, must revalidate)"
aws s3 sync "$OUT_DIR/" "s3://$BUCKET/" \
  --region "$AWS_REGION" \
  --exclude "_next/*" \
  --exclude "*.png" \
  --exclude "*.jpg" \
  --exclude "*.jpeg" \
  --exclude "*.svg" \
  --exclude "*.ico" \
  --exclude "*.webp" \
  --exclude "*.txt" \
  --exclude "*.xml" \
  --exclude "*.json" \
  --include "*.html" \
  --cache-control "public, max-age=300, must-revalidate" \
  --content-type "text/html; charset=utf-8" \
  --delete \
  --no-progress

echo "==> Uploading static media (1 day cache)"
aws s3 sync "$OUT_DIR/" "s3://$BUCKET/" \
  --region "$AWS_REGION" \
  --exclude "_next/*" \
  --exclude "*.html" \
  --exclude "*.xml" \
  --exclude "*.txt" \
  --exclude "*.json" \
  --cache-control "public, max-age=86400" \
  --no-progress

echo "==> Uploading crawler and ad metadata (1 hour cache)"
# ads.txt, robots.txt, sitemap.xml and the redirect manifest: short cache so a
# correction propagates the same day, but long enough to avoid constant refetch.
for FILE in ads.txt robots.txt sitemap.xml _redirects.json manifest.webmanifest; do
  if [[ -f "$OUT_DIR/$FILE" ]]; then
    CONTENT_TYPE="text/plain"
    case "$FILE" in
      *.xml) CONTENT_TYPE="application/xml" ;;
      *.json|*.webmanifest) CONTENT_TYPE="application/json" ;;
    esac
    aws s3 cp "$OUT_DIR/$FILE" "s3://$BUCKET/$FILE" \
      --region "$AWS_REGION" \
      --cache-control "public, max-age=3600" \
      --content-type "$CONTENT_TYPE" \
      --no-progress
  fi
done

echo

# ------------------------------------------------------------ invalidation

if [[ -n "$DISTRIBUTION_ID" ]]; then
  echo "==> Invalidating the CloudFront cache"
  # Only HTML and the metadata files need invalidating: everything under
  # /_next/static is content-hashed and therefore already unique per build.
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/" "/index.html" "/*.html" "/tools/*" "/blog/*" "/ads.txt" "/robots.txt" "/sitemap.xml" "/manifest.webmanifest" \
    --query 'Invalidation.Id' \
    --output text)

  echo "    invalidation started: $INVALIDATION_ID"
  echo "    (it completes in one to two minutes)"
else
  echo "==> Skipping invalidation (no DISTRIBUTION_ID)"
fi

echo
echo "==> Done"
echo "    live at: $SITE_URL"
echo

# ------------------------------------------------------------------ verify

echo "==> Post-deploy checks"
for PATH_TO_CHECK in / /tools/ /tools/create-zip/ /sitemap.xml /robots.txt /ads.txt; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL$PATH_TO_CHECK" || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    echo "    OK   $STATUS  $PATH_TO_CHECK"
  else
    echo "    FAIL $STATUS  $PATH_TO_CHECK"
  fi
done

echo
echo "If a check failed, give CloudFront another minute and re-run just this list."
