# AWS deployment: S3 + CloudFront static hosting

This is the primary and recommended deployment. It serves the site as static files
from S3 through CloudFront, which for a site with no backend is both the cheapest
and the fastest option available on AWS.

**Why it fits this project:** Toolino has client-side processing. There is no
API route, no database, no session and no job queue needed for static delivery. That means there is nothing
to run on a server, so there is nothing to pay for beyond storage and bandwidth,
and nothing to patch.

---

## Cost expectations

For a site of this size, the bill is dominated by CloudFront data transfer. The
full static export is roughly 1.5 MB across all pages, and a typical visitor
downloads 150–400 KB.

| Item | Rough monthly cost at 100k page views |
| --- | --- |
| S3 storage (a few hundred MB) | under $0.05 |
| CloudFront data transfer (about 40 GB) | about $3.40 |
| CloudFront requests (about 2M) | about $2.00 |
| Route 53 hosted zone | $0.50 |
| ACM certificate | free |
| **Total** | **about $6 per month** |

The AWS Free Tier covers 1 TB of CloudFront transfer and 1M requests per month for
the first 12 months, so the first year is close to free. There is no NAT gateway,
no load balancer and no container, which are the line items that normally make AWS
expensive.

---

## Architecture

```
Visitor
   │  HTTPS, custom domain
   ▼
Route 53  ──  A / AAAA alias record
   │
   ▼
CloudFront distribution
   ├── ACM certificate (us-east-1, DNS validated)
   ├── Response Headers Policy   → HSTS, CSP, nosniff, referrer policy, permissions policy
   ├── Custom error responses    → 403 and 404 both map to /404.html
   └── Origin Access Control (OAC)
             │  signed, authenticated origin request
             ▼
        S3 bucket (private, public access blocked, SSE-S3)
```

Nothing here is stateful. You can destroy and recreate the whole stack from the
commands below.

---

## One-time setup

Set these shell variables first; every command below uses them.

```bash
export AWS_REGION=us-east-1
export BUCKET=toolino-site
export DOMAIN=toolino-one.vercel.app
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

### 1. Create the bucket

CloudFront is global, but the bucket lives in a region. `us-east-1` keeps latency
to the certificate and is cheapest for most traffic.

```bash
aws s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$AWS_REGION"

# Encrypt at rest and version the objects so a bad deploy can be rolled back.
aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"},
      "BucketKeyEnabled": true
    }]
  }'

aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

# The bucket must never be public: CloudFront reads it with its own identity.
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 2. Request a certificate

The certificate **must** be in `us-east-1` for CloudFront, regardless of where
your bucket is.

```bash
aws acm request-certificate \
  --domain-name "$DOMAIN" \
  --subject-alternative-names "www.$DOMAIN" \
  --validation-method DNS \
  --region us-east-1

# Note the CertificateArn from the output, then fetch the validation records:
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:$ACCOUNT_ID:certificate/REPLACE_ME" \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[].ResourceRecord'
```

Add each returned CNAME to Route 53 (or your DNS provider), then wait:

```bash
aws acm wait certificate-validated \
  --certificate-arn "arn:aws:acm:us-east-1:$ACCOUNT_ID:certificate/REPLACE_ME" \
  --region us-east-1
```

### 3. Create the CloudFront distribution

Replace `CERTIFICATE_ARN` with the ARN from step 2.

```bash
cat > /tmp/dist-config.json <<JSON
{
  "CallerReference": "toolino-$(date +%s)",
  "Comment": "Toolino static site",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Aliases": { "Quantity": 2, "Items": ["$DOMAIN", "www.$DOMAIN"] },
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "s3-$BUCKET",
      "DomainName": "$BUCKET.s3.$AWS_REGION.amazonaws.com",
      "OriginAccessControlId": "REPLACE_WITH_OAC_ID",
      "S3OriginConfig": { "OriginAccessIdentity": "" }
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-$BUCKET",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "ResponseHeadersPolicyId": "REPLACE_WITH_POLICY_ID"
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      { "ErrorCode": 403, "ResponseCode": "404", "ResponsePagePath": "/404.html", "ErrorCachingMinTTL": 60 },
      { "ErrorCode": 404, "ResponseCode": "404", "ResponsePagePath": "/404.html", "ErrorCachingMinTTL": 60 }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "CERTIFICATE_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "HttpVersion": "http2and3",
  "PriceClass": "PriceClass_100",
  "Restrictions": { "GeoRestriction": { "RestrictionType": "none", "Quantity": 0 } }
}
JSON
```

