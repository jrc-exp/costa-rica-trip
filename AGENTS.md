# Costa Rica Trip Site

## Project overview

This is a dependency-free static site for the Costa Rica 2026 family trip. The
repository is deployed from `main` to Netlify at:

`https://costa-rico-trip.netlify.app/`

The GitHub origin is `git@github.com:jrc-exp/costa-rica-trip.git`.

There is no npm build step. `index.html`, `styles.css`, `app.js`, `vendor/`, and
`assets/` are served directly from the repository root.

## Netlify

`netlify.toml` is the deployment configuration:

- `publish = "."` publishes the repository root.
- There is no build command.
- Security headers are applied to all paths.
- `/r2/*` is a Netlify 200-status proxy to the public R2 hostname:
  `https://pub-c2ad619a6fe841c8875abf1bbe7e8be5.r2.dev/:splat`.

The site intentionally uses the Netlify proxy for media. Direct browser access
to the R2-managed `r2.dev` hostname has been unreliable, while the Netlify
proxy successfully returns the objects. Browser-visible media URLs should use
`/r2/<object-key>`, not the raw `r2.dev` hostname.

After pushing to `main`, Netlify deploys automatically. A useful smoke check is:

```sh
curl -I https://costa-rico-trip.netlify.app/r2/day-01/001.jpg
```

The response should be HTTP 200 with `Content-Type: image/jpeg`.

## Photo and video flow

There are two media trees:

- `assets/Costa Rica/day-XX/` contains the original camera files. It is local
  source material and is about 1.6 GB; it must not be committed or uploaded as
  part of the website deployment.
- `assets/photos/` contains generated web derivatives. These files are kept in
  R2, not Git.

`scripts/process_media.py` converts the originals into the web derivatives and
generates `assets/photos/photos.js`. Useful options include:

```sh
python3 scripts/process_media.py
python3 scripts/process_media.py --force
python3 scripts/process_media.py --day 1
```

### Adding a new photo archive

1. Inspect the archive before extracting it. Keep the ZIP itself local and
   ignored; do not commit it.
2. Extract the camera originals into `assets/Costa Rica/`. The processor reads
   capture metadata, moves each file into its matching `day-XX/` directory, and
   refuses to overwrite an existing original. If an archive contains a file
   already present in a day directory, verify it is identical and do not create
   a second top-level copy.
3. Add a clear, human description for each newly included item in
   `NEW_MEDIA_CAPTIONS` in `scripts/process_media.py`. The processor keeps each
   day's gallery in strict capture-time order. A rebuild may therefore change
   R2 object numbers; this is expected, and all regenerated derivatives must be
   uploaded before publishing the matching manifest.
4. Run the processor for each affected day, for example:

   ```sh
   python3 scripts/process_media.py --day 7
   ```

   Still images are auto-oriented and converted to progressive JPEGs with a
   maximum 1800px long edge. Videos become streamable H.264 MP4s, and every
   image and video receives a 640×480 carousel thumbnail.
5. Review the generated `assets/photos/photos.js`. It must reference `/r2/`
   URLs and must include the new captions, dates, media types, and thumbnail
   paths. Do not hand-edit a generated manifest unless recovering from a failed
   build; fix the caption data and rebuild instead.
6. Upload the generated media (but never `photos.js`) to R2, then force-add and
   commit only the manifest and any processing-script changes. Originals, ZIPs,
   and generated binaries remain ignored.

The committed `assets/photos/photos.js` is the small exception to the ignored
`assets/photos/` directory. It defines `window.TRIP_PHOTOS` and its media URLs
use same-origin `/r2/...` paths. This manifest must remain local to the site:
loading the manifest directly from R2 can block `app.js` before the map and
carousels initialize.

The processor is configured to generate same-origin Netlify-proxy paths. Check
that it continues to do so before committing:

```sh
rg '"src": "/r2/|"thumb": "/r2/' assets/photos/photos.js
git add -f assets/photos/photos.js
```

`app.js` reads `window.TRIP_PHOTOS`. Each day’s carousel uses the manifest’s
object keys; if the manifest is absent, it falls back to the planned placeholder
cards in `PLANNED`.

## R2 bucket

The R2 bucket is:

`costa-rica-photos`

The generated media is uploaded with the same object layout as the local
derivatives, for example:

```text
day-01/001.jpg
day-01/002.jpg
videos/day-02/001.mp4
```

The R2-managed public hostname is:

`https://pub-c2ad619a6fe841c8875abf1bbe7e8be5.r2.dev`

R2 **Public Development URL** access should remain enabled. The R2 CORS policy
can allow the deployed site and local development origin, for example:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://costa-rico-trip.netlify.app"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Range",
      "Accept-Ranges"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

The Netlify proxy makes normal browser image/video requests same-origin, so
CORS is not the primary serving mechanism for the deployed site. Keep the
policy configured for direct testing and any future direct media requests.

To upload generated media, use the S3-compatible R2 endpoint and credentials
from a secure local environment. Never put credentials in Git or in this file:

```sh
R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
AWS_ACCESS_KEY_ID="<access-key-id>" \
AWS_SECRET_ACCESS_KEY="<secret-access-key>" \
aws s3 sync assets/photos/ s3://costa-rica-photos/ \
  --exclude photos.js \
  --endpoint-url="$R2_ENDPOINT"
```

`r2.txt` contains local Cloudflare credentials/configuration and is ignored by
`.gitignore`. Do not print, commit, paste, or include those values in logs,
documentation, or source code. If credentials are ever exposed, rotate them in
Cloudflare immediately.

## Local hero and epilogue photos

These two intentionally committed assets are not part of the R2 gallery:

- `assets/hero_family_photo.jpg` is the framed Arenal family photo in the hero.
- `assets/goodbye_family_photo.jpg` is the framed family photo in the epilogue.

They are referenced directly by `index.html`/`styles.css` and should remain in
Git so the page’s opening and closing composition does not depend on R2.

## Map and external services

Leaflet is vendored in `vendor/`. The map uses OpenStreetMap tiles and asks the
OSRM public router for real road geometry. If OSRM is unavailable, the code
keeps the straight-line route. If OpenStreetMap tiles are unavailable, route
lines and pins can still render over the map background.

## Safe change and deploy workflow

1. Keep original media and credentials local; do not remove or commit them.
2. Make code/config changes in the repository.
3. Run `node --check app.js` and check modified files with `git diff --check`.
4. For a regenerated manifest, force-add only the manifest:
   `git add -f assets/photos/photos.js`.
5. Confirm `git status --short --branch` before committing.
6. Commit and push to `main`.
7. Verify the Netlify proxy URL and wait for the automatic deploy to complete.
