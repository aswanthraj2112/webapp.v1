import React from 'react';

function VideoList({ videos, onTranscode }) {
  if (!videos.length) {
    return <p>No videos uploaded yet.</p>;
  }

  return (
    <table className="video-list">
      <thead>
        <tr>
          <th>Filename</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {videos.map((video) => (
          <tr key={video.videoId}>
            <td>{video.filename}</td>
            <td>{video.status === 'TRANSCODING' ? 'Processing…' : video.status}</td>
            <td>
              <button
                type="button"
                onClick={() => onTranscode(video.videoId)}
                disabled={video.status === 'TRANSCODING'}
              >
                {video.status === 'COMPLETED' ? 'Retranscode' : 'Transcode'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default VideoList;