Two notes on that config:

- **`CachePolicyId: 658327ea-...`** is the AWS managed `CachingOptimized` policy.
  It honours the `Cache-Control` headers the deploy script sets, which is what
  gives hashed assets a one-year cache and HTML a five-minute one.
- **`PriceClass_100`** uses North America and Europe only. It is the cheapest
  class; switch to `PriceClass_All` if you have significant traffic from Asia or
  South America and want lower latency there.

### 4. Create the Origin Access Control

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config \
    "Name=toolino-oac,Description=OAC for $BUCKET,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
  --query 'OriginAccessControl.Id' --output text
```

Put that id into `REPLACE_WITH_OAC_ID` above.

### 5. Create the security headers policy

```bash
aws cloudfront create-response-headers-policy \
  --response-headers-policy-config file://deploy/cloudfront/response-headers-policy.json \
  --query 'ResponseHeadersPolicy.Id' --output text
```

Put that id into `REPLACE_WITH_POLICY_ID` above. It sets HSTS with preload,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a strict
`Referrer-Policy`, a `Permissions-Policy` that disables camera, microphone,
geolocation and the Topics API, and a Content-Security-Policy that permits Google
AdSense, Analytics and Fonts while blocking everything else. The CSP is explained
in full below.

### 6. Create the distribution

```bash
aws cloudfront create-distribution \
  --distribution-config file:///tmp/dist-config.json \
  --query 'Distribution.{Id:Id,Domain:DomainName}' \
  --output table
```

### 7. Apply the bucket policy

Edit `deploy/s3/bucket-policy.json` to replace `BUCKET_NAME`, `ACCOUNT_ID` and
`DISTRIBUTION_ID`, then:

```bash
aws s3api put-bucket-policy \
  --bucket "$BUCKET" \
  --policy file://deploy/s3/bucket-policy.json
```

### 8. Point Route 53 at CloudFront

```bash
export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name "$DOMAIN" --query 'HostedZones[0].Id' --output text | cut -d/ -f3)
export CF_DOMAIN=$(aws cloudfront get-distribution \
  --id REPLACE_WITH_DISTRIBUTION_ID --query 'Distribution.DomainName' --output text)

