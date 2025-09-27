import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import mime from 'mime-types';
import config from '../config.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import { loadS3Config } from '../config.s3.js';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createVideo as repoCreateVideo,
  listVideos as repoListVideos,
  getVideo as repoGetVideo,
  updateVideo as repoUpdateVideo,
  deleteVideo as repoDeleteVideo
} from './video.repo.js';

let s3Client;

const getS3Client = async () => {
  if (!s3Client) {
    const { REGION } = await loadS3Config();
    s3Client = new S3Client({ region: REGION });
  }
  return s3Client;
};

const probeVideo = (filePath) => new Promise((resolve, reject) => {
  ffmpeg.ffprobe(filePath, (err, data) => {
    if (err) return reject(err);
    return resolve(data);
  });
});

const generateThumbnail = (inputPath, outputPath) => new Promise((resolve, reject) => {
  ffmpeg(inputPath)
    .on('error', reject)
    .on('end', resolve)
    .screenshots({
      timestamps: ['2'],
      filename: path.basename(outputPath),
      folder: path.dirname(outputPath),
      size: '640x?'
    });
});

const mapVideo = (video) => ({
  id: video.id,
  userId: String(video.userId),
  originalName: video.originalName,
  storedFilename: video.storedFilename,
  format: video.format,
  durationSec: video.durationSec != null ? Number(video.durationSec) : null,
  status: video.status,
  width: video.width != null ? Number(video.width) : null,
  height: video.height != null ? Number(video.height) : null,
  sizeBytes: video.sizeBytes != null ? Number(video.sizeBytes) : null,
  createdAt: video.createdAt,
  updatedAt: video.updatedAt,
  thumbPath: video.thumbPath,
  transcodedFilename: video.transcodedFilename
});

const getKeyBaseFromOriginal = async (storedFilename) => {
  const { RAW_PREFIX } = await loadS3Config();
  if (storedFilename.startsWith(RAW_PREFIX)) {
    const withoutPrefix = storedFilename.slice(RAW_PREFIX.length);
    const dotIndex = withoutPrefix.lastIndexOf('.');
    return dotIndex > 0 ? withoutPrefix.slice(0, dotIndex) : withoutPrefix;
  }
  const parsed = path.parse(storedFilename);
  return parsed.name;
};

async function uploadToS3 (prefix, localPath, keyName, contentType) {
  const { S3_BUCKET } = await loadS3Config();
  const client = await getS3Client();
  const Key = `${prefix}${keyName}`;
  await client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key,
    Body: createReadStream(localPath),
    ContentType: contentType || mime.lookup(localPath) || 'application/octet-stream'
  }));
  await fs.unlink(localPath).catch(() => {});
  return { bucket: S3_BUCKET, key: Key };
}

async function saveOriginalToS3 (localPath, keyName, contentType) {
  const { RAW_PREFIX } = await loadS3Config();
  return uploadToS3(RAW_PREFIX, localPath, keyName, contentType);
}

async function saveThumbToS3 (localPath, keyName) {
  const { THUMB_PREFIX } = await loadS3Config();
  return uploadToS3(THUMB_PREFIX, localPath, keyName, 'image/jpeg');
}

async function saveTranscodedToS3 (localPath, keyName) {
  const { TRANSCODED_PREFIX } = await loadS3Config();
  return uploadToS3(TRANSCODED_PREFIX, localPath, keyName, 'video/mp4');
}

async function presignS3Url (key, { downloadName } = {}) {
  if (!key) {
    throw new NotFoundError('Object key not provided');
  }
  const { S3_BUCKET, PRESIGNED_TTL_SECONDS } = await loadS3Config();
  const client = await getS3Client();
  const params = {
    Bucket: S3_BUCKET,
    Key: key
  };
  if (downloadName) {
    params.ResponseContentDisposition = `attachment; filename="${downloadName}"`;
  }
  const command = new GetObjectCommand(params);
  return getSignedUrl(client, command, { expiresIn: PRESIGNED_TTL_SECONDS });
}

async function deleteFromS3 (keys = []) {
  if (!keys.length) return;
  const { S3_BUCKET } = await loadS3Config();
  const client = await getS3Client();
  await Promise.all(keys.map(async (Key) => {
    if (!Key) return;
    await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key })).catch(() => {});
  }));
}

async function downloadFromS3 (key, localPath) {
  const { S3_BUCKET } = await loadS3Config();
  const client = await getS3Client();
  const { Body } = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await pipeline(Body, createWriteStream(localPath));
  return localPath;
}

export async function ensureStorageDirs () {
  await fs.mkdir(config.PUBLIC_VIDEOS_DIR, { recursive: true });
  await fs.mkdir(config.PUBLIC_THUMBS_DIR, { recursive: true });
  await fs.mkdir(path.join(config.PUBLIC_VIDEOS_DIR, 'tmp'), { recursive: true });
}

