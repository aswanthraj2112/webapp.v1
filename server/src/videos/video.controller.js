import {
  ensureStorageDirs,
  handleUpload,
  listVideos,
  getVideoByIdForUser,
  getVideoStreamUrl,
  getThumbnailUrl,
  deleteVideo,
  transcodeVideo
} from './video.service.js';
import { AppError } from '../utils/errors.js';

export { ensureStorageDirs };

export const uploadVideo = async (req, res) => {
  const videoId = await handleUpload(req.user.id, req.file);
  res.status(201).json({ videoId });
};

export const listUserVideos = async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
  const rawLimit = Number.parseInt(req.query.limit || '10', 10);
  const limit = Math.min(Math.max(rawLimit || 10, 1), 50);
  const { total, items } = await listVideos(req.user.id, page, limit);
  res.json({ page, limit, total, items });
};

export const getVideo = async (req, res) => {
  const video = await getVideoByIdForUser(req.params.id, req.user.id);
  res.json({ video });
};

export const streamVideo = async (req, res) => {
  const variant = req.query.variant === 'transcoded' ? 'transcoded' : 'original';
  const download = req.query.download === '1' || req.query.download === 'true';
  const video = await getVideoByIdForUser(req.params.id, req.user.id);
  const url = await getVideoStreamUrl(video, variant, download);
  res.redirect(url);
};

export const requestTranscode = async (req, res) => {
  const preset = (req.validatedBody?.preset || '720p').toLowerCase();
  if (preset !== '720p') {
    throw new AppError('Unsupported preset', 400, 'UNSUPPORTED_PRESET');
  }
  const video = await getVideoByIdForUser(req.params.id, req.user.id);
  await transcodeVideo(video, preset);
  res.json({ message: 'Transcode started' });
};

export const serveThumbnail = async (req, res) => {
  const video = await getVideoByIdForUser(req.params.id, req.user.id);
  const url = await getThumbnailUrl(video);
  res.redirect(url);
};

export const removeVideo = async (req, res) => {
  const video = await getVideoByIdForUser(req.params.id, req.user.id);
  await deleteVideo(video);
  res.json({ message: 'Video deleted' });
};
