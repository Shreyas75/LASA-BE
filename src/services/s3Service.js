const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { env } = require("../config/env");

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
      }
    : undefined
});

const buildPublicUrl = (key) => {
  if (env.AWS_S3_PUBLIC_BASE_URL) {
    return `${env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }

  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
};

const createPresignedUploadUrl = async ({ key, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  const publicUrl = buildPublicUrl(key);

  return { uploadUrl, publicUrl, key };
};

const uploadPublicObject = async ({ key, body, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return { key, publicUrl: buildPublicUrl(key) };
};

module.exports = { createPresignedUploadUrl, uploadPublicObject };
