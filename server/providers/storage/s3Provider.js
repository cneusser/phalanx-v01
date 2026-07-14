// ─────────────────────────────────────────────────────────────────────────────
// S3Provider: S3-kompatibler Speicher (Cloudflare R2, AWS S3, Hetzner …).
// Lädt @aws-sdk/client-s3 nur, wenn STORAGE_PROVIDER=s3 gewählt ist (Lazy Require),
// damit der Default-Betrieb (local) das SDK nicht benötigt.
//
// ENV:
//   S3_ENDPOINT   z. B. https://<accountid>.r2.cloudflarestorage.com
//   S3_BUCKET     Bucketname
//   S3_KEY        Access Key ID
//   S3_SECRET     Secret Access Key
//   S3_REGION     optional (R2: 'auto')
// ─────────────────────────────────────────────────────────────────────────────
function create() {
  let S3, client, bucket;
  try {
    S3 = require('@aws-sdk/client-s3');
  } catch (e) {
    throw new Error('STORAGE_PROVIDER=s3 gesetzt, aber @aws-sdk/client-s3 ist nicht installiert. Bitte "npm i @aws-sdk/client-s3".');
  }
  bucket = process.env.S3_BUCKET;
  if (!bucket || !process.env.S3_ENDPOINT || !process.env.S3_KEY || !process.env.S3_SECRET) {
    throw new Error('S3-Konfiguration unvollständig (S3_ENDPOINT/S3_BUCKET/S3_KEY/S3_SECRET erforderlich).');
  }
  client = new S3.S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_KEY, secretAccessKey: process.env.S3_SECRET },
    forcePathStyle: true, // R2/kompatible Endpunkte
  });

  const streamToBuffer = async (stream) => {
    if (Buffer.isBuffer(stream)) return stream;
    if (typeof stream.transformToByteArray === 'function') return Buffer.from(await stream.transformToByteArray());
    const chunks = [];
    for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    return Buffer.concat(chunks);
  };

  return {
    name: 's3',
    async put(key, buffer, mime) {
      await client.send(new S3.PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mime || 'application/octet-stream' }));
      return { key };
    },
    async get(key) {
      const r = await client.send(new S3.GetObjectCommand({ Bucket: bucket, Key: key }));
      return streamToBuffer(r.Body);
    },
    async delete(key) {
      await client.send(new S3.DeleteObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    },
    async exists(key) {
      try { await client.send(new S3.HeadObjectCommand({ Bucket: bucket, Key: key })); return true; }
      catch { return false; }
    },
    async list(prefix = '') {
      const out = [];
      let token;
      do {
        const r = await client.send(new S3.ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
        (r.Contents || []).forEach(o => out.push({ key: o.Key, size: o.Size }));
        token = r.IsTruncated ? r.NextContinuationToken : undefined;
      } while (token);
      return out;
    },
  };
}

module.exports = { create };