cat > /tmp/route53.json <<JSON
{
  "Comment": "Toolino apex and www to CloudFront",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$DOMAIN",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.$DOMAIN",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
JSON

aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch file:///tmp/route53.json
```

`Z2FDTNDATAQYW2` is CloudFront's fixed hosted zone id, the same for every
distribution worldwide. Add matching `AAAA` records if you want IPv6.

> **Redirect www to the apex** (optional but recommended for one canonical
> hostname): create a second, tiny CloudFront Function on the `www` behaviour that
> returns a `301` to `https://$DOMAIN` plus the request URI. Keeping one hostname
> avoids duplicate content, and the canonical tags already point at the apex.

---

## Deploying

```bash
cp deploy/.env.deploy.example deploy/.env.deploy
# edit deploy/.env.deploy with your bucket and distribution id

chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

The script builds, uploads in four passes with different cache headers, invalidates
CloudFront, and then curls six URLs to confirm they return `200`.

You can also upload by hand:

```bash
npm run build
aws s3 sync out/ "s3://$BUCKET/" --delete
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
```

---

## Cache strategy

| Path | `Cache-Control` | Why |
| --- | --- | --- |
| `/_next/static/**` | `public, max-age=31536000, immutable` | Filenames contain a content hash, so a new build produces new URLs. This is what makes repeat visits near-instant. |
| `**/*.html` | `public, max-age=300, must-revalidate` | HTML must not be cached long, or a content change would not appear. Five minutes is the shortest practical value that still absorbs a traffic spike. |
| Images, icons | `public, max-age=86400` | Stable but occasionally replaced, so a day is a reasonable compromise. |
| `ads.txt`, `robots.txt`, `sitemap.xml` | `public, max-age=3600` | Short enough that a correction propagates the same day. |

CloudFront is told to compress responses, so HTML, CSS, JS, JSON and SVG are served
Brotli or gzip automatically.

---

## The Content-Security-Policy, and why it looks like that

The policy is strict by default: `default-src 'self'`, `object-src 'none'`,
`base-uri 'self'`, `frame-ancestors 'none'`. The exceptions exist for specific,
documented reasons.

**Why `script-src` includes `'unsafe-inline'`.** Next.js inlines a small hydration
bootstrap script into every page. Without `'unsafe-inline'` the site does not
hydrate and every tool stops working. Removing it properly requires nonce-based CSP,
which needs either a server runtime or an edge function that rewrites the HTML on
the way out. Google's own AdSense CSP guidance also assumes `'unsafe-inline'`.
If you want to remove it, the path is a CloudFront Function that injects a nonce
per response and rewrites the inline script tags - a real project, not a config
change.

**Why the Google origins are listed.** AdSense serves its loader from
`pagead2.googlesyndication.com` and its creatives from
`tpc.googlesyndication.com`, `googleads.g.doubleclick.net` and
`www.google.com`; GA4 uses `www.googletagmanager.com` and
`www.google-analytics.com`. Those are the only third-party origins permitted, and
only in the directives that need them.

**Why `worker-src 'self' blob:` is required.** The ZIP, PDF, OCR and
background-removal tools all run in Web Workers. Next.js bundles some workers as
blob URLs. Without this directive those tools fail silently in the browser.

**Why `cdn.jsdelivr.net`, `unpkg.com` and `staticimgly.com` appear.** These serve
the OCR language data and the background-removal model weights, and
`cdn.jsdelivr.net` also serves the pdf.js worker. Your files are never sent to
them; only model data is downloaded. To remove these origins entirely, run
`node scripts/vendor-models.mjs` and set `NEXT_PUBLIC_OCR_ASSET_BASE` and
`NEXT_PUBLIC_BG_REMOVAL_ASSET_BASE` to your own origin, then drop the three
hostnames from the policy.

---

## Custom 404 mapping

S3 returns `403` for a missing object when the bucket is private, and `404` when it
is a genuine miss. Both are mapped to `/404.html` with a `404` response code in the
`CustomErrorResponses` block above, so visitors get your real not-found page rather
than an XML error, and search engines correctly treat the response as a 404 rather
than a soft 200.

`404.html` is generated by Next.js from `src/app/not-found.tsx` and carries
`noindex`, so it can never be indexed.

---

## Legacy URLs and redirects

`scripts/generate-redirects.mjs` (run automatically by `npm run build`) writes a
tiny HTML stub for every legacy path, containing a `<link rel="canonical">`, a meta
refresh and a JavaScript fallback. The full map is also written to
`public/_redirects.json` for your own tooling.

**To serve true `301`s instead**, attach a CloudFront Function to the viewer-request
event of the default cache behaviour with this code:

```javascript
function handler(event) {
  var request = event.request;
  var redirects = {
    '/pdf-merger': '/tools/merge-pdf/',
    '/merge-pdf': '/tools/merge-pdf/',
    '/pdf-summarizer': '/tools/pdf-tools/',
    // ... add the rest from public/_redirects.json
  };
  var target = redirects[request.uri.replace(/\/$/, '')];
  if (target) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: target } },
    };
  }
  return request;
}
```

CloudFront Functions cost about $0.10 per million invocations, so this is
effectively free. The static stub approach exists because it needs no extra
configuration and works even if you host the `out/` directory somewhere else.

---

## Rolling back

Bucket versioning is enabled, so you can restore a previous deployment:

```bash
aws s3api list-object-versions \
  --bucket "$BUCKET" \
  --prefix index.html \
  --query 'Versions[?IsLatest==`false`].[VersionId,LastModified]' \
  --output table

aws s3api copy-object \
  --bucket "$BUCKET" \
  --key index.html \
  --copy-source "$BUCKET/index.html?versionId=REPLACE_ME"

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/index.html"
```

---

## Alternative: a server deployment

If you later need server-side rendering, `Dockerfile` in the repository root
builds a standalone Next.js image for AWS App Runner or ECS Fargate. It is not
needed for the static site and costs meaningfully more, because it needs a running
container and, for ECS, a load balancer. See the Dockerfile header for the trade-off
and for the `next.config.mjs` change it requires.