export async function handleUpload (userId, file) {
  if (!file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const absolutePath = path.join(config.PUBLIC_VIDEOS_DIR, file.filename);
  let thumbAbsolute;
  let keyBase;
  try {
    const metadata = await probeVideo(absolutePath);
    const videoStream = metadata.streams.find((stream) => stream.codec_type === 'video');
    const duration = metadata.format?.duration ? Number.parseFloat(metadata.format.duration) : null;
    const format = metadata.format?.format_name || file.mimetype;

    keyBase = randomUUID();
    const ext = path.extname(file.originalname) || path.extname(file.filename) || '.mp4';
    const thumbFile = `${keyBase}.jpg`;
    thumbAbsolute = path.join(config.PUBLIC_THUMBS_DIR, `${keyBase}.jpg`);

    await generateThumbnail(absolutePath, thumbAbsolute);

    const originalUpload = await saveOriginalToS3(absolutePath, `${keyBase}${ext}`, file.mimetype);
    const thumbUpload = await saveThumbToS3(thumbAbsolute, thumbFile);

    const now = new Date().toISOString();
    const created = await repoCreateVideo({
      id: keyBase,
      userId: String(userId),
      originalName: file.originalname,
      storedFilename: originalUpload.key,
      format,
      durationSec: duration,
      status: 'uploaded',
      width: videoStream?.width || null,
      height: videoStream?.height || null,
      sizeBytes: file.size,
      createdAt: now,
      updatedAt: now,
      thumbPath: thumbUpload.key,
      transcodedFilename: null
    });

    return created.id;
  } catch (error) {
    console.error('Upload processing failed', error);
    await fs.unlink(absolutePath).catch(() => {});
    if (thumbAbsolute) {
      await fs.unlink(thumbAbsolute).catch(() => {});
    }
    throw new AppError('Unable to process uploaded video', 500, 'UPLOAD_PROCESSING_FAILED');
  }
}

export async function listVideos (userId, page, limit) {
  const { total, items } = await repoListVideos(String(userId), page, limit);
  return {
    total,
    items: items.map(mapVideo)
  };
}

export async function getVideoByIdForUser (id, userId) {
  const video = await repoGetVideo(String(userId), id);
  if (!video) {
    throw new NotFoundError('Video not found');
  }
  return mapVideo(video);
}

const buildDownloadName = (video, variant) => {
  const base = video.originalName ? path.parse(video.originalName).name : 'video';
  if (variant === 'transcoded' && video.transcodedFilename) {
    return `${base}-720p${path.extname(video.transcodedFilename) || '.mp4'}`;
  }
  const extension = path.extname(video.originalName || '') || '.mp4';
  return `${base}${extension}`;
};

export async function getVideoStreamUrl (video, variant = 'original', download = false) {
  const useTranscoded = variant === 'transcoded';
  if (useTranscoded && !video.transcodedFilename) {
    throw new AppError('Transcoded file not yet available', 409, 'TRANSCODE_PENDING');
  }
  const key = useTranscoded ? video.transcodedFilename : video.storedFilename;
  if (!key) {
    throw new NotFoundError('Video file missing on storage');
  }
  const downloadName = download ? buildDownloadName(video, variant) : undefined;
  return presignS3Url(key, { downloadName });
}

export async function getThumbnailUrl (video) {
  if (!video.thumbPath) {
    throw new NotFoundError('Thumbnail not generated yet');
  }
  return presignS3Url(video.thumbPath);
}

export async function deleteVideo (video) {
  await deleteFromS3([
    video.storedFilename,
    video.thumbPath,
    video.transcodedFilename
  ]);
  await repoDeleteVideo(String(video.userId), video.id);
}

export async function transcodeVideo (video, preset = '720p') {
  if (video.status === 'transcoding') {
    throw new AppError('Video is already transcoding', 409, 'ALREADY_TRANSCODING');
  }
  if (!video.storedFilename) {
    throw new NotFoundError('Original video file missing');
  }

  const ownerId = String(video.userId);
  const startedAt = new Date().toISOString();
  await repoUpdateVideo(ownerId, video.id, { status: 'transcoding', updatedAt: startedAt });

  const tmpDir = path.join(config.PUBLIC_VIDEOS_DIR, 'tmp');
  await fs.mkdir(tmpDir, { recursive: true });

  const originalExt = path.extname(video.storedFilename) || '.mp4';
  const baseName = await getKeyBaseFromOriginal(video.storedFilename);
  const localOriginal = path.join(tmpDir, `${baseName}-original${originalExt}`);
  const localOutput = path.join(tmpDir, `${baseName}-${preset}.mp4`);

  try {
    await downloadFromS3(video.storedFilename, localOriginal);
  } catch (error) {
    console.error('Failed to download original for transcoding', error);
    await repoUpdateVideo(ownerId, video.id, { status: 'failed' });
    throw new NotFoundError('Original video file missing from storage');
  }

  await fs.unlink(localOutput).catch(() => {});

  console.log(`Starting ffmpeg transcode for video ${video.id}`);

  const outputKeyName = `${baseName}-${preset}.mp4`;

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(localOriginal)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-vf scale=1280:-2',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart'
        ])
        .format('mp4')
        .on('error', reject)
        .on('end', resolve)
        .save(localOutput);
    });

    const upload = await saveTranscodedToS3(localOutput, outputKeyName);
    await repoUpdateVideo(ownerId, video.id, {
      status: 'ready',
      transcodedFilename: upload.key,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`ffmpeg failed for video ${video.id}`, error);
    await fs.unlink(localOutput).catch(() => {});
    await repoUpdateVideo(ownerId, video.id, { status: 'failed' });
    throw new AppError('Transcoding failed', 500, 'TRANSCODE_FAILED');
  } finally {
    await fs.unlink(localOriginal).catch(() => {});
    await fs.unlink(localOutput).catch(() => {});
  }
}
